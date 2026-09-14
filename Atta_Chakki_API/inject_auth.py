import os

admin_files = [
    'controllers/admin/delete_contact_message.php',
    'controllers/admin/get_admin_notifications.php',
    'controllers/admin/get_store_settings.php',
    'controllers/admin/reply_contact_message.php',
    'controllers/admin/update_custom_mix_request.php',
    'controllers/admin/update_store_settings.php',
    'controllers/coupons/add_coupon.php',
    'controllers/coupons/delete_coupon.php',
    'controllers/coupons/update_coupon.php',
    'controllers/delivery/manage_delivery.php',
    'controllers/expenses/add_expense.php',
    'controllers/expenses/delete_expense.php',
    'controllers/expenses/get_expenses.php',
    'controllers/expenses/update_expense.php',
    'controllers/inventory/add_inventory_impl.php',
    'controllers/inventory/get_inventory_impl.php',
    'controllers/inventory/manual_stock_update_impl.php',
    'controllers/inventory/update_inventory_impl.php',
    'controllers/orders/admin_orders.php',
    'controllers/orders/check_eod_status.php',
    'controllers/orders/get_completed_orders.php',
    'controllers/orders/get_delivery_orders.php',
    'controllers/orders/get_pickup_requests.php',
    'controllers/orders/get_processing_orders.php',
    'controllers/orders/get_scheduled_orders.php',
    'controllers/orders/get_yesterday_pending.php',
    'controllers/orders/override_order_schedule.php',
    'controllers/orders/process_eod_selection.php',
    'controllers/orders/process_rollover.php',
    'controllers/orders/split_large_order.php',
    'controllers/orders/split_order_batch.php',
    'controllers/orders/update_delivery_settings.php',
    'controllers/orders/update_order_items.php',
    'controllers/orders/update_order_status.php',
    'controllers/orders/update_pickup_weight.php',
    'controllers/payments/get_financial_analytics.php',
    'controllers/payments/get_udhaar_ledger.php',
    'controllers/payments/record_payment.php',
    'controllers/payments/record_udhaar_payment.php',
    'controllers/products/add_category.php',
    'controllers/products/delete_category.php',
    'controllers/products/update_category.php',
    'controllers/products/update_product.php',
    'controllers/rentals/get_active_rentals.php',
    'controllers/rentals/get_rental_history.php',
    'controllers/reviews/admin_get_comments.php',
    'controllers/reviews/delete_comment.php',
    'controllers/users/get_customers.php',
    'controllers/users/manage_vip_privilege.php',
    'controllers/users/promote_to_vip.php',
    'controllers/users/toggle_customer_status.php'
]

customer_files = [
    'controllers/cart/get_cart_impl.php',
    'controllers/orders/get_user_orders.php',
    'controllers/orders/place_order.php',
    'controllers/orders/track_order.php',
    'controllers/reviews/add_comment.php',
    'controllers/users/update_user_profile.php'
]

def add_middleware(files, require_func):
    for f in files:
        path = os.path.join('c:/xampp/htdocs/Atta_Chakki_API', f)
        if not os.path.exists(path):
            print(f'File not found: {path}')
            continue
            
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            
        if 'auth_middleware.php' in content:
            print(f'Already has middleware: {path}')
            continue
            
        dots = '../' * (f.count('/') - 1)
        insert_code = f"\nrequire_once __DIR__ . '/{dots}../utils/auth_middleware.php';\n{require_func}();\n"
        
        if "header('Content-Type: application/json');" in content:
            new_content = content.replace(
                "header('Content-Type: application/json');", 
                "header('Content-Type: application/json');" + insert_code,
                1
            )
            with open(path, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f'Updated: {path}')
        else:
            print(f'Warning: Could not find header in {path}')

add_middleware(admin_files, 'require_admin')
add_middleware(customer_files, 'require_auth')
