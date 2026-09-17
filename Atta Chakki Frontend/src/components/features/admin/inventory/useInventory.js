import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [printInventory, setPrintInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total_products: 0, low_stock_count: 0, well_stocked_count: 0 });

  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updateType, setUpdateType] = useState('add');
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, pageSize]);

  const buildParams = useCallback((extra = {}) => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  }, [debouncedSearch, categoryFilter]);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const qs = buildParams({ page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/get_inventory.php?${qs}`);
      const data = await response.json();

      if (data.success) {
        setInventory(data.inventory || []);
        setTotalItems(data.total || 0);
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.categories)) setCategories(data.categories);
      } else {
        toast.error(data.message || 'Failed to load inventory');
      }
    } catch (error) {
      console.error('Network Error:', error);
      toast.error('Network error: Could not load inventory');
    } finally {
      setLoading(false);
    }
  }, [buildParams, page, pageSize]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const fetchAllInventory = async () => {
    const qs = buildParams({ all: '1' });
    const response = await fetch(`${API_BASE_URL}/get_inventory.php?${qs}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed');
    return data.inventory || [];
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct || !updateQuantity) {
      toast.error('Please enter quantity');
      return;
    }

    const quantity = parseFloat(updateQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/manual_stock_update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: quantity,
          type: updateType
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Inventory updated successfully!`);
        setShowUpdateDialog(false);
        setUpdateQuantity('');
        setUpdateNotes('');
        setSelectedProduct(null);
        fetchInventory();
      } else {
        toast.error(data.message || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Network Error:', error);
      toast.error('Network error while updating stock');
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateDialog = (product, type) => {
    setSelectedProduct(product);
    setUpdateType(type);
    setShowUpdateDialog(true);
  };

  const handlePrintRestockList = async () => {
    try {
      const all = await fetchAllInventory();
      setPrintInventory(all);
      setShowPrintDialog(true);
    } catch (e) {
      toast.error('Failed to prepare restock list');
    }
  };

  return {
    inventory,
    printInventory,
    setPrintInventory,
    loading,
    isUpdating,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    categories,
    stats,
    showUpdateDialog,
    setShowUpdateDialog,
    showPrintDialog,
    setShowPrintDialog,
    selectedProduct,
    setSelectedProduct,
    updateType,
    updateQuantity,
    setUpdateQuantity,
    updateNotes,
    setUpdateNotes,
    fetchInventory,
    handleUpdateStock,
    openUpdateDialog,
    handlePrintRestockList
  };
}

export default useInventory;
