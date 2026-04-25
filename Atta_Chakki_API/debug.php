<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Apni Chakki API Debug Panel</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .section { background: white; padding: 20px; margin: 10px 0; border-radius: 5px; }
        h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-button { 
            background: #007bff; color: white; padding: 8px 15px; 
            border: none; border-radius: 3px; cursor: pointer; margin: 5px 5px 5px 0;
        }
        .test-button:hover { background: #0056b3; }
        .result { 
            background: #f9f9f9; padding: 15px; margin-top: 10px;
            border-left: 4px solid #007bff; font-family: monospace; 
            white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;
        }
        .error { border-left-color: #dc3545; color: #dc3545; }
        .success { border-left-color: #28a745; color: #28a745; }
        .logs { background: #f9f9f9; padding: 15px; margin-top: 10px; border-left: 4px solid #ffc107; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <h1>🔧 Apni Chakki API Debug Panel</h1>
    
    <div class="section">
        <h2>Test Endpoints</h2>
        
        <h3>Admin Orders</h3>
        <button class="test-button" onclick="testEndpoint('/atta_chakki_api/admin_orders.php?status=pending', 'GET')">GET /admin_orders.php?status=pending</button>
        <div id="admin-orders-result" class="result"></div>
        
        <h3>Get All Products</h3>
        <button class="test-button" onclick="testEndpoint('/atta_chakki_api/Manage_Services/get_all_products.php', 'GET')">GET /get_all_products.php</button>
        <div id="products-result" class="result"></div>
        
        <h3>Add Product</h3>
        <button class="test-button" onclick="testAddProduct()">POST /add_product.php</button>
        <div id="add-result" class="result"></div>
        
        <h3>Database Connection Test</h3>
        <button class="test-button" onclick="testEndpoint('/atta_chakki_api/diagnostic_test.php', 'GET')">Run Diagnostics</button>
        <div id="diag-result" class="result"></div>
    </div>
    
    <div class="section">
        <h2>Error Logs</h2>
        <button class="test-button" onclick="showErrorLogs()">Show Error Logs</button>
        <div id="logs" class="logs"></div>
    </div>

    <script>
        function testEndpoint(url, method) {
            const resultId = method === 'GET' && url.includes('admin_orders') ? 'admin-orders-result' :
                            method === 'GET' && url.includes('get_all_products') ? 'products-result' :
                            'diag-result';
            
            fetch('http://localhost' + url, {
                method: method,
                headers: { 'Content-Type': 'application/json' }
            })
            .then(r => r.text())
            .then(text => {
                document.getElementById(resultId).textContent = text;
                document.getElementById(resultId).className = 'result success';
            })
            .catch(err => {
                document.getElementById(resultId).textContent = 'ERROR: ' + err.message;
                document.getElementById(resultId).className = 'result error';
            });
        }
        
        function testAddProduct() {
            fetch('http://localhost/atta_chakki_api/Manage_Services/add_product.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Product',
                    price: 50,
                    unit: 'kg',
                    category: 'wheat',
                    description: 'Test description'
                })
            })
            .then(r => r.text())
            .then(text => {
                document.getElementById('add-result').textContent = text;
                document.getElementById('add-result').className = 'result success';
            })
            .catch(err => {
                document.getElementById('add-result').textContent = 'ERROR: ' + err.message;
                document.getElementById('add-result').className = 'result error';
            });
        }
        
        function showErrorLogs() {
            fetch('http://localhost/atta_chakki_api/show_logs.php')
            .then(r => r.text())
            .then(text => {
                document.getElementById('logs').textContent = text || 'No logs found';
            })
            .catch(err => {
                document.getElementById('logs').textContent = 'ERROR: ' + err.message;
            });
        }
    </script>
</body>
</html>
