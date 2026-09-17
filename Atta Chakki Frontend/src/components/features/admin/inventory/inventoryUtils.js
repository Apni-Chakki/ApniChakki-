export function getStockStatus(item) {
  if (item.currentStock <= item.minStockLevel) {
    return { label: 'Low Stock', color: 'bg-red-500 text-white' };
  } else if (item.maxStockLevel && item.currentStock >= item.maxStockLevel) {
    return { label: 'Full Stock', color: 'bg-blue-500 text-white' };
  } else if (item.currentStock <= item.minStockLevel * 1.5) {
    return { label: 'Medium Stock', color: 'bg-yellow-500 text-white' };
  } else {
    return { label: 'Good Stock', color: 'bg-green-500 text-white' };
  }
}
