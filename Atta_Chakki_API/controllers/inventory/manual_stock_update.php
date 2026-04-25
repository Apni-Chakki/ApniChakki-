<?php
// FIXED: Added CORS headers to proxy file
require_once __DIR__ . '/../../config/cors.php';
// Backward-compatible proxy - routes to implementation
require_once __DIR__ . '/manual_stock_update_impl.php';
