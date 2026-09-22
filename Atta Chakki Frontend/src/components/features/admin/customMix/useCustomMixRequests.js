import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../../config';

export function useCustomMixRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalItems, setTotalItems] = useState(0);

  // Convert to order state variables
  const [convertingRequest, setConvertingRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(5);
  const [orderAddress, setOrderAddress] = useState('Store Pickup');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [ratios, setRatios] = useState([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Custom ingredient states
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientPrice, setNewIngredientPrice] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      const response = await fetch(`${API_BASE_URL}/get_custom_mix_requests.php?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setRequests(data.data || []);
        setTotalItems(data.total || 0);
      } else {
        toast.error('Failed to fetch requests');
      }
    } catch (error) {
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_custom_mix_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Status updated to ${status}`);
        fetchRequests();
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleOpenConvertModal = (request) => {
    setConvertingRequest(request);
    setOrderQuantity(parseFloat(request.total_quantity) || 5);
    setOrderAddress(request.shipping_address || 'Store Pickup');
    setPaymentStatus('pending');
    setPaymentMethod('cash');

    // Parse selected items
    const parsedItems = Array.isArray(request.selected_items)
      ? request.selected_items.map(item => ({
          item_name: item.item_name,
          price_per_kg: parseFloat(item.price_per_kg) || 30,
          ratio: parseFloat(item.ratio) || 0
        }))
      : [];

    setRatios(parsedItems);
    setModalOpen(true);
  };

  const getCalculatedPrice = useCallback(() => {
    let totalPrice = 0;
    let totalRatio = 0;
    ratios.forEach(r => {
      totalPrice += r.ratio * r.price_per_kg;
      totalRatio += r.ratio;
    });
    return totalRatio > 0 ? (totalPrice / totalRatio) : 0;
  }, [ratios]);

  const handleRatioChange = (index, value) => {
    const newVal = parseFloat(value) || 0;
    setRatios(prev => prev.map((item, idx) => (idx === index ? { ...item, ratio: newVal } : item)));
  };

  const handleAddNewIngredient = () => {
    if (!newIngredientName.trim() || !newIngredientPrice) {
      toast.error('Please enter ingredient name and price');
      return;
    }
    const price = parseFloat(newIngredientPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (ratios.some(r => r.item_name.toLowerCase() === newIngredientName.trim().toLowerCase())) {
      toast.error('This ingredient already exists in the mix');
      return;
    }

    setRatios(prev => [
      ...prev,
      {
        item_name: newIngredientName.trim(),
        price_per_kg: price,
        ratio: 0.5
      }
    ]);
    setNewIngredientName('');
    setNewIngredientPrice('');
    setShowAddForm(false);
    toast.success(`"${newIngredientName.trim()}" added to mix proportions!`);
  };

  const handleConvertSubmit = async () => {
    if (!convertingRequest) return;

    const calculatedPrice = getCalculatedPrice();
    if (calculatedPrice <= 0) {
      toast.error('Please select a valid mix ratio');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        name: convertingRequest.customer_name,
        phone: convertingRequest.customer_phone,
        address: orderAddress || 'Store Pickup',
        status: 'processing',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        total: Math.round(calculatedPrice * orderQuantity),
        amount_paid: paymentStatus === 'paid' ? Math.round(calculatedPrice * orderQuantity) : 0,
        items: [
          {
            id: convertingRequest.product_id || 0,
            name: convertingRequest.product_name || 'Custom Flour Mix',
            unit: 'kg',
            quantity: parseFloat(orderQuantity),
            price: Math.round(calculatedPrice),
            is_cleaning: 0,
            is_grinding: 0,
            selected_customizations: ratios
              .filter(r => r.ratio > 0)
              .map(r => ({
                option_name: `Mix: ${r.item_name} (${parseFloat(r.ratio).toFixed(2)}kg)`,
                option_price: 0
              }))
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/admin_create_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Custom mix request successfully converted to active scheduled order!');
        await updateStatus(convertingRequest.id, 'completed');
        setModalOpen(false);
        setConvertingRequest(null);
      } else {
        toast.error(result.message || 'Failed to convert request to order');
      }
    } catch (error) {
      toast.error('Network error during conversion');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'contacted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return {
    requests,
    loading,
    expandedId,
    setExpandedId,
    page,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
    fetchRequests,
    updateStatus,
    getStatusColor,
    convertingRequest,
    modalOpen,
    setModalOpen,
    orderQuantity,
    setOrderQuantity,
    orderAddress,
    setOrderAddress,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    ratios,
    setRatios,
    isSubmittingOrder,
    newIngredientName,
    setNewIngredientName,
    newIngredientPrice,
    setNewIngredientPrice,
    showAddForm,
    setShowAddForm,
    handleOpenConvertModal,
    getCalculatedPrice,
    handleRatioChange,
    handleAddNewIngredient,
    handleConvertSubmit
  };
}

export default useCustomMixRequests;
