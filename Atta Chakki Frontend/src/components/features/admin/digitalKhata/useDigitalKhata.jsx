import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../../../store/AuthContext';
import { API_BASE_URL } from '../../../../config';

export function useDigitalKhata() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [backendTotals, setBackendTotals] = useState({ today: 0, month: 0 });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [filteredTotalAmount, setFilteredTotalAmount] = useState(0);
  const [printExpenses, setPrintExpenses] = useState([]);
  const [showPrintReport, setShowPrintReport] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [productCategories, setProductCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);

  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const mapRecord = (record) => ({
    id: record.id,
    date: record.expense_time,
    category: record.category || 'Uncategorized',
    amount: parseFloat(record.amount),
    description: record.description,
    recordedBy: record.recorded_by || 'Admin',
  });

  const buildExpenseParams = useCallback((extra = {}) => {
    const params = new URLSearchParams();
    if (dateRange?.from) {
      const iso = (d) => new Date(d).toISOString().slice(0, 10);
      params.set('date_from', iso(dateRange.from));
      params.set('date_to', iso(dateRange.to || dateRange.from));
    }
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  }, [dateRange]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const qs = buildExpenseParams({ page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/get_expenses.php?${qs}`);
      const data = await response.json();

      if (data.success) {
        setBackendTotals(data.totals);
        setExpenses(data.records.map(mapRecord));
        setTotalItems(data.total || 0);
        setFilteredTotalAmount(parseFloat(data.filtered_amount) || 0);
      } else {
        toast.error('Failed to load expenses');
      }
    } catch (error) {
      console.error('Network Error:', error);
      toast.error('Network Error: Could not connect to database');
    } finally {
      setLoading(false);
    }
  }, [buildExpenseParams, page, pageSize]);

  const fetchAllExpenses = async () => {
    const qs = buildExpenseParams({ all: '1' });
    const response = await fetch(`${API_BASE_URL}/get_expenses.php?${qs}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed');
    return data.records.map(mapRecord);
  };

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_products.php`);
      const data = await response.json();
      if (data.success && data.products) {
        setProductCategories(data.products.map(p => p.name));
      }
    } catch (error) {
      console.error('Failed to load product categories', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, pageSize]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddExpense = async () => {
    if (!amount || !category || (category === 'Other' && !customCategory)) {
      toast.error('Please enter amount and category details');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsSaving(true);
    try {
      let finalDate = expenseDate;
      const now = new Date();
      if (expenseDate.toDateString() === now.toDateString()) {
        finalDate = now;
      } else {
        finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }

      const offset = finalDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(finalDate - offset)).toISOString().slice(0, 19).replace('T', ' ');
      const finalCategory = category === 'Other' ? customCategory.trim() : category;

      const payload = {
        user_id: user?.id || 1,
        category: finalCategory,
        amount: numAmount,
        description: description,
        expense_time: localISOTime
      };

      const response = await fetch(`${API_BASE_URL}/add_expense.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Expense recorded successfully');
        setAmount('');
        setCategory('');
        setCustomCategory('');
        setDescription('');
        setExpenseDate(new Date());
        setIsAdding(false);
        fetchExpenses();
      } else {
        toast.error(result.message || 'Failed to record expense');
      }
    } catch (error) {
      toast.error('Network Error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/delete_expense.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingId })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Entry deleted');
        fetchExpenses();
      } else {
        toast.error(result.message || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Network error while deleting');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handlePrintReport = async () => {
    try {
      const all = await fetchAllExpenses();
      setPrintExpenses(all);
      setShowPrintReport(true);
    } catch (e) {
      toast.error('Failed to prepare print report');
    }
  };

  const getPeriodLabel = () => {
    if (dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`;
      }
      return format(dateRange.from, 'dd MMM yyyy');
    }
    return 'All Time';
  };

  return {
    expenses,
    backendTotals,
    loading,
    isSaving,
    deletingId,
    setDeletingId,
    isDeleting,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    filteredTotalAmount,
    printExpenses,
    setPrintExpenses,
    showPrintReport,
    setShowPrintReport,
    amount,
    setAmount,
    category,
    setCategory,
    customCategory,
    setCustomCategory,
    productCategories,
    description,
    setDescription,
    expenseDate,
    setExpenseDate,
    isAdding,
    setIsAdding,
    dateRange,
    setDateRange,
    handleAddExpense,
    handleDelete,
    confirmDelete,
    handlePrintReport,
    getPeriodLabel,
  };
}
