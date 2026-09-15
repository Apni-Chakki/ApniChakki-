<?php
namespace AttaChakki\Services;

use mysqli;
use Exception;
use DateTime;

class OrderService
{
    /**
     * Validates cart items against DB products, checks stock, and calculates base/discounted prices.
     */
    public static function validateAndCalculateCartItems(mysqli $conn, array $cart_items): array
    {
        $valid_items = [];
        $has_trip_item = false;
        $has_pending_weight_item = false;
        $non_trip_total = 0.0;

        foreach ($cart_items as $item) {
            $pid = is_object($item) ? (int)($item->id ?? 0) : (int)($item['id'] ?? 0);
            $query = $conn->prepare("SELECT name, price, discount_type, discount_value, unit, is_grinding_service, customization_pricing_mode, cleaning_price, grinding_price, is_rental, rental_price_per_day, security_deposit, late_penalty_per_day, stock_quantity, rental_available_qty FROM products WHERE id = ?");
            $query->bind_param("i", $pid);
            $query->execute();
            $res = $query->get_result();

            if ($row = $res->fetch_assoc()) {
                $unit = isset($row['unit']) ? strtolower(trim($row['unit'])) : '';
                $qty = is_object($item) ? floatval($item->qty ?? 1) : floatval($item['qty'] ?? ($item['quantity'] ?? 1));
                $is_grinding_service = (int)$row['is_grinding_service'];
                $is_cleaning = is_object($item) ? (int)($item->is_cleaning ?? 0) : (int)($item['is_cleaning'] ?? 0);
                $is_grinding = is_object($item) ? (int)($item->is_grinding ?? 0) : (int)($item['is_grinding'] ?? 0);
                $item_is_pending = is_object($item) ? (int)($item->is_weight_pending ?? 0) : (int)($item['is_weight_pending'] ?? 0);

                $selected_customizations = is_object($item) ? ($item->selected_customizations ?? []) : ($item['selected_customizations'] ?? []);

                if ($item_is_pending) $has_pending_weight_item = true;

                $is_rental_val = isset($row['is_rental']) ? (int)$row['is_rental'] : 0;

                // Check stock
                if ($unit !== 'trip' && !$item_is_pending) {
                    if ($is_rental_val === 1) {
                        if (isset($row['rental_available_qty']) && $row['rental_available_qty'] !== null && floatval($row['rental_available_qty']) < $qty) {
                            $query->close();
                            return [
                                "success" => false,
                                "message" => "Item '" . ($row['name'] ?? 'Product') . "' is out of rental stock."
                            ];
                        }
                    } else {
                        if (isset($row['stock_quantity']) && $row['stock_quantity'] !== null && floatval($row['stock_quantity']) < $qty) {
                            $query->close();
                            return [
                                "success" => false,
                                "message" => "Item '" . ($row['name'] ?? 'Product') . "' is out of stock or requested quantity exceeds available stock (" . floatval($row['stock_quantity']) . ")."
                            ];
                        }
                    }
                }

                if (!empty($selected_customizations)) {
                    $pricing_mode = $row['customization_pricing_mode'] ?? 'additive';
                    $base_price = 0;
                    $opt_count = 0;
                    foreach ($selected_customizations as $sc) {
                        $opt_p = is_object($sc) ? floatval($sc->option_price ?? 0) : floatval($sc['option_price'] ?? 0);
                        $base_price += $opt_p;
                        if ($opt_p > 0) $opt_count++;
                    }
                    if ($pricing_mode === 'average' && $opt_count > 0) {
                        $base_price = round($base_price / $opt_count, 2);
                    }
                    if ($base_price <= 0) $base_price = floatval($row['price']);
                } elseif ($is_grinding_service) {
                    $base_price = 0;
                    if ($is_cleaning) $base_price += floatval($row['cleaning_price']);
                    if ($is_grinding) $base_price += floatval($row['grinding_price']);
                    if ($base_price <= 0 && !$is_cleaning && !$is_grinding) $base_price = floatval($row['price']);
                } else {
                    $base_price = floatval($row['price']);
                }

                // Apply product discount
                $discount_type = $row['discount_type'] ?? 'none';
                $discount_value = floatval($row['discount_value'] ?? 0);

                $price = $base_price;
                if ($discount_type === 'percentage') {
                    $price = $base_price - ($base_price * ($discount_value / 100));
                } elseif ($discount_type === 'fixed') {
                    $price = max(0, $base_price - $discount_value);
                }

                $rental_days_val = $is_rental_val ? (is_object($item) ? (int)($item->rental_days ?? 0) : (int)($item['rental_days'] ?? 0)) : null;
                $rental_start_date_val = $is_rental_val ? (is_object($item) ? ($item->rental_start_date ?? null) : ($item['rental_start_date'] ?? null)) : null;
                $rental_price_per_day_val = $is_rental_val ? (isset($row['rental_price_per_day']) ? floatval($row['rental_price_per_day']) : 0.0) : null;
                $security_deposit_val = $is_rental_val ? (isset($row['security_deposit']) ? floatval($row['security_deposit']) : 0.0) : null;
                $late_penalty_per_day_val = $is_rental_val ? (isset($row['late_penalty_per_day']) ? floatval($row['late_penalty_per_day']) : 0.0) : null;

                $formatted_item = [
                    "product_id" => $pid,
                    "quantity" => $qty,
                    "price" => $price,
                    "original_price" => $base_price,
                    "unit" => $unit,
                    "is_cleaning" => $is_cleaning,
                    "is_grinding" => $is_grinding,
                    "is_weight_pending" => $item_is_pending,
                    "selected_customizations" => $selected_customizations,
                    "is_rental" => $is_rental_val,
                    "rental_days" => $rental_days_val,
                    "rental_start_date" => $rental_start_date_val,
                    "rental_price_per_day" => $rental_price_per_day_val,
                    "security_deposit" => $security_deposit_val,
                    "late_penalty_per_day" => $late_penalty_per_day_val
                ];

                if ($unit === 'trip') {
                    $has_trip_item = true;
                    $has_pending_weight_item = true;
                    $formatted_item['is_weight_pending'] = 1;
                } else {
                    if (!$item_is_pending) {
                        $non_trip_total += ($price * $qty);
                    }
                }

                $valid_items[] = $formatted_item;
            }
            $query->close();
        }

        return [
            "success" => true,
            "valid_items" => $valid_items,
            "has_trip_item" => $has_trip_item,
            "has_pending_weight_item" => $has_pending_weight_item,
            "non_trip_total" => $non_trip_total
        ];
    }

    /**
     * Validates coupon code and calculates discount amount.
     */
    public static function validateCoupon(mysqli $conn, ?string $coupon_code, float $total_amount): array
    {
        $coupon_discount = 0.0;
        $coupon_id = null;

        if (!$coupon_code || $total_amount <= 0) {
            return ["coupon_id" => null, "coupon_discount" => 0.0];
        }

        $coupon_stmt = $conn->prepare("SELECT id, discount_type, discount_value, min_order_amount, usage_limit, used_count, expiry_date, is_active FROM coupons WHERE code = ?");
        $coupon_stmt->bind_param("s", $coupon_code);
        $coupon_stmt->execute();
        $coupon_res = $coupon_stmt->get_result();

        if ($coupon_res->num_rows > 0) {
            $coupon = $coupon_res->fetch_assoc();
            $coupon_stmt->close();

            $valid = true;
            if (!$coupon['is_active']) {
                $valid = false;
            } elseif ($coupon['expiry_date'] && new DateTime($coupon['expiry_date']) < new DateTime()) {
                $valid = false;
            } elseif ($coupon['usage_limit'] && $coupon['used_count'] >= $coupon['usage_limit']) {
                $valid = false;
            } elseif ($coupon['min_order_amount'] > 0 && $total_amount < $coupon['min_order_amount']) {
                $valid = false;
            }

            if ($valid) {
                $coupon_id = (int)$coupon['id'];
                $discount_value = floatval($coupon['discount_value']);
                if ($coupon['discount_type'] === 'percentage') {
                    $coupon_discount = $total_amount * ($discount_value / 100);
                } else {
                    $coupon_discount = $discount_value;
                }
                $coupon_discount = min($coupon_discount, $total_amount);
            }
        } else {
            $coupon_stmt->close();
        }

        return [
            "coupon_id" => $coupon_id,
            "coupon_discount" => $coupon_discount
        ];
    }

    /**
     * Inserts order items, customizations, and active rentals into database.
     */
    public static function saveOrderItemsAndRentals(
        mysqli $conn,
        int $order_id,
        array $valid_items,
        int $user_id,
        string $customer_name,
        string $customer_phone,
        string $address,
        string $db_payment_method,
        string $final_payment_status
    ): void {
        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, original_price, is_cleaning, is_grinding, is_weight_pending, is_rental, rental_days, rental_start_date, rental_price_per_day, security_deposit, late_penalty_per_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $inv_stmt = $conn->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?");
        $cust_stmt = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, ?, ?)");

        foreach ($valid_items as $v_item) {
            $item_stmt->bind_param(
                "iiddiiiiiisddd",
                $order_id,
                $v_item['product_id'],
                $v_item['quantity'],
                $v_item['price'],
                $v_item['original_price'],
                $v_item['is_cleaning'],
                $v_item['is_grinding'],
                $v_item['is_weight_pending'],
                $v_item['is_rental'],
                $v_item['rental_days'],
                $v_item['rental_start_date'],
                $v_item['rental_price_per_day'],
                $v_item['security_deposit'],
                $v_item['late_penalty_per_day']
            );

            if (!$item_stmt->execute()) {
                throw new Exception("Failed to add item to order: " . $item_stmt->error);
            }
            $order_item_id = $conn->insert_id;

            // Save customizations
            if (!empty($v_item['selected_customizations'])) {
                foreach ($v_item['selected_customizations'] as $sc) {
                    $opt_name = is_object($sc) ? ($sc->option_name ?? '') : ($sc['option_name'] ?? '');
                    $opt_price = is_object($sc) ? floatval($sc->option_price ?? 0) : floatval($sc['option_price'] ?? 0);
                    $cust_stmt->bind_param("isd", $order_item_id, $opt_name, $opt_price);
                    $cust_stmt->execute();
                }
            }

            // Decrement physical stock
            if (strtolower(trim($v_item['unit'])) !== 'trip') {
                if ($v_item['is_rental'] === 1) {
                    $rent_inv_stmt = $conn->prepare("UPDATE products SET rental_available_qty = GREATEST(0, rental_available_qty - ?) WHERE id = ?");
                    $rent_inv_stmt->bind_param("di", $v_item['quantity'], $v_item['product_id']);
                    if (!$rent_inv_stmt->execute()) {
                        throw new Exception("Failed to update product rental stock: " . $rent_inv_stmt->error);
                    }
                    $rent_inv_stmt->close();
                } else {
                    $inv_stmt->bind_param("di", $v_item['quantity'], $v_item['product_id']);
                    if (!$inv_stmt->execute()) {
                        throw new Exception("Failed to update product stock: " . $inv_stmt->error);
                    }
                }
            }

            // Record rental if applicable
            if ($v_item['is_rental'] === 1) {
                $rental_days = intval($v_item['rental_days']);
                if ($rental_days <= 0) $rental_days = 1;
                $rental_start_date = !empty($v_item['rental_start_date']) ? $v_item['rental_start_date'] : date('Y-m-d');
                $rental_end_date = date('Y-m-d', strtotime($rental_start_date . " + $rental_days days"));

                $total_rental_amount = $rental_days * floatval($v_item['rental_price_per_day']) * intval($v_item['quantity']);
                $total_cost = $total_rental_amount + (floatval($v_item['security_deposit']) * intval($v_item['quantity']));
                $rental_amount_paid = ($final_payment_status === 'paid') ? $total_cost : 0.0;

                $insert_rent_stmt = $conn->prepare("INSERT INTO rentals (
                    order_id, product_id, user_id, customer_name, customer_phone, customer_address, 
                    quantity, rental_start_date, rental_end_date, rental_days, rental_price_per_day, 
                    total_rental_amount, security_deposit, deposit_status, late_penalty_per_day, 
                    payment_method, amount_paid, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, ?, ?, 'active', NOW(), NOW())");

                $insert_rent_stmt->bind_param(
                    "iiisssissidddssd",
                    $order_id,
                    $v_item['product_id'],
                    $user_id,
                    $customer_name,
                    $customer_phone,
                    $address,
                    $v_item['quantity'],
                    $rental_start_date,
                    $rental_end_date,
                    $rental_days,
                    $v_item['rental_price_per_day'],
                    $total_rental_amount,
                    $v_item['security_deposit'],
                    $v_item['late_penalty_per_day'],
                    $db_payment_method,
                    $rental_amount_paid
                );

                if (!$insert_rent_stmt->execute()) {
                    throw new Exception("Failed to create active rental: " . $insert_rent_stmt->error);
                }
                $insert_rent_stmt->close();
            }
        }

        $item_stmt->close();
        $inv_stmt->close();
        $cust_stmt->close();
    }

    /**
     * Records order initial payment and coupon usage.
     */
    public static function recordPaymentAndCoupon(
        mysqli $conn,
        int $order_id,
        int $user_id,
        float $amount_paid,
        string $payment_method,
        ?string $transaction_id,
        ?int $coupon_id,
        float $coupon_discount
    ): void {
        if ($amount_paid > 0) {
            $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, transaction_id, created_at) VALUES (?, ?, ?, ?, NOW())");
            $pay_stmt->bind_param("idss", $order_id, $amount_paid, $payment_method, $transaction_id);
            $pay_stmt->execute();
            $pay_stmt->close();
        }

        if ($coupon_id && $coupon_discount > 0) {
            $usage_stmt = $conn->prepare("INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)");
            $usage_stmt->bind_param("iiid", $coupon_id, $user_id, $order_id, $coupon_discount);
            $usage_stmt->execute();
            $usage_stmt->close();

            $update_coupon_stmt = $conn->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?");
            $update_coupon_stmt->bind_param("i", $coupon_id);
            $update_coupon_stmt->execute();
            $update_coupon_stmt->close();
        }
    }
}
