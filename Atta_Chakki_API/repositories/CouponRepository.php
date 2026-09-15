<?php
namespace AttaChakki\Repositories;

/**
 * Repository for Coupons and discount validation operations
 */
class CouponRepository extends BaseRepository
{
    /**
     * Find coupon by promo code
     */
    public function findByCode(string $code): ?array
    {
        return $this->selectOne(
            "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) LIMIT 1",
            [$code]
        );
    }

    /**
     * Get all active coupons
     */
    public function getActiveCoupons(): array
    {
        return $this->selectAll(
            "SELECT * FROM coupons 
             WHERE is_active = 1 
               AND (expiry_date IS NULL OR expiry_date >= NOW()) 
               AND (usage_limit IS NULL OR used_count < usage_limit)
             ORDER BY id DESC"
        );
    }

    /**
     * Get featured coupons for promo banners
     */
    public function getFeaturedCoupons(): array
    {
        return $this->selectAll(
            "SELECT * FROM coupons 
             WHERE is_active = 1 
               AND (expiry_date IS NULL OR expiry_date >= NOW()) 
             ORDER BY discount_value DESC LIMIT 5"
        );
    }

    /**
     * Increment coupon usage count
     */
    public function incrementUsage(int $couponId): int
    {
        return $this->execute(
            "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
            [$couponId]
        );
    }

    /**
     * Check how many times a user has used a specific coupon
     */
    public function getUserUsageCount(int $couponId, int $userId): int
    {
        return (int)$this->selectScalar(
            "SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = ? AND user_id = ?",
            [$couponId, $userId]
        );
    }

    /**
     * Record a user coupon usage entry
     */
    public function recordUserUsage(int $couponId, int $userId, int $orderId, float $discountAmount): int
    {
        return $this->insert(
            "INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount, used_at) 
             VALUES (?, ?, ?, ?, NOW())",
            [$couponId, $userId, $orderId, $discountAmount]
        );
    }
}
