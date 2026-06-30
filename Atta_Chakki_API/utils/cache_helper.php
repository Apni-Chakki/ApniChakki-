<?php
function clear_products_cache() {
    $cache_dir = __DIR__ . '/../cache';
    if (is_dir($cache_dir)) {
        $files = glob($cache_dir . '/products_limit_*.json');
        if (is_array($files)) {
            foreach ($files as $file) {
                if (is_file($file)) {
                    @unlink($file);
                }
            }
        }
    }
}
?>
