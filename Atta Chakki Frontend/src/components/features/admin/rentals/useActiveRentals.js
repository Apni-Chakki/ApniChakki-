import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';
import { downloadBillPDF } from '../../../../utils/billPdfUtils';
import {
  mapRentalToOrder,
  generateWhatsAppReminder,
} from './rentalUtils';

export function useActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [summary, setSummary] = useState({
    total_active: 0,
    total_overdue: 0,
    total_deposits_held: 0,
  });
  const [loading, setLoading] = useState(true);
  const [returnModal, setReturnModal] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalItems, setTotalItems] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);

  const handlePrintSlip = (rental) => {
    const orderObj = mapRentalToOrder(rental);
    setPrintOrder(orderObj);
  };

  const handlePdfAndWhatsApp = async (rental) => {
    try {
      const orderObj = mapRentalToOrder(rental);
      await downloadBillPDF(orderObj);
      toast.success('PDF bill downloaded!');
      generateWhatsAppReminder(rental);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const loadRentals = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/get_active_rentals.php?${params.toString()}`);
      const data = await response.json();
      if (data.success && data.data) {
        setRentals(data.data.rentals || []);
        if (data.data.summary) setSummary(data.data.summary);
        setTotalItems(data.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(historyPageSize),
      });
      const response = await fetch(`${API_BASE_URL}/get_rental_history.php?${params.toString()}`);
      const data = await response.json();
      if (data.success && data.data) {
        setHistory(data.data.rentals || []);
        setHistoryTotal(data.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadRentals();
    const interval = setInterval(loadRentals, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    if (viewHistory) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historyPageSize, viewHistory]);

  const handleReturn = async (payload) => {
    if (!returnModal) return;
    setIsReturning(true);
    try {
      const isObject = typeof payload === 'object' && payload !== null;
      const returnedQty = isObject ? payload.returned_quantity : payload;
      const isLost = isObject ? !!payload.is_lost : false;
      const amountCollected = isObject ? Number(payload.amount_collected || 0) : 0;

      const response = await fetch(`${API_BASE_URL}/return_rental.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_id: returnModal.id,
          returned_quantity: returnedQty,
          is_lost: isLost,
          amount_collected: amountCollected,
          condition_notes: returnNotes,
          actual_return_date: new Date().toISOString().slice(0, 10),
        }),
      });
      const result = await response.json();
      if (result.success) {
        if (isLost) {
          toast.success(
            `⚠️ Lost item settled! Extra collected: Rs. ${amountCollected.toLocaleString()}. Deposit forfeited.`
          );
        } else {
          const refundAmt = result.data?.deposit_refund_amount ?? result.deposit_refund_amount ?? 0;
          const returnedCount = result.data?.returned_quantity || returnedQty || 1;
          const isFull = result.data?.is_full_return !== false;
          toast.success(
            `✅ Return processed for ${returnedCount} unit(s)! ${
              isFull ? '(All returned)' : '(Partial return)'
            } Deposit refund: Rs. ${Number(refundAmt).toLocaleString()}`
          );
        }
        setReturnModal(null);
        setReturnNotes('');
        loadRentals();
      } else {
        toast.error(result.message || 'Failed to process return');
      }
    } catch {
      toast.error('Network error while processing return');
    } finally {
      setIsReturning(false);
    }
  };

  const handleToggleHistory = () => {
    const nextVal = !viewHistory;
    setViewHistory(nextVal);
    if (nextVal) {
      loadHistory();
    }
  };

  return {
    rentals,
    summary,
    loading,
    returnModal,
    setReturnModal,
    returnNotes,
    setReturnNotes,
    isReturning,
    viewHistory,
    history,
    loadingHistory,
    printOrder,
    setPrintOrder,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    historyTotal,
    handlePrintSlip,
    handlePdfAndWhatsApp,
    handleReturn,
    handleToggleHistory,
  };
}
