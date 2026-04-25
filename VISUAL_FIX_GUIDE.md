# Quick Visual Guide - 500 Error Fixes

## Error #1: get_financial_analytics.php - Missing JSON Header

### ❌ BEFORE (Returns Empty/Malformed JSON)
```php
<?php
include __DIR__ . '/../config/connect.php';
// ← NO header() call!

$chartData = [];

// Build data...
for ($i = 6; $i >= 0; $i--) { ... }

// Output JSON
echo json_encode([...]);
// If error occurs above, response is empty → "Unexpected end of JSON"
```

### ✅ AFTER (Returns Proper JSON)
```php
<?php
include __DIR__ . '/../config/connect.php';

header('Content-Type: application/json');  // ← FIXED!

try {
    // Build data...
    $chartData = [];
    
    for ($i = 6; $i >= 0; $i--) { ... }
    
    echo json_encode([...]);
    
} catch (Exception $e) {  // ← Error handling
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
```

---

## Error #2: admin_orders.php - SQL Injection Issues

### ❌ BEFORE (String Concatenation - Vulnerable & Fails)
```php
while($row = $result->fetch_assoc()) {
    $user_id = $row['user_id'];
    
    // Direct SQL concat → if $user_id is weird, query fails!
    $user_res = $conn->query("SELECT ... FROM users WHERE id = '$user_id'");
    
    $order_id = $row['id'];
    $item_res = $conn->query("SELECT ... WHERE order_id = '$order_id'");
    
    while($i = $item_res->fetch_assoc()) {
        $pid = $i['product_id'];
        $prod_res = $conn->query("SELECT ... WHERE id = '$pid'");
    }
}
```

### ✅ AFTER (Prepared Statements - Safe & Works)
```php
while($row = $result->fetch_assoc()) {
    $user_id = (int)$row['user_id'];  // ← Type cast
    
    // Use prepared statement
    $user_stmt = $conn->prepare("SELECT ... FROM users WHERE id = ?");
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_res = $user_stmt->get_result();
    
    $order_id = (int)$row['id'];
    $item_stmt = $conn->prepare("SELECT ... FROM order_items WHERE order_id = ?");
    $item_stmt->bind_param("i", $order_id);
    $item_stmt->execute();
    $item_res = $item_stmt->get_result();
    
    while($i = $item_res->fetch_assoc()) {
        $pid = (int)$i['product_id'];
        $prod_stmt = $conn->prepare("SELECT name FROM products WHERE id = ?");
        $prod_stmt->bind_param("i", $pid);
        $prod_stmt->execute();
        $prod_res = $prod_stmt->get_result();
    }
    $item_stmt->close();
}
```

---

## Error #3 & #4: Wrong Column Names in add_product.php

### ❌ BEFORE (Non-existent Columns → 500 Error)
```php
$stmt = $conn->prepare("INSERT INTO products (
    name, price, unit, category, description, image_url, stock
) VALUES (?, ?, ?, ?, ?, ?, ?)");
//                      ↑        ↑
//            Database has no 'category' column, it has 'category_id'
//            Database has no 'stock' column, it has 'stock_quantity'

$stmt->bind_param("sdssssi", $name, $price, $unit, $category, $description, $image, $stock);

if ($stmt->execute()) {
    // ❌ FAILS: "Unknown column 'category' in 'field list'"
}
```

### ✅ AFTER (Correct Columns + Lookup)
```php
// Step 1: Convert category name → category ID
$cat_stmt = $conn->prepare("SELECT id FROM categories WHERE name = ?");
$cat_stmt->bind_param("s", $category_name);
$cat_stmt->execute();
$cat_result = $cat_stmt->get_result();

if ($cat_result->num_rows === 0) {
    // Auto-create category if doesn't exist
    $insert_cat = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
    $insert_cat->bind_param("s", $category_name);
    $insert_cat->execute();
    $category_id = $insert_cat->insert_id;
} else {
    $category_id = $cat_result->fetch_assoc()['id'];
}

// Step 2: Use correct column names
$stmt = $conn->prepare("INSERT INTO products (
    name, price, unit, category_id, description, image_url, stock_quantity
) VALUES (?, ?, ?, ?, ?, ?, ?)");
//                      ↑                                        ↑
//                  Correct!                              Correct!

$stmt->bind_param("sdsissd", $name, $price, $unit, $category_id, $description, $image, $stock_quantity);

if ($stmt->execute()) {
    // ✅ SUCCESS!
}
```

---

## Error #5: get_all_products.php - Wrong Field Access

### ❌ BEFORE (Accessing Non-existent Field)
```php
$result = $conn->query($sql);
$products = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['price'] = floatval($row['price']);
        $row['stock'] = intval($row['stock']);  // ← Field doesn't exist!
        $products[] = $row;
    }
    echo json_encode(["success" => true, "products" => $products]);
}
```

**Problem:** `$row['stock']` is NULL because database column is `stock_quantity`

### ✅ AFTER (Correct Field Name)
```php
try {
    $sql = "SELECT p.*, image_url AS image, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $row['price'] = floatval($row['price']);
        $row['stock'] = intval($row['stock_quantity']);  // ← Correct field!
        $row['stock_quantity'] = floatval($row['stock_quantity']);
        $products[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "products" => $products]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
```

---

## API Response Comparison

### ❌ BEFORE (500 Error Response)
```
Response Status: 500 Internal Server Error
Response Body: (empty or partial HTML error page)
Browser Error: "Unexpected end of JSON input"
```

### ✅ AFTER (Proper JSON Response)
```json
GET /admin_orders.php?status=pending
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "user_id": 5,
      "status": "pending",
      "customer_name": "Abdul Sami",
      "customer_phone": "03001234567",
      "items": [...]
    }
  ]
}
```

Or if error:
```json
{
  "success": false,
  "message": "Database connection failed"
}
```

---

## Database Schema Reference

```sql
-- Correct column names to use:

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,  -- Use THIS (not 'category')
    name VARCHAR(100),
    price DECIMAL(10,2),
    unit VARCHAR(20),
    stock_quantity DECIMAL(10,2),  -- Use THIS (not 'stock')
    ...
);

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE,
    ...
);
```

---

## Testing: Before & After

### Test: Get All Products

```bash
# Test command
curl "http://localhost/atta_chakki_api/Manage_Services/get_all_products.php"
```

#### ❌ BEFORE
```
HTTP/1.1 500 Internal Server Error
Content-Type: text/html

<!DOCTYPE html>
<html>
<body>
Fatal error: Uncaught Exception...
</body>
</html>
```

#### ✅ AFTER
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Premium Wheat Flour",
      "price": 45.00,
      "stock": 100,
      "unit": "kg",
      ...
    }
  ]
}
```

---

## Quick Diagnosis: How to Find Similar Issues

If you see another 500 error, check:

### ✅ Checklist:
- [ ] Does the controller set `header('Content-Type: application/json');` ?
- [ ] Is entire logic wrapped in `try { } catch (Exception $e) { }` ?
- [ ] Do all database queries use prepared statements (`$conn->prepare()`) ?
- [ ] Do column names in INSERT/UPDATE match actual database columns?
- [ ] Are all variables properly type-cast (e.g., `(int)`, `(string)`) ?
- [ ] Does the catch block return JSON error, not HTML error?

If any box is unchecked → likely cause of 500 error!

---

