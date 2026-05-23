<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/connect.php';

try {
    // Auto-update overdue rentals: active rentals past their end date become overdue
    $conn->query("UPDATE rentals SET status = 'overdue', updated_at = NOW() WHERE status = 'active' AND rental_end_date < CURDATE()");

    // Fetch active and overdue rentals
    $sql = "SELECT 
                r.*, 
                p.name AS product_name, 
                p.image_url AS product_image,
                u.full_name AS user_name,
                u.email AS user_email,
                DATEDIFF(r.rental_end_date, CURDATE()) AS days_remaining,
                CASE 
                    WHEN r.status = 'overdue' THEN DATEDIFF(CURDATE(), r.rental_end_date) 
                    ELSE 0 
                END AS overdue_days,
                CASE 
                    WHEN r.status = 'overdue' THEN DATEDIFF(CURDATE(), r.rental_end_date) * r.late_penalty_per_day 
                    ELSE 0 
                END AS running_penalty
            FROM rentals r
            JOIN products p ON r.product_id = p.id
            JOIN users u ON r.user_id = u.id
            WHERE r.status IN ('active', 'overdue')
            ORDER BY r.status DESC, r.rental_end_date ASC";

    $result = $conn->query($sql);

    $rentals = [];
    while ($row = $result->fetch_assoc()) {
        $rentals[] = $row;
    }

    // Summary stats
    $summary_sql = "SELECT 
                        COUNT(CASE WHEN status = 'active' THEN 1 END) AS total_active,
                        COUNT(CASE WHEN status = 'overdue' THEN 1 END) AS total_overdue,
                        COALESCE(SUM(security_deposit), 0) AS total_deposits_held
                    FROM rentals 
                    WHERE status IN ('active', 'overdue')";

    $summary_result = $conn->query($summary_sql);
    $summary = $summary_result->fetch_assoc();

    echo json_encode([
        "success" => true,
        "message" => "Active rentals fetched successfully",
        "data" => [
            "rentals" => $rentals,
            "summary" => [
                "total_active" => intval($summary['total_active']),
                "total_overdue" => intval($summary['total_overdue']),
                "total_deposits_held" => floatval($summary['total_deposits_held'])
            ]
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error fetching active rentals: " . $e->getMessage()]);
}
