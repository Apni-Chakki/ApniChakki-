<?php
// get inventory api - Server-Side Pagination + Search + Category Filter + Aggregate Stats
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

try {
    $returnAll = isset($_GET['all']) && $_GET['all'] == '1';
    $page      = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit     = max(1, min(500, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset    = ($page - 1) * $limit;
    $search    = isset($_GET['search']) ? trim($_GET['search']) : '';
    $category  = isset($_GET['category']) && $_GET['category'] !== 'all' ? trim($_GET['category']) : '';
    $lowStock  = isset($_GET['low_stock']) && $_GET['low_stock'] === 'true';

    $where  = ["LOWER(TRIM(p.unit)) != 'trip'"];
    $params = [];
    $types  = '';

    if ($lowStock) {
        $where[] = "p.stock_quantity < p.min_stock_level";
    }
    if ($category !== '') {
        $where[] = "c.name = ?";
        $params[] = $category;
        $types   .= 's';
    }
    if ($search !== '') {
        $where[] = "(p.name LIKE ? OR c.name LIKE ?)";
        $like = "%{$search}%";
        $params[] = $like; $params[] = $like;
        $types   .= 'ss';
    }
    $whereSql = 'WHERE ' . implode(' AND ', $where);

    // Aggregate stats across ALL non-trip products (unaffected by filters)
    $statsSql = "SELECT
                    COUNT(*) AS total_products,
                    SUM(CASE WHEN p.stock_quantity <= p.min_stock_level THEN 1 ELSE 0 END) AS low_stock_count,
                    SUM(CASE WHEN p.stock_quantity >  p.min_stock_level THEN 1 ELSE 0 END) AS well_stocked_count
                 FROM products p
                 WHERE LOWER(TRIM(p.unit)) != 'trip'";
    $statsRow = $conn->query($statsSql)->fetch_assoc();

    // Distinct categories (for the filter dropdown)
    $catRes = $conn->query("SELECT DISTINCT c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE LOWER(TRIM(p.unit)) != 'trip' AND c.name IS NOT NULL ORDER BY c.name ASC");
    $categories = [];
    while ($c = $catRes->fetch_assoc()) { $categories[] = $c['name']; }

    // Filtered count for pagination
    $countSql = "SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON p.category_id = c.id {$whereSql}";
    $stmt = $conn->prepare($countSql);
    if ($types !== '') { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $totalFiltered = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();

    // Paginated fetch (or full for print/export)
    $sql = "SELECT
                p.id, p.name, p.category_id, c.name AS category_name,
                p.price, p.unit, p.stock_quantity, p.min_stock_level, p.max_stock_level, p.updated_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            {$whereSql}
            ORDER BY p.stock_quantity ASC";

    $pageParams = $params;
    $pageTypes  = $types;
    if (!$returnAll) {
        $sql .= " LIMIT ? OFFSET ?";
        $pageParams[] = $limit;
        $pageParams[] = $offset;
        $pageTypes   .= 'ii';
    } else {
        $sql .= " LIMIT 5000";
    }

    $stmt = $conn->prepare($sql);
    if ($pageTypes !== '') { $stmt->bind_param($pageTypes, ...$pageParams); }
    $stmt->execute();
    $result = $stmt->get_result();

    $inventory = [];
    while ($row = $result->fetch_assoc()) {
        $stock_qty = floatval($row['stock_quantity']);
        $inventory[] = [
            'id'               => (int)$row['id'],
            'productName'      => $row['name'],
            'name'             => $row['name'],
            'category_id'      => (int)$row['category_id'],
            'category'         => $row['category_name'],
            'category_name'    => $row['category_name'],
            'price'            => floatval($row['price']),
            'unit'             => $row['unit'],
            'currentStock'     => $stock_qty,
            'stock_quantity'   => $stock_qty,
            'minStockLevel'    => floatval($row['min_stock_level']),
            'min_stock_level'  => floatval($row['min_stock_level']),
            'maxStockLevel'    => floatval($row['max_stock_level']),
            'max_stock_level'  => floatval($row['max_stock_level']),
            'status'           => ($stock_qty < floatval($row['min_stock_level'])) ? 'low' : 'normal',
            'lastUpdated'      => $row['updated_at'],
            'updated_at'       => $row['updated_at'],
        ];
    }
    $stmt->close();

    http_response_code(200);
    echo json_encode([
        'success'    => true,
        'inventory'  => $inventory,
        'total'      => $totalFiltered,
        'page'       => $page,
        'limit'      => $limit,
        'categories' => $categories,
        'stats'      => [
            'total_products'     => (int)($statsRow['total_products'] ?? 0),
            'low_stock_count'    => (int)($statsRow['low_stock_count'] ?? 0),
            'well_stocked_count' => (int)($statsRow['well_stocked_count'] ?? 0),
        ],
    ]);

} catch (Exception $e) {
    error_log('Get Inventory Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
