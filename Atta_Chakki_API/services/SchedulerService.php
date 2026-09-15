<?php
namespace AttaChakki\Services;

use DateTime;

/**
 * Service for calculating order queue processing, weight calculation,
 * today vs tomorrow scheduling, and daily capacity limits.
 */
class SchedulerService {

    /**
     * Set default timezone to Asia/Karachi
     */
    public static function initTimezone() {
        if (date_default_timezone_get() === 'UTC') {
            date_default_timezone_set('Asia/Karachi');
        }
    }

    /**
     * Retrieve operational hours and configuration from store_settings
     */
    public static function getOperationalHours($conn) {
        $opening = '09:00';
        $closing = '20:00';
        $processing_time_per_kg = 2;    // Default 2 mins per kg
        $buffer_time_minutes = 60;      // Default 1 hour buffer before closing
        $max_daily_orders = 50;         // Default max 50 orders per day

        $sql = "SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('openingTime', 'closingTime', 'processingTimePerKg', 'bufferTimeMinutes', 'maxDailyOrders')";
        $result = $conn->query($sql);

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                if ($row['setting_key'] === 'openingTime') {
                    $opening = $row['setting_value'];
                }
                if ($row['setting_key'] === 'closingTime') {
                    $closing = $row['setting_value'];
                }
                if ($row['setting_key'] === 'processingTimePerKg') {
                    $processing_time_per_kg = floatval($row['setting_value']);
                }
                if ($row['setting_key'] === 'bufferTimeMinutes') {
                    $buffer_time_minutes = intval($row['setting_value']);
                }
                if ($row['setting_key'] === 'maxDailyOrders') {
                    $max_daily_orders = intval($row['setting_value']);
                }
            }
        }

        if ($processing_time_per_kg <= 0) $processing_time_per_kg = 2;
        if ($buffer_time_minutes < 0) $buffer_time_minutes = 60;
        if ($max_daily_orders <= 0) $max_daily_orders = 50;

        return [
            'opening' => $opening,
            'closing' => $closing,
            'processing_time_per_kg' => $processing_time_per_kg,
            'buffer_time_minutes' => $buffer_time_minutes,
            'max_daily_orders' => $max_daily_orders
        ];
    }

    /**
     * Calculate total grinding / processing weight for an order
     */
    public static function calculateOrderWeight($conn, $order_id) {
        $total_weight = 0;

        $sql = "SELECT oi.quantity, oi.price_at_purchase, p.unit, p.is_rental FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $order_id);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $is_rental = isset($row['is_rental']) ? (int)$row['is_rental'] : 0;
            if ($is_rental === 1) {
                continue;
            }
            $unit = strtolower(trim($row['unit']));
            $qty = floatval($row['quantity']);

            if ($unit === 'kg') {
                $total_weight += $qty;
            } else if ($unit === 'g') {
                $total_weight += ($qty / 1000);
            } else if ($unit === 'trip' && floatval($row['price_at_purchase']) > 0) {
                $total_weight += $qty;
            }
        }
        $stmt->close();

        return $total_weight;
    }

    /**
     * Get estimated completion time of last scheduled grinding order on a given date
     */
    public static function getLastCompletionTime($conn, $date) {
        $sql = "SELECT estimated_completion_time FROM orders 
                WHERE assigned_date = ? 
                AND status NOT IN ('cancelled', 'completed', 'ready', 'out-for-delivery')
                AND total_weight_kg > 0
                ORDER BY estimated_completion_time DESC 
                LIMIT 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            $stmt->close();
            return $row['estimated_completion_time'];
        }
        $stmt->close();
        return null;
    }

    /**
     * Get next queue position for a given date
     */
    public static function getNextQueuePosition($conn, $date) {
        $sql = "SELECT MAX(queue_position) as max_pos FROM orders 
                WHERE assigned_date = ? 
                AND status NOT IN ('cancelled', 'completed')
                AND total_weight_kg > 0";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            $stmt->close();
            return intval($row['max_pos']) + 1;
        }
        $stmt->close();
        return 1;
    }

    /**
     * Get count of active grinding orders for a given date
     */
    public static function getActiveOrderCount($conn, $date) {
        $sql = "SELECT COUNT(*) as order_count FROM orders 
                WHERE assigned_date = ? 
                AND status NOT IN ('cancelled', 'completed')
                AND total_weight_kg > 0";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        return intval($row['order_count']);
    }

    /**
     * Check if shop can take orders today or push to tomorrow
     */
    public static function getScheduleAvailability($conn, $estimated_weight_kg = 1) {
        self::initTimezone();
        $hours = self::getOperationalHours($conn);
        $opening_time = $hours['opening'];
        $closing_time = $hours['closing'];
        $processing_speed = $hours['processing_time_per_kg'];
        $buffer_minutes = $hours['buffer_time_minutes'];
        $max_orders = $hours['max_daily_orders'];

        $today = date('Y-m-d');
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $now = new DateTime();

        $closing_dt = new DateTime($today . ' ' . $closing_time . ':00');
        $cutoff_dt = clone $closing_dt;
        $cutoff_dt->modify("-{$buffer_minutes} minutes");

        $time_blocked = ($now >= $cutoff_dt);
        $today_count = self::getActiveOrderCount($conn, $today);
        $load_blocked = ($today_count >= $max_orders);

        $processing_minutes = ceil($estimated_weight_kg * $processing_speed);
        $last_completion = self::getLastCompletionTime($conn, $today);

        if ($last_completion) {
            $last_dt = new DateTime($last_completion);
            $start_time = ($now > $last_dt) ? clone $now : $last_dt;
        } else {
            $opening_dt = new DateTime($today . ' ' . $opening_time . ':00');
            $start_time = ($now > $opening_dt) ? clone $now : $opening_dt;
        }

        $eta = clone $start_time;
        $eta->modify("+{$processing_minutes} minutes");
        $capacity_blocked = ($eta > $closing_dt);

        $push_to_tomorrow = false;
        $reason = '';
        $reason_code = 'today';

        if ($time_blocked) {
            $push_to_tomorrow = true;
            $reason = "Shop closing time is near (buffer: {$buffer_minutes} min before " . $closing_dt->format('h:i A') . "). Order scheduled for tomorrow.";
            $reason_code = 'time_cutoff';
        } else if ($load_blocked) {
            $push_to_tomorrow = true;
            $reason = "Today's slots are full ({$today_count}/{$max_orders} orders). Order scheduled for tomorrow.";
            $reason_code = 'capacity_full';
        } else if ($capacity_blocked) {
            $push_to_tomorrow = true;
            $reason = "Not enough processing time left today. Order scheduled for tomorrow.";
            $reason_code = 'no_time_left';
        } else {
            $reason = "Order will be processed today.";
            $reason_code = 'today';
        }

        if ($push_to_tomorrow) {
            $tomorrow_last = self::getLastCompletionTime($conn, $tomorrow);
            if ($tomorrow_last) {
                $tomorrow_start = new DateTime($tomorrow_last);
            } else {
                $tomorrow_start = new DateTime($tomorrow . ' ' . $opening_time . ':00');
            }
            $tomorrow_eta = clone $tomorrow_start;
            $tomorrow_eta->modify("+{$processing_minutes} minutes");

            $tomorrow_count = self::getActiveOrderCount($conn, $tomorrow);

            return [
                'assigned_date' => $tomorrow,
                'is_today' => false,
                'reason' => $reason,
                'reason_code' => $reason_code,
                'estimated_completion' => $tomorrow_eta->format('Y-m-d H:i:s'),
                'estimated_completion_display' => $tomorrow_eta->format('h:i A'),
                'today_order_count' => $today_count,
                'tomorrow_order_count' => $tomorrow_count,
                'max_daily_orders' => $max_orders,
                'closing_time' => $closing_time,
                'buffer_minutes' => $buffer_minutes,
                'cutoff_time' => $cutoff_dt->format('H:i'),
                'cutoff_time_display' => $cutoff_dt->format('h:i A'),
                'server_time' => $now->format('Y-m-d H:i:s'),
                'server_time_display' => $now->format('h:i A'),
                'server_timezone' => date_default_timezone_get()
            ];
        }

        return [
            'assigned_date' => $today,
            'is_today' => true,
            'reason' => $reason,
            'reason_code' => $reason_code,
            'estimated_completion' => $eta->format('Y-m-d H:i:s'),
            'estimated_completion_display' => $eta->format('h:i A'),
            'today_order_count' => $today_count,
            'tomorrow_order_count' => 0,
            'max_daily_orders' => $max_orders,
            'closing_time' => $closing_time,
            'buffer_minutes' => $buffer_minutes,
            'cutoff_time' => $cutoff_dt->format('H:i'),
            'cutoff_time_display' => $cutoff_dt->format('h:i A'),
            'server_time' => $now->format('Y-m-d H:i:s'),
            'server_time_display' => $now->format('h:i A'),
            'server_timezone' => date_default_timezone_get()
        ];
    }

    /**
     * Schedule a specific order into the queue
     */
    public static function scheduleOrder($conn, $order_id) {
        self::initTimezone();
        $hours = self::getOperationalHours($conn);
        $opening_time = $hours['opening'];
        $closing_time = $hours['closing'];
        $processing_speed = $hours['processing_time_per_kg'];
        $buffer_minutes = $hours['buffer_time_minutes'];
        $max_orders = $hours['max_daily_orders'];

        $total_weight = self::calculateOrderWeight($conn, $order_id);
        $processing_minutes = ceil($total_weight * $processing_speed);

        $today = date('Y-m-d');
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $now = new DateTime();

        $closing_dt = new DateTime($today . ' ' . $closing_time . ':00');
        $cutoff_dt = clone $closing_dt;
        $cutoff_dt->modify("-{$buffer_minutes} minutes");

        $time_blocked = ($now >= $cutoff_dt);

        if ($total_weight == 0) {
            $assigned_date = $today;
            $estimated_completion = $now->format('Y-m-d H:i:s');
            $status = 'pending';
            $schedule_reason = 'prepared_order';
            $queue_position = 0;

            $sql = "UPDATE orders SET 
                estimated_completion_time = ?,
                assigned_date = ?,
                total_weight_kg = ?,
                processing_time_minutes = ?,
                queue_position = ?,
                status = ?
                WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ssdissi", 
                $estimated_completion, 
                $assigned_date, 
                $total_weight, 
                $processing_minutes, 
                $queue_position,
                $status,
                $order_id
            );
            $stmt->execute();
            $stmt->close();

            return [
                'order_id' => $order_id,
                'assigned_date' => $assigned_date,
                'is_today' => ($assigned_date === $today),
                'estimated_completion_time' => $estimated_completion,
                'total_weight_kg' => 0,
                'processing_time_minutes' => 0,
                'queue_position' => 0,
                'status' => $status,
                'schedule_reason' => $schedule_reason
            ];
        }

        $today_count = self::getActiveOrderCount($conn, $today);
        $load_blocked = ($today_count >= $max_orders);
        $force_tomorrow = ($time_blocked || $load_blocked);

        if (!$force_tomorrow) {
            $last_completion = self::getLastCompletionTime($conn, $today);

            if ($last_completion) {
                $last_dt = new DateTime($last_completion);
                $start_time = ($now > $last_dt) ? clone $now : $last_dt;
            } else {
                $opening_dt = new DateTime($today . ' ' . $opening_time . ':00');
                $start_time = ($now > $opening_dt) ? clone $now : $opening_dt;
            }

            $eta = clone $start_time;
            $eta->modify("+{$processing_minutes} minutes");

            if ($eta <= $closing_dt) {
                $assigned_date = $today;
                $estimated_completion = $eta->format('Y-m-d H:i:s');
                $status = 'pending';
                $schedule_reason = 'today';
            } else {
                $force_tomorrow = true;
            }
        }

        if ($force_tomorrow) {
            $assigned_date = $tomorrow;
            $tomorrow_last = self::getLastCompletionTime($conn, $tomorrow);

            if ($tomorrow_last) {
                $tomorrow_start = new DateTime($tomorrow_last);
            } else {
                $tomorrow_start = new DateTime($tomorrow . ' ' . $opening_time . ':00');
            }

            $tomorrow_eta = clone $tomorrow_start;
            $tomorrow_eta->modify("+{$processing_minutes} minutes");
            $estimated_completion = $tomorrow_eta->format('Y-m-d H:i:s');
            $status = 'pending';

            if ($time_blocked) {
                $schedule_reason = 'time_cutoff';
            } else if ($load_blocked) {
                $schedule_reason = 'capacity_full';
            } else {
                $schedule_reason = 'no_time_left';
            }
        }

        $queue_position = self::getNextQueuePosition($conn, $assigned_date);

        $sql = "UPDATE orders SET 
                estimated_completion_time = ?,
                assigned_date = ?,
                total_weight_kg = ?,
                processing_time_minutes = ?,
                queue_position = ?,
                status = ?
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssdissi", 
            $estimated_completion, 
            $assigned_date, 
            $total_weight, 
            $processing_minutes, 
            $queue_position,
            $status,
            $order_id
        );
        $stmt->execute();
        $stmt->close();

        return [
            'order_id' => $order_id,
            'assigned_date' => $assigned_date,
            'is_today' => ($assigned_date === $today),
            'estimated_completion_time' => $estimated_completion,
            'total_weight_kg' => $total_weight,
            'processing_time_minutes' => $processing_minutes,
            'queue_position' => $queue_position,
            'status' => $status,
            'schedule_reason' => $schedule_reason
        ];
    }

    /**
     * Recalculate schedule ETAs for a date
     */
    public static function recalculateSchedule($conn, $date) {
        self::initTimezone();
        $hours = self::getOperationalHours($conn);
        $opening_time = $hours['opening'];
        $processing_speed = $hours['processing_time_per_kg'];

        $sql = "SELECT id, total_weight_kg, processing_time_minutes FROM orders 
                WHERE assigned_date = ? 
                AND status NOT IN ('cancelled', 'completed', 'ready', 'out-for-delivery')
                AND total_weight_kg > 0
                ORDER BY queue_position ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result();

        $orders = [];
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }
        $stmt->close();

        $now = new DateTime();
        $opening_dt = new DateTime($date . ' ' . $opening_time . ':00');
        $current_time = ($date === date('Y-m-d') && $now > $opening_dt) ? $now : $opening_dt;

        $position = 1;
        foreach ($orders as $order) {
            $processing_mins = intval($order['processing_time_minutes']);
            if ($processing_mins <= 0) {
                $processing_mins = ceil(floatval($order['total_weight_kg']) * $processing_speed);
            }

            $eta = clone $current_time;
            $eta->modify("+{$processing_mins} minutes");
            $eta_str = $eta->format('Y-m-d H:i:s');

            $update = $conn->prepare("UPDATE orders SET estimated_completion_time = ?, queue_position = ? WHERE id = ?");
            $update->bind_param("sii", $eta_str, $position, $order['id']);
            $update->execute();
            $update->close();

            $current_time = clone $eta;
            $position++;
        }

        return count($orders);
    }

    /**
     * Get shop processing capacity info for a date
     */
    public static function getCapacityInfo($conn, $date) {
        self::initTimezone();
        $hours = self::getOperationalHours($conn);

        $open = new DateTime($date . ' ' . $hours['opening'] . ':00');
        $close = new DateTime($date . ' ' . $hours['closing'] . ':00');
        $total_minutes = ($close->getTimestamp() - $open->getTimestamp()) / 60;

        $sql = "SELECT COALESCE(SUM(processing_time_minutes), 0) as booked 
                FROM orders 
                WHERE assigned_date = ? 
                AND status NOT IN ('cancelled', 'completed', 'ready', 'out-for-delivery')
                AND total_weight_kg > 0";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $booked_minutes = intval($row['booked']);
        $stmt->close();

        $order_count = self::getActiveOrderCount($conn, $date);
        $max_orders = $hours['max_daily_orders'];

        $now = new DateTime();
        $today = date('Y-m-d');

        if ($date === $today) {
            $minutes_until_closing = max(0, ($close->getTimestamp() - $now->getTimestamp()) / 60);
            $effective_minutes = $minutes_until_closing;
            $remaining_minutes = max(0, $minutes_until_closing - $booked_minutes);

            $percentage_used = $total_minutes > 0 
                ? round((($total_minutes - $minutes_until_closing + $booked_minutes) / $total_minutes) * 100, 1) 
                : 0;
        } else {
            $effective_minutes = $total_minutes;
            $remaining_minutes = max(0, $total_minutes - $booked_minutes);
            $percentage_used = $total_minutes > 0 ? round(($booked_minutes / $total_minutes) * 100, 1) : 0;
        }

        return [
            'date' => $date,
            'opening_time' => $hours['opening'],
            'closing_time' => $hours['closing'],
            'total_minutes' => $total_minutes,
            'booked_minutes' => $booked_minutes,
            'effective_minutes' => round($effective_minutes, 0),
            'remaining_minutes' => round($remaining_minutes, 0),
            'percentage_used' => min($percentage_used, 100),
            'can_accept_more' => ($remaining_minutes > 0 && $order_count < $max_orders),
            'order_count' => $order_count,
            'max_daily_orders' => $max_orders,
            'buffer_time_minutes' => $hours['buffer_time_minutes'],
            'current_time' => $now->format('h:i A')
        ];
    }
}
