// src/utils/inventoryUtils.js
import { API_BASE_URL } from '../config';

/* 
 * Deduct order items from inventory when order is completed
 */
export async function deductFromInventory(order) {
  if (!order || !order.items || order.items.length === 0) return { success: true };

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
    const response = await fetch(`${API_BASE_URL}/update_inventory.php`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ 
        action: 'deduct', 
        items: order.items 
      })
    });
    
    const data = await response.json();
    if (!data.success) console.warn("Inventory Warning:", data.message);
    
    return data;
  } catch (error) {
    console.warn("Failed to deduct inventory:", error);
    return { success: true, message: "Inventory update skipped" };
  }
}

/* 
 * Restore order items to inventory when order is cancelled
 */
export async function restoreToInventory(order) {
  if (!order || !order.items || order.items.length === 0) return { success: true };

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
    const response = await fetch(`${API_BASE_URL}/update_inventory.php`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ 
        action: 'restore', 
        items: order.items 
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Failed to restore inventory:", error);
    return { success: true, message: "Inventory restore skipped" };
  }
}

/* 
 * Check if there's enough inventory for an order (Frontend Check)
 * Note: To do this perfectly requires a live DB fetch, but we can bypass 
 * it for now or implement a specific 'check_stock.php' if needed.
 */
export async function checkInventoryAvailability(order) {
  // For now, we will assume true. If you want strict checking before 
  // creating an order, we will build a check_stock.php endpoint next.
  return { available: true, shortages: [] };
}



