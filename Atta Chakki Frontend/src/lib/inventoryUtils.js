// src/lib/inventoryUtils.js
import { API_BASE_URL } from '../config';

/**
 * Deduct order items from inventory when order is completed
 */
export async function deductFromInventory(order) {
  if (!order || !order.items || order.items.length === 0) return true;

  try {
    const response = await fetch(`${API_BASE_URL}/update_inventory.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'deduct', 
        items: order.items 
      })
    });
    
    const data = await response.json();
    if (!data.success) console.warn("Inventory Warning:", data.message);
    
    return data;
  } catch (error) {
    console.error("Failed to deduct inventory:", error);
    return { success: false, message: "Network Error" };
  }
}

/**
 * Restore order items to inventory when order is cancelled
 */
export async function restoreToInventory(order) {
  if (!order || !order.items || order.items.length === 0) return true;

  try {
    const response = await fetch(`${API_BASE_URL}/update_inventory.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'restore', 
        items: order.items 
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to restore inventory:", error);
    return { success: false, message: "Network Error" };
  }
}

/**
 * Check if there's enough inventory for an order (Frontend Check)
 * Note: To do this perfectly requires a live DB fetch, but we can bypass 
 * it for now or implement a specific 'check_stock.php' if needed.
 */
export async function checkInventoryAvailability(order) {
  // For now, we will assume true. If you want strict checking before 
  // creating an order, we will build a check_stock.php endpoint next.
  return { available: true, shortages: [] };
}