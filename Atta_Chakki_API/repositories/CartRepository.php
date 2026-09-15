<?php
namespace AttaChakki\Repositories;

/**
 * Repository for Cart operations
 */
class CartRepository extends BaseRepository
{
    /**
     * Get all cart items for a user
     */
    public function getCartByUserId(int $userId): array
    {
        return $this->selectAll(
            "SELECT c.*, p.name as product_name, p.price as base_price, p.unit, p.image_url, 
                    p.discount_type, p.discount_value, p.stock_quantity, p.is_rental,
                    p.rental_price_per_day, p.security_deposit
             FROM cart c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?
             ORDER BY c.created_at DESC",
            [$userId]
        );
    }

    /**
     * Add or update an item in the cart
     */
    public function addItem(int $userId, int $productId, float $quantity, ?string $customizations = null, ?string $rentalDays = null): int
    {
        return $this->insert(
            "INSERT INTO cart (user_id, product_id, quantity, customizations, rental_days, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())",
            [$userId, $productId, $quantity, $customizations, $rentalDays]
        );
    }

    /**
     * Update cart item quantity
     */
    public function updateQuantity(int $cartItemId, int $userId, float $quantity): int
    {
        return $this->execute(
            "UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?",
            [$quantity, $cartItemId, $userId]
        );
    }

    /**
     * Remove a single item from cart
     */
    public function removeItem(int $cartItemId, int $userId): int
    {
        return $this->execute(
            "DELETE FROM cart WHERE id = ? AND user_id = ?",
            [$cartItemId, $userId]
        );
    }

    /**
     * Clear entire cart for a user
     */
    public function clearCart(int $userId): int
    {
        return $this->execute(
            "DELETE FROM cart WHERE user_id = ?",
            [$userId]
        );
    }
}
