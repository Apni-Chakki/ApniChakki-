<?php
namespace AttaChakki\Repositories;

// repository for Orders and Order Items operations
class OrderRepository extends BaseRepository
{
    // find order by ID with customer details
    public function findById(int $id): ?array
    {
        return $this->selectOne(
            "SELECT o.*, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email,
                    d.full_name as driver_name, d.phone as driver_phone
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN users d ON o.driver_id = d.id
             WHERE o.id = ?",
            [$id]
        );
    }

    // get all items for an order
    public function getOrderItems(int $orderId): array
    {
        return $this->selectAll(
            "SELECT oi.*, p.name as product_name, p.unit, p.is_rental, p.image_url 
             FROM order_items oi 
             LEFT JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = ?",
            [$orderId]
        );
    }

    // get customer order history
    public function getOrdersByUserId(int $userId, int $limit = 50, int $offset = 0): array
    {
        return $this->selectAll(
            "SELECT o.*, d.full_name as driver_name, d.phone as driver_phone 
             FROM orders o 
             LEFT JOIN users d ON o.driver_id = d.id 
             WHERE o.user_id = ? 
             ORDER BY o.created_at DESC 
             LIMIT ? OFFSET ?",
            [$userId, $limit, $offset]
        );
    }

    // update order status
    public function updateStatus(int $orderId, string $status): int
    {
        return $this->execute(
            "UPDATE orders SET status = ? WHERE id = ?",
            [$status, $orderId]
        );
    }

    // update order payment details
    public function updatePaymentStatus(int $orderId, string $paymentStatus, string $paymentMethod = 'online', ?string $txnId = null, float $amountPaid = 0.0): int
    {
        return $this->execute(
            "UPDATE orders SET payment_status = ?, payment_method = ?, transaction_id = ?, amount_paid = ? WHERE id = ?",
            [$paymentStatus, $paymentMethod, $txnId, $amountPaid, $orderId]
        );
    }

    // assign a driver to an order
    public function assignDriver(int $orderId, int $driverId): int
    {
        return $this->execute(
            "UPDATE orders SET driver_id = ?, status = 'assigned' WHERE id = ?",
            [$driverId, $orderId]
        );
    }

    // cancel an order with reason
    public function cancelOrder(int $orderId, ?string $reason = null): int
    {
        return $this->execute(
            "UPDATE orders SET status = 'cancelled', cancellation_reason = ? WHERE id = ?",
            [$reason, $orderId]
        );
    }
}
