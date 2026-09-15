<?php
namespace AttaChakki\Repositories;

/**
 * Repository for Product and Service entity operations
 */
class ProductRepository extends BaseRepository
{
    /**
     * Find a product by its primary key ID
     */
    public function findById(int $id): ?array
    {
        return $this->selectOne(
            "SELECT p.*, p.image_url AS image, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?",
            [$id]
        );
    }

    /**
     * Find product info needed for order validation & cart pricing
     */
    public function findForOrderValidation(int $id): ?array
    {
        return $this->selectOne(
            "SELECT id, name, price, discount_type, discount_value, unit, is_grinding_service, 
                    customization_pricing_mode, cleaning_price, grinding_price, is_rental, 
                    rental_price_per_day, security_deposit, late_penalty_per_day, stock_quantity, 
                    rental_available_qty, is_active 
             FROM products WHERE id = ?",
            [$id]
        );
    }

    /**
     * Get all active products with category information
     */
    public function getActiveProducts(?int $categoryId = null): array
    {
        if ($categoryId !== null) {
            return $this->selectAll(
                "SELECT p.*, p.image_url AS image, c.name as category_name 
                 FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.id 
                 WHERE p.is_active = 1 AND p.category_id = ? 
                 ORDER BY p.priority DESC, p.created_at DESC",
                [$categoryId]
            );
        }

        return $this->selectAll(
            "SELECT p.*, p.image_url AS image, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.is_active = 1 
             ORDER BY p.priority DESC, p.created_at DESC"
        );
    }

    /**
     * Get all products (active & inactive) for admin management
     */
    public function getAllProductsForAdmin(): array
    {
        return $this->selectAll(
            "SELECT p.*, p.image_url AS image, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             ORDER BY p.priority DESC, p.created_at DESC"
        );
    }

    /**
     * Get all active rental items
     */
    public function getActiveRentals(): array
    {
        return $this->selectAll(
            "SELECT id, name, description, image_url, rental_price_per_day, security_deposit, 
                    late_penalty_per_day, rental_available_qty, is_active 
             FROM products 
             WHERE is_rental = 1 AND is_active = 1 
             ORDER BY name ASC"
        );
    }

    /**
     * Update stock quantity (deduct or add)
     */
    public function adjustStock(int $id, float $qtyDelta): int
    {
        return $this->execute(
            "UPDATE products SET stock_quantity = GREATEST(0, stock_quantity + ?) WHERE id = ?",
            [$qtyDelta, $id]
        );
    }

    /**
     * Update rental available quantity
     */
    public function adjustRentalStock(int $id, int $qtyDelta): int
    {
        return $this->execute(
            "UPDATE products SET rental_available_qty = GREATEST(0, rental_available_qty + ?) WHERE id = ? AND is_rental = 1",
            [$qtyDelta, $id]
        );
    }

    /**
     * Update product active status
     */
    public function updateStatus(int $id, int $isActive): int
    {
        return $this->execute(
            "UPDATE products SET is_active = ? WHERE id = ?",
            [$isActive, $id]
        );
    }
}
