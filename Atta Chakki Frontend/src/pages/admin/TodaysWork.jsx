import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
import { CheckCircle, Clock, MapPin, Phone, User, Package, Printer, FileDown, Loader2, CalendarClock, Timer, Weight, ArrowRight, Zap, AlertTriangle, AlertCircle, History, SplitSquareHorizontal, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { deductFromInventory } from '../../utils/inventoryUtils';
import { downloadBillPDF } from '../../utils/billPdfUtils';
import { PrintOrderDetails } from './PrintOrderDetails';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../../components/common/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/common/dialog';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Textarea } from '../../components/common/textarea';
import { Truck, UserPlus, Trash2, Calendar } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../../components/common/tooltip';

export function TodaysWork() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printOrder, setPrintOrder] = useState(null);
  const [sendingBill, setSendingBill] = useState(null);
  const [overriding, setOverriding] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [splitOrder, setSplitOrder] = useState(null);
  const [splitBatches, setSplitBatches] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [heavyThreshold, setHeavyThreshold] = useState(100);
  const [storeName, setStoreName] = useState('Mughal Atta Chakki');

  const processingOrders = orders.filter(order =>
    (order.items || []).some(item => {
      const unit = (item.unit || '').toLowerCase().trim();
      return unit === 'kg' || unit === 'g' || unit === 'trip';
    })
  );

  const preparedOrders = orders.filter(order =>
    !(order.items || []).some(item => {
      const unit = (item.unit || '').toLowerCase().trim();
      return unit === 'kg' || unit === 'g' || unit === 'trip';
    })
  );

  const totalWeight = processingOrders.reduce((sum, order) => sum + parseFloat(order.total_weight_kg || 0), 0);
  const totalProcessingMinutes = processingOrders.reduce((sum, order) => sum + parseInt(order.processing_time_minutes || 0), 0);
  const activeDrivers = activePersonnel.length;

  const fetchPersonnel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/manage_delivery.php`);
      const data = await response.json();
      if (data.success) {
        setActivePersonnel(data.personnel.filter(person => person.isActive));
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await res.json();
      if (data.success) {
        if (data.settings?.heavyOrderThreshold) {
          setHeavyThreshold(parseFloat(data.settings.heavyOrderThreshold) || 100);
        }
        if (data.settings?.organizationName || data.settings?.storeName) {
          setStoreName(data.settings.organizationName || data.settings.storeName);
        }
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  // fetch today's processing orders with scheduling info
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_processing_orders.php`);
      const data = await response.json();
      
      if (data.success) {
        setOrders((data.orders || []).map(order => ({
          ...order,
          type: order.order_type || order.type || (order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup') ? 'delivery' : 'pickup'),
          deliveryPersonnel: order.deliveryPersonnel || order.driver_name || null,
        })));
        if (data.capacity) setCapacity(data.capacity);
      } else {
        console.error("Failed to load orders");
      }
    } catch (error) {
      console.error("Network Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPersonnel();
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignPersonnel = async (orderId, personnelName, personnelPhone = null) => {
    setOrders(prevOrders => prevOrders.map(order => (
      order.id === orderId ? { ...order, deliveryPersonnel: personnelName } : order
    )));

    try {
      const response = await fetch(`${API_BASE_URL}/assign_driver.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_name: personnelName, driver_phone: personnelPhone })
      });

      const result = await response.json();

      if (result.success) {
        if (personnelName === '') {
          toast.info('Driver assignment cleared.');
        } else {
          toast.success(`Assigned to ${personnelName} successfully!`);
        }
      } else {
        toast.error('Failed to assign driver in database');
        fetchOrders();
      }
    } catch (error) {
      toast.error('Network error while assigning driver');
      fetchOrders();
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrder) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cancel_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: cancelOrder.id,
          reason: cancelReason || 'No reason provided',
          cancelled_by: 'Admin'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order cancelled successfully');
        fetchOrders();
      } else {
        toast.error(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      toast.error('Network error while cancelling order');
    } finally {
      setIsCancelling(false);
      setCancelOrder(null);
      setCancelReason('');
    }
  };

  const handleMovePickupToAdmin = async (order) => {
    try {
      const driver = activePersonnel[0] || { name: 'Admin', phone: '' };
      const res = await fetch(`${API_BASE_URL}/driver_notify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, driver_name: driver.name, driver_phone: driver.phone, message: 'Arrived at shop' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Moved to admin for weight update');
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to move pickup');
      }
    } catch (err) {
      console.error('Network error moving pickup to admin', err);
      toast.error('Network error');
    }
  };

  const handleGenerateTrackingLink = async (order) => {
    try {
      const res = await fetch(`${API_BASE_URL}/generate_tracking_link.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, driver_name: order.driver_name || '', driver_phone: order.driver_phone || '', base_url: window.location.origin })
      });
      const data = await res.json();
      if (data.success && data.tracking_url) {
        await navigator.clipboard.writeText(data.tracking_url);
        toast.success('Tracking link copied to clipboard');
      } else {
        toast.error(data.message || 'Failed to generate tracking link');
      }
    } catch (err) {
      console.error('Failed to generate tracking link', err);
      toast.error('Network error');
    }
  };

  // override: move order to tomorrow
  const moveToTomorrow = async (order) => {
    setOverriding(order.id);
    try {
      const response = await fetch(`${API_BASE_URL}/override_order_schedule.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, target_date: 'tomorrow' })
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`Order #${order.id} moved to Tomorrow's List`);
        if (data.today_capacity) setCapacity(data.today_capacity);
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to move order');
      }
    } catch (error) {
      toast.error('Network error updating order status');
    } finally {
      setOverriding(null);
    }
  };

  const markBatchProcessed = async (order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'batch_ready' })
      });
      const data = await response.json();
      if (data.success) {
        const invResult = await deductFromInventory(order);
        if (invResult.success) {
          toast.success(`Batch #${order.id} Processed! Inventory updated.`);
        } else {
          toast.warning(`Batch Processed, but inventory issue: ${invResult.message}`);
        }
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to update batch status');
      }
    } catch (error) {
      toast.error('Network error updating batch status');
    }
  };

  const openSplitModal = (order) => {
    const totalKg = parseFloat(order.total_weight_kg || 0);
    const suggested = totalKg > 0 ? Math.floor(totalKg / 2) : '';
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    setSplitBatches([
      { id: Date.now() + 1, date: today.toISOString().slice(0, 10), weight: suggested.toString() },
      { id: Date.now() + 2, date: tomorrow.toISOString().slice(0, 10), weight: totalKg > 0 ? (totalKg - suggested).toString() : '' }
    ]);
    setSplitOrder(order);
  };

  const closeSplitModal = () => {
    setSplitOrder(null);
    setSplitBatches([]);
  };

  const handleSplitOrder = async () => {
    if (!splitOrder) return;
    const totalKg = parseFloat(splitOrder.total_weight_kg || 0);
    
    let sum = 0;
    const validBatches = [];
    
    for (let i = 0; i < splitBatches.length; i++) {
      const b = splitBatches[i];
      const w = parseFloat(b.weight);
      if (isNaN(w) || w <= 0) {
        toast.error(`Batch ${i + 1} weight must be > 0`);
        return;
      }
      if (!b.date) {
        toast.error(`Batch ${i + 1} date is missing`);
        return;
      }
      sum += w;
      validBatches.push({ weight: w, date: b.date });
    }

    if (totalKg > 0) {
      const diff = Math.abs(sum - totalKg);
      if (diff > 0.5) {
        toast.error(`Batches sum (${sum.toFixed(1)}kg) does not match total ${totalKg}kg.`);
        return;
      }
    }

    setIsSplitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/split_order_batch.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: splitOrder.id,
          batches: validBatches
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`✅ Order #${splitOrder.id} split successfully!`);
        closeSplitModal();
        fetchOrders();
      } else {
        toast.error(result.message || "Failed to split order");
      }
    } catch (error) {
      toast.error("Network error — could not split order");
    } finally {
      setIsSplitting(false);
    }
  };

  // whatsapp message generator
  const generateWhatsAppMessage = (order) => {
    const isDelivery = order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup');
    const orderType = isDelivery ? "DELIVERY" : "PICKUP";
    
    let itemsText = "";
    order.items.forEach(item => {
        const itemPrice = parseFloat(item.price_at_purchase) || parseFloat(item.service?.price) || 0;
        const unit = item.unit || item.service?.unit || 'unit';
        const name = item.name || item.service?.name || '';
        
        let customText = "";
        if (item.customizations?.length > 0) {
            customText = item.customizations.map(c => c.option_name).join(' + ');
        } else {
            const services = [];
            if (item.is_cleaning == 1) services.push('Cleaning');
            if (item.is_grinding == 1) services.push('Grinding');
            customText = services.join(' + ');
        }
        
        itemsText += `🔸 *${name}* × ${item.quantity} ${unit}`;
        if (customText) {
            itemsText += ` (${customText})`;
        }
        if (itemPrice > 0) {
            itemsText += ` = Rs. ${(item.quantity * itemPrice).toLocaleString()}`;
        }
        itemsText += `\n`;
        
        // Rental details
        if (item.is_rental === 1 || item.is_rental === '1' || item.isRental) {
            itemsText += `   🗓️ _Rental: ${item.rental_days} days (${item.rental_start_date} to ${item.rental_end_date})_\n`;
            itemsText += `   💰 _Rate: Rs. ${Number(item.rental_price_per_day).toLocaleString()}/day | Deposit: Rs. ${Number(item.security_deposit).toLocaleString()}_\n`;
        }
    });

    let phone = (order.customer_phone || '').replace(/\D/g,'');
    if (phone.startsWith('0')) {
        phone = '92' + phone.substring(1);
    } else if (!phone.startsWith('92')) {
        phone = '92' + phone; 
    }

    const subtotal = parseFloat(order.total_amount) || 0;
    const discount = parseFloat(order.coupon_discount) || 0;
    const grandTotal = subtotal - discount;
    const advancePaid = parseFloat(order.amount_paid) || 0;
    const remainingDue = grandTotal - advancePaid;

    let priceBreakdown = `*SUBTOTAL:* Rs. ${subtotal.toLocaleString()}\n`;
    if (discount > 0) {
        priceBreakdown += `*COUPON DISCOUNT:* -Rs. ${discount.toLocaleString()}\n`;
        priceBreakdown += `*GRAND TOTAL:* Rs. ${grandTotal.toLocaleString()}\n`;
    }
    if (advancePaid > 0) {
        priceBreakdown += `*ADVANCE PAID:* Rs. ${advancePaid.toLocaleString()}\n`;
    }
    priceBreakdown += `*REMAINING DUE:* Rs. ${remainingDue.toLocaleString()}`;

    let addressSection = "";
    if (isDelivery && order.shipping_address) {
        addressSection = `*DELIVERY ADDRESS:* ${order.shipping_address}\n`;
    }

    const message = `
*MUGHAL ATTA CHAKKI* - Fresh Flour Daily 🌾
-----------------------------------
Assalam-o-Alaikum / Hello *${order.customer_name}*! 👋
Your order is now *READY* for ${orderType}.

*ORDER DETAILS*
Order ID: #${order.id}
Status: READY

*ORDER ITEMS*
${itemsText}-----------------------------------
${priceBreakdown}
${addressSection}-----------------------------------
Thank you for your business!
Mughal Atta Chakki — Pure & Fresh Processing
`.trim();
    
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  };

  // mark as ready + download PDF bill + send whatsapp
  const markAsReady = async (order) => {
    setSendingBill(order.id);
    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'ready' })
      });
      const data = await response.json();

      if (data.success) {
        const invResult = await deductFromInventory(order);
        if (invResult.success) {
          toast.success(`Order #${order.id} is Ready! Inventory updated.`);
        } else {
          toast.warning(`Order is Ready, but inventory issue: ${invResult.message}`);
        }

        if (order.is_split_batch && order.siblings) {
          for (const sib of order.siblings) {
            if (sib.status === 'batch_ready') {
              try {
                await fetch(`${API_BASE_URL}/update_order_status.php`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order_id: sib.id, status: 'ready' })
                });
              } catch(e) {
                console.error("Failed to sync sibling status", e);
              }
            }
          }
        }

        const totalAmount = parseFloat(order.total_amount) || 0;
        const amountPaid = parseFloat(order.amount_paid) || 0;
        const pdfOrder = {
          id: String(order.id),
          customerName: order.customer_name || 'Walk-in Customer',
          phone: order.customer_phone || '',
          total: totalAmount,
          advancePayment: amountPaid,
          type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
          deliveryAddress: order.shipping_address || '',
          paymentMethod: order.payment_method || 'cash',
          paymentStatus: amountPaid >= totalAmount && totalAmount > 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
          couponCode: order.coupon_code || '',
          couponDiscount: parseFloat(order.coupon_discount || 0),
          items: (order.items || []).map(item => ({
            quantity: item.quantity,
            isWeightPending: false,
            service: {
              name: item.name,
              price: item.price_at_purchase || 0,
              unit: item.unit || 'kg'
            }
          }))
        };

        const filename = await downloadBillPDF(pdfOrder);
        toast.success(`📄 Bill PDF downloaded: ${filename}`);
        setOrders(prev => prev.filter(o => o.id !== order.id));
        const whatsappLink = generateWhatsAppMessage(order);
        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Failed to update status.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network Error');
    } finally {
      setSendingBill(null);
    }
  };

  const handlePrint = (order) => {
    const totalAmount = parseFloat(order.total_amount) || 0;
    const amountPaid = parseFloat(order.amount_paid) || 0;
    
    let paymentStatus = order.payment_status || 'pending';
    if (paymentStatus === 'paid' || amountPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partial';
    }

    const transformedOrder = {
      id: order.id.toString(),
      customerName: order.customer_name || order.full_name || 'Walk-in Customer',
      phone: order.customer_phone || order.phone || '',
      total: totalAmount,
      status: order.status,
      createdAt: order.created_at,
      paymentMethod: order.payment_method || 'cod',
      paymentStatus: paymentStatus,
      advancePayment: amountPaid,
      type: (order.shipping_address && order.shipping_address.toLowerCase().includes('pickup')) ? 'pickup' : 'delivery',
      source: (order.user_id === '1' || !order.user_id) ? 'manual' : 'online',
      deliveryPersonnel: order.driver_name || null,
      deliveryAddress: order.shipping_address,
      cancellationReason: null,
      cancelledBy: null,
      couponCode: order.coupon_code || '',
      couponDiscount: parseFloat(order.coupon_discount || 0),
      items: order.items ? order.items.map(item => ({
        quantity: item.quantity,
        isWeightPending: false,
        price_at_purchase: item.price_at_purchase || 0,
        name: item.name,
        service: { name: item.name, price: item.price_at_purchase || 0 }
      })) : []
    };
    setPrintOrder(transformedOrder);
  };

  const handlePrintAll = () => {
    const printStyle = document.createElement('style');
    printStyle.id = 'print-all-work-style';
    printStyle.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #print-all-work-container, #print-all-work-container * {
          visibility: visible !important;
        }
        #print-all-work-container {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          color: #000 !important;
          background: #fff !important;
          font-family: Arial, sans-serif !important;
        }
        .print-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 3px double #000;
          padding-bottom: 8px;
        }
        .print-header h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .print-header p {
          font-size: 12px;
          color: #444;
          margin: 4px 0 0 0;
        }
        .print-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 11px;
          font-weight: bold;
          border: 1px solid #000;
          padding: 6px 10px;
          background-color: #f9f9f9 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .print-table th, .print-table td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
          vertical-align: top;
        }
        .print-table th {
          background-color: #eee !important;
          font-weight: bold;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-badge {
          display: inline-block;
          font-size: 8px;
          font-weight: bold;
          padding: 1px 4px;
          border: 1px solid #000;
          border-radius: 2px;
        }
        .item-row {
          margin-bottom: 3px;
          font-weight: bold;
        }
        .item-cust {
          font-size: 8px;
          color: #444;
          font-weight: normal;
          margin-left: 6px;
          font-style: italic;
        }
      }
    `;
    document.head.appendChild(printStyle);

    const printContainer = document.createElement('div');
    printContainer.id = 'print-all-work-container';

    const todayStr = new Date().toLocaleString();
    const sortedOrders = [...orders].sort((a, b) => (parseInt(a.queue_position) || 999) - (parseInt(b.queue_position) || 999));

    const grindJobsCount = processingOrders.length;
    const preparedJobsCount = preparedOrders.length;

    let itemsHtml = '';
    sortedOrders.forEach((order, index) => {
      const itemsList = (order.items || []).map(item => {
        const custsText = item.customizations && item.customizations.length > 0
          ? ` (${item.customizations.map(c => c.option_name).join(' + ')})`
          : (item.is_cleaning == 1 && item.is_grinding == 1 ? ' (Cleaning + Grinding)' :
             item.is_cleaning == 1 ? ' (Cleaning)' :
             item.is_grinding == 1 ? ' (Grinding)' : '');
        return `<div class="item-row">• ${item.name} x ${item.quantity} ${item.unit || 'kg'}<span class="item-cust">${custsText}</span></div>`;
      }).join('');

      const orderType = order.shipping_address && !order.shipping_address.toLowerCase().includes('pickup') ? 'DELIVERY' : 'PICKUP';
      const address = order.shipping_address || 'Self Pickup / Shop';
      const driver = order.driver_name || order.deliveryPersonnel || 'Not Assigned';
      const orderWeight = order.total_weight_kg ? `${parseFloat(order.total_weight_kg).toFixed(1)} kg` : '-';
      const queuePos = order.queue_position ? `#${order.queue_position}` : '-';

      const isGrinding = (order.items || []).some(item => {
        const unit = (item.unit || '').toLowerCase().trim();
        return unit === 'kg' || unit === 'g' || unit === 'trip';
      });

      itemsHtml += `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td style="text-align: center; font-weight: bold;">#${order.id}<br/><span style="font-size: 8px; font-weight: normal;">Queue: ${queuePos}</span></td>
          <td><strong>${order.customer_name}</strong><br/>${order.customer_phone || ''}</td>
          <td>${itemsList}</td>
          <td style="text-align: center; font-weight: bold;">${orderWeight}</td>
          <td>
            <span class="print-badge" style="border-color: ${orderType === 'DELIVERY' ? '#1e40af' : '#065f46'}; color: ${orderType === 'DELIVERY' ? '#1e40af' : '#065f46'}">${orderType}</span>
            <br/><span style="font-size: 8px; margin-top: 2px; display: block;">${address}</span>
          </td>
          <td><strong>${driver}</strong></td>
          <td style="text-align: center;">
            <span class="print-badge" style="border-color: ${isGrinding ? '#d97706' : '#059669'}; color: ${isGrinding ? '#d97706' : '#059669'}">
              ${isGrinding ? 'Grinding' : 'Prepared'}
            </span>
          </td>
        </tr>
      `;
    });

    printContainer.innerHTML = `
      <div class="print-header">
        <h1>${storeName}</h1>
        <p>Today's Production & Grinding Jobs — آج کا کام کی فہرست</p>
        <p style="font-size: 10px; color: #555; margin-top: 4px;">Printed On: ${todayStr}</p>
      </div>
      <div class="print-stats">
        <div>TOTAL JOBS (کل آرڈرز): ${orders.length}</div>
        <div>GRINDING JOBS (پیسنے والے): ${grindJobsCount}</div>
        <div>PREPARED PRODUCTS (تیار مصنوعات): ${preparedJobsCount}</div>
        <div>TOTAL WEIGHT (کل وزن): ${totalWeight.toFixed(1)} kg</div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 4%; text-align: center;">S#</th>
            <th style="width: 10%; text-align: center;">Order ID</th>
            <th style="width: 18%;">Customer Details</th>
            <th style="width: 28%;">Items to Prepare</th>
            <th style="width: 8%; text-align: center;">Weight</th>
            <th style="width: 18%;">Delivery/Pickup Address</th>
            <th style="width: 14%;">Assigned Driver</th>
            <th style="width: 10%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="margin-top: 20px; border-top: 1px dashed #000; padding-top: 6px; font-size: 8px; text-align: center; color: #555;">
        End of Today's Work List • Mughal Atta Chakki Software System
      </div>
    `;

    document.body.appendChild(printContainer);
    window.print();

    setTimeout(() => {
      document.head.removeChild(printStyle);
      document.body.removeChild(printContainer);
    }, 1000);
  };

  // format ETA time nicely
  const formatETA = (eta) => {
    if (!eta) return 'Calculating...';
    const date = new Date(eta);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // get time remaining until ETA
  const getTimeRemaining = (eta) => {
    if (!eta) return null;
    const now = new Date();
    const etaDate = new Date(eta);
    const diffMs = etaDate - now;
    if (diffMs <= 0) {
      const minsOverdue = Math.floor(Math.abs(diffMs) / 60000);
      if (minsOverdue < 60) return `${minsOverdue}m overdue`;
      const hrs = Math.floor(minsOverdue / 60);
      const remainMins = minsOverdue % 60;
      return `${hrs}h ${remainMins}m overdue`;
    }
    const mins = Math.ceil(diffMs / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  // OrderCard inner component
  const OrderCard = ({ order }) => {
    const isOverdue = order.estimated_completion_time ? new Date(order.estimated_completion_time) < new Date() : false;
    const isSplitBatch = order.is_split_batch === true;
    const allSiblingsReady = order.all_siblings_ready === true;
    // If this is a split batch, Mark as Ready is only allowed when ALL siblings are ready
    const canMarkReady = !isSplitBatch || allSiblingsReady;
    const isHeavy = parseFloat(order.total_weight_kg || 0) > heavyThreshold;

    return (
    <Card className={`border-l-[6px] shadow-lg hover:shadow-xl transition-all border-t border-r border-b rounded-xl bg-white ${
      isOverdue 
        ? 'border-l-red-600 animate-glow-red relative z-10'
        : isSplitBatch
          ? 'border-l-purple-500'
          : order.is_carried_forward
            ? 'border-l-orange-500'
            : order.is_manually_overridden === '1' || order.is_manually_overridden === 1
              ? 'border-l-amber-500'
              : 'border-l-blue-600'
    }`}>
      <CardHeader className={`pb-2 rounded-t-xl mb-4 ${isOverdue ? 'bg-red-50/50' : order.is_carried_forward ? 'bg-orange-50/60' : 'bg-slate-50/50'}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              Order #{order.id}
              {isSplitBatch && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-2 py-0.5 font-bold">
                  <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                  BATCH {order.batch_index} OF {order.siblings?.length || '?'}
                </Badge>
              )}
              {order.is_carried_forward && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] px-2 py-0.5 font-bold">
                  <History className="h-3 w-3 mr-1" /> CARRIED FORWARD
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created: {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right bg-blue-50/80 px-3 py-2 rounded-lg">
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold text-slate-800">
                Rs. {parseInt((parseFloat(order.total_amount) - parseFloat(order.coupon_discount || 0))).toLocaleString()}
                {order.items.some(i => i.is_weight_pending) && <span className="text-primary text-xs ml-1">(+ TBD)</span>}
              </span>
              {parseFloat(order.coupon_discount || 0) > 0 && (
                <div className="text-xs text-emerald-600 font-medium mt-1">
                  -Rs. {parseFloat(order.coupon_discount).toLocaleString()} (Coupon: {order.coupon_code || 'N/A'})
                </div>
              )}
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <span className="text-xs font-semibold text-blue-600 uppercase">{order.paymentMethod}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                  order.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  order.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse' :
                  'bg-yellow-100 text-yellow-800 border border-yellow-300'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 
                   order.paymentStatus === 'partial' ? 'Partial' : 
                   order.paymentStatus === 'unpaid' ? 'Unpaid / Rejected' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6">
        {/* ETA & scheduling info card */}
        <div className={`p-4 rounded-lg border transition-colors ${
          isOverdue 
            ? 'bg-red-50 border-red-300' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
        }`}>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                <Timer className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">ETA</span>
              </div>
              <p className={`text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>{formatETA(order.estimated_completion_time)}</p>
              <p className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>{getTimeRemaining(order.estimated_completion_time)}</p>
            </div>
            <div className={`text-center border-x ${isOverdue ? 'border-red-200' : 'border-emerald-200'}`}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                <Weight className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Weight</span>
              </div>
              <p className={`text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>{parseFloat(order.total_weight_kg || 0).toFixed(1)} kg</p>
              <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>{order.processing_time_minutes || Math.ceil(parseFloat(order.total_weight_kg || 1) * 2)} mins</p>
            </div>
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                <Package className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">Queue</span>
              </div>
              <p className={`text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>#{order.queue_position || '-'}</p>
              <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>Position</p>
            </div>
          </div>
        </div>

        {/* ── Sibling Batch Status (only for split orders) ──────────────── */}
        {isSplitBatch && order.siblings && order.siblings.length > 0 && (
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <SplitSquareHorizontal className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800 uppercase">Split Batches Status</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.siblings.map((sib) => (
                <div
                  key={sib.id}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${
                    sib.status === 'ready'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  {sib.status === 'ready'
                    ? <CheckCircle className="h-3 w-3" />
                    : <Clock className="h-3 w-3" />}
                  Batch {sib.batch_index} #{sib.id}
                  <span className="text-[10px] opacity-70">
                    ({parseFloat(sib.total_weight_kg || 0).toFixed(1)}kg)
                  </span>
                  — {sib.assigned_date === new Date().toISOString().slice(0, 10) ? 'Today' : 'Tomorrow'}
                </div>
              ))}
            </div>
            {!allSiblingsReady && (
              <p className="mt-2 text-xs text-purple-700 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Jab tak <strong>tamam batches ready</strong> nahi hote, Final Bill lock rahega. Ap is batch ko 'Process' kar sakte hain.
              </p>
            )}
          </div>
        )}

        {/* customer info */}
        <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{order.shipping_address}</span>
          </div>
          {order.driver_name && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-slate-700">Driver: {order.driver_name}</span>
            </div>
          )}
        </div>

        {/* order items */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" /> Items to Prepare:
          </h4>
          <ul className="divide-y border rounded-md">
            {order.items.map((item, idx) => (
              <li key={idx} className="p-3 text-sm flex justify-between items-start bg-white hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-slate-800 break-words">{item.name}</p>
                  {/* Dynamic customizations display */}
                  {(item.customizations?.length > 0 || item.is_cleaning || item.is_grinding) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.customizations?.length > 0 ? (
                        item.customizations.map((cust, cIdx) => (
                          <span key={cIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ✓ {cust.option_name}
                          </span>
                        ))
                      ) : (
                        <>
                          {item.is_cleaning == 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ✓ Cleaning
                            </span>
                          )}
                          {item.is_grinding == 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              ✓ Grinding
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {item.is_weight_pending && (
                    <p className="text-[10px] font-black text-primary mt-1 flex items-center gap-1 uppercase tracking-wider">
                      <Timer className="h-3 w-3" /> Weight Pending
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="secondary" className="font-bold bg-slate-100 text-slate-700">x {item.quantity}</Badge>
                  {item.unit && <span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.unit}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* actions */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {canMarkReady ? (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 shadow-md font-medium text-[15px] disabled:opacity-70"
              onClick={() => markAsReady(order)}
              disabled={sendingBill === order.id}
            >
              {sendingBill === order.id ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating Bill...</>
              ) : (
                <><FileDown className="h-5 w-5 mr-2" /> Mark as Ready & Send Bill</>
              )}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    className="w-full shadow-md font-medium text-[15px] text-white hover:opacity-90"
                    style={{ backgroundColor: '#4f46e5' }}
                    onClick={() => markBatchProcessed(order)}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" /> Mark Batch Processed
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[220px]">
                <p>Is batch ko process karen. Final Bill aur Delivery tamam batches complete hone par hogi.</p>
                <p className="mt-1">Remaining: {(order.siblings || []).filter(s => s.status !== 'ready' && s.status !== 'batch_ready').length} batch(es) pending</p>
              </TooltipContent>
            </Tooltip>
          )}

          {isHeavy && !isSplitBatch && (
            <Button
              variant="outline"
              className="w-full border-2 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm font-medium animate-pulse"
              onClick={() => openSplitModal(order)}
            >
              <SplitSquareHorizontal className="h-4 w-4 mr-2" />
              Split Order
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full border-2 border-orange-200 text-orange-700 hover:bg-orange-50 shadow-sm font-medium"
            onClick={() => moveToTomorrow(order)}
            disabled={overriding === order.id}
          >
            {overriding === order.id ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Moving...</>
            ) : (
              <><CalendarClock className="h-4 w-4 mr-2" /> Push to Tomorrow</>
            )}
          </Button>

          {order.type === 'delivery' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={`border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium ${order.deliveryPersonnel ? 'bg-blue-50' : ''}`}>
                  <Truck className="h-4 w-4 mr-2" />
                  {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activePersonnel.length > 0 ? (
                  activePersonnel.map(person => (
                    <DropdownMenuItem key={person.id} onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                      <span>{person.name}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
                  Clear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" variant="outline" disabled className="border-slate-200 text-slate-500 opacity-60 cursor-default">
              <Package className="h-4 w-4 mr-2" />
              Self Pickup
            </Button>
          )}

          <Button variant="outline" className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium" onClick={() => handlePrint(order)}>
            <Printer className="h-5 w-5 mr-2" /> Print
          </Button>

          <Button variant="destructive" className="w-full shadow-sm font-medium px-6" onClick={() => setCancelOrder(order)}>
            <Trash2 className="h-5 w-5 mr-2 text-white" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
    );
  };

  const PreparedOrderCard = ({ order }) => {
    return (
      <Card className="border-l-[6px] shadow-lg hover:shadow-xl transition-all border-t border-r border-b rounded-xl bg-white border-l-emerald-600">
        <CardHeader className="pb-2 rounded-t-xl mb-4 bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                Order #{order.id}
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-2 py-0.5 font-bold uppercase">
                  Prepared Item
                </Badge>
              </CardTitle>
              <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Created: {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right bg-blue-50/80 px-3 py-2 rounded-lg">
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-slate-800">
                  Rs. {parseInt((parseFloat(order.total_amount) - parseFloat(order.coupon_discount || 0))).toLocaleString()}
                </span>
                {parseFloat(order.coupon_discount || 0) > 0 && (
                  <div className="text-xs text-emerald-600 font-medium mt-1">
                    -Rs. {parseFloat(order.coupon_discount).toLocaleString()} (Coupon: {order.coupon_code || 'N/A'})
                  </div>
                )}
                <div className="flex items-center gap-1.5 justify-end mt-1">
                  <span className="text-xs font-semibold text-blue-600 uppercase">{order.paymentMethod}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                    order.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    order.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse' :
                    'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  }`}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 
                     order.paymentStatus === 'partial' ? 'Partial' : 
                     order.paymentStatus === 'unpaid' ? 'Unpaid / Rejected' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-6">
          <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{order.shipping_address}</span>
            </div>
            {order.driver_name && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-slate-700">Driver: {order.driver_name}</span>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" /> Prepared Items to Deliver:
            </h4>
            <ul className="divide-y border rounded-md">
              {order.items.map((item, idx) => (
                <li key={idx} className="p-3 text-sm flex justify-between items-start bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 break-words">{item.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="secondary" className="font-bold bg-slate-100 text-slate-700">x {item.quantity}</Badge>
                    {item.unit && <span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.unit}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 shadow-md font-medium text-[15px] disabled:opacity-70"
              onClick={() => markAsReady(order)}
              disabled={sendingBill === order.id}
            >
              {sendingBill === order.id ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating Bill...</>
              ) : (
                <><FileDown className="h-5 w-5 mr-2" /> Mark as Ready & Send Bill</>
              )}
            </Button>

            {order.type === 'delivery' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className={`border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium ${order.deliveryPersonnel ? 'bg-blue-50' : ''}`}>
                    <Truck className="h-4 w-4 mr-2" />
                    {order.deliveryPersonnel ? `${order.deliveryPersonnel.slice(0, 10)}` : 'Driver'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">Assign Driver</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activePersonnel.length > 0 ? (
                    activePersonnel.map(person => (
                      <DropdownMenuItem key={person.id} onSelect={() => handleAssignPersonnel(order.id, person.name, person.phone)} className="cursor-pointer text-xs">
                        <span>{person.name}</span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="text-xs">No active staff</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAssignPersonnel(order.id, '')} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs">
                    Clear
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" variant="outline" disabled className="border-slate-200 text-slate-500 opacity-60 cursor-default">
                <Package className="h-4 w-4 mr-2" />
                Self Pickup
              </Button>
            )}

            <Button variant="outline" className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-medium" onClick={() => handlePrint(order)}>
              <Printer className="h-5 w-5 mr-2" /> Print
            </Button>

            <Button variant="destructive" className="w-full shadow-sm font-medium px-6" onClick={() => setCancelOrder(order)}>
              <Trash2 className="h-5 w-5 mr-2 text-white" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  const carriedForwardOrders = processingOrders.filter(o => o.is_carried_forward);
  const todayNewOrders = processingOrders.filter(o => !o.is_carried_forward);

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* header with quick stats */}
      <div className="rounded-xl border border-gray-100 p-6 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Processing Board
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Today's Work</h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Orders currently in production, with live capacity, driver assignment, and scheduling actions in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <Button
              onClick={handlePrintAll}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md flex items-center gap-2"
              size="lg"
            >
              <Printer className="h-5 w-5 mr-1" /> Print Today's Work List
            </Button>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {orders.length} Active Jobs
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 mt-6" style={{ gap: '1.25rem' }}>
          <div className="rounded-xl border border-gray-200/70 p-5 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-bold mb-3">Total Weight</p>
            <p className="text-2xl font-black text-gray-900">{totalWeight.toFixed(1)} kg</p>
          </div>
          <div className="rounded-xl border border-gray-200/70 p-5 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-bold mb-3">Estimated Workload</p>
            <p className="text-2xl font-black text-gray-900">{totalProcessingMinutes} mins</p>
          </div>
          <div className="rounded-xl border border-gray-200/70 p-5 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-bold mb-3">Available Drivers</p>
            <p className="text-2xl font-black text-gray-900">{activeDrivers}</p>
          </div>
        </div>
      </div>

      {/* capacity utilization bar */}
      {capacity && (
        <Card className="border-blue-200 rounded-xl" style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Today's Capacity</span>
              </div>
              <div className="text-sm text-blue-700 text-right">
                <span className="font-bold">{Math.round(capacity.booked_minutes)}</span> mins booked
                <span className="mx-2">•</span>
                <span className="font-bold text-green-700">{Math.round(capacity.remaining_minutes)} mins</span> remaining
                <span className="text-xs text-blue-500 ml-1">(from now)</span>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  capacity.percentage_used > 90 ? 'bg-red-500' : 
                  capacity.percentage_used > 70 ? 'bg-orange-500' : 
                  'bg-blue-600'
                }`}
                style={{ width: `${Math.min(capacity.percentage_used, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-blue-600">
              <span>{capacity.opening_time} (Open)</span>
              <span className="font-semibold">
                {capacity.percentage_used}% utilized
                {capacity.current_time && <span className="ml-2 text-blue-400">· Now: {capacity.current_time}</span>}
              </span>
              <span>{capacity.closing_time} (Close)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-background p-4 mb-4">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">All caught up!</h3>
            <p className="text-muted-foreground">No orders are currently in processing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* 1. Grinding & Processing Section (Today's Scheduler) */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-blue-200">
                <Timer className="h-4 w-4 text-blue-600" />
                Grinding Processing Board (Kg Items)
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-500 font-semibold">
                {processingOrders.length} grind job(s)
              </span>
            </div>

            {processingOrders.length === 0 ? (
              <Card className="bg-slate-50/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-background p-3 mb-2 shadow-sm">
                    <CheckCircle className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm font-semibold">No grinding / processing orders currently in queue.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Carried Forward Section */}
                {carriedForwardOrders.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 px-1 mt-4">
                      <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold">
                        <History className="h-3.5 w-3.5" />
                        Carried Forward
                      </div>
                      <div className="flex-1 h-px bg-orange-100" />
                      <span className="text-xs text-orange-600 font-medium">
                        {carriedForwardOrders.length} order(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {carriedForwardOrders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </>
                )}

                {/* Today's New Orders Section */}
                {todayNewOrders.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 px-1 mt-4">
                      <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Today's Grinds
                      </div>
                      <div className="flex-1 h-px bg-blue-100" />
                      <span className="text-xs text-blue-600 font-medium">
                        {todayNewOrders.length} order(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {todayNewOrders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* 2. Prepared & Ready to Deliver Section */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 px-1">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-emerald-200">
                <Package className="h-4 w-4 text-emerald-600" />
                Prepared & Ready to Deliver (Oil, Liter, Pieces, etc.)
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-emerald-600 font-semibold">
                {preparedOrders.length} order(s)
              </span>
            </div>

            {preparedOrders.length === 0 ? (
              <Card className="bg-slate-50/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-slate-500 text-sm font-semibold">No prepared orders currently waiting.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {preparedOrders.map((order) => (
                  <PreparedOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* print overlay dialog */}
      <PrintOrderDetails
        order={printOrder}
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
      />

        <Dialog open={!!cancelOrder} onOpenChange={() => { setCancelOrder(null); setCancelReason(''); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive text-base">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Cancel Order #{cancelOrder?.id}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this order? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Optional: Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <DialogFooter className="flex flex-row gap-2">
              <Button variant="outline" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300" onClick={() => { setCancelOrder(null); setCancelReason(''); }} disabled={isCancelling}>
                Keep Order
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin text-white" />Cancelling...</> : 'Yes, Cancel Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Split Order Modal ───────────────────────────────────────── */}
        <Dialog open={!!splitOrder} onOpenChange={closeSplitModal}>
        <DialogContent
          className="max-w-md p-0 gap-0 [&>button]:top-5 [&>button]:right-5"
        >
          {/* Header */}
          <div className="p-6 pb-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SplitSquareHorizontal className="h-5 w-5 text-blue-600" />
                Heavy Order Split — #{splitOrder?.id}
              </DialogTitle>
              <DialogDescription>
                Order weight: <strong>{parseFloat(splitOrder?.total_weight_kg || 0).toFixed(1)} kg</strong>.
                Split into multiple processing batches.
              </DialogDescription>
            </DialogHeader>

            {/* Warning Banner */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 mt-4">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                <strong>Note:</strong> Bill will be available only after <strong>all batches</strong> are completed.
              </p>
            </div>
          </div>

          {/* Scrollable Batches Area */}
          <div className="px-6 py-2 overflow-y-auto" style={{ maxHeight: '45vh' }}>
            <div className="space-y-3">
              {splitBatches.map((batch, idx) => (
                <div key={batch.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all hover:border-blue-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Batch Details</span>
                    </div>
                    
                    {splitBatches.length > 2 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setSplitBatches(splitBatches.filter(b => b.id !== batch.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input 
                          type="date" 
                          value={batch.date}
                          className="pl-9 h-9 bg-white text-sm"
                          onChange={(e) => {
                            const newB = [...splitBatches];
                            newB[idx].date = e.target.value;
                            setSplitBatches(newB);
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Weight (kg)</Label>
                      <div className="relative">
                        <Weight className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input 
                          type="number" 
                          min="0.1" step="0.5" 
                          value={batch.weight}
                          className="pl-9 h-9 bg-white text-sm"
                          onChange={(e) => {
                            const newB = [...splitBatches];
                            newB[idx].weight = e.target.value;
                            setSplitBatches(newB);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pb-2">
              <Button 
                variant="outline" 
                className="w-full border-dashed border-2 border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all h-10"
                onClick={() => {
                  const lastDate = new Date(splitBatches[splitBatches.length - 1].date);
                  lastDate.setDate(lastDate.getDate() + 1);
                  setSplitBatches([...splitBatches, { 
                    id: Date.now(), 
                    date: lastDate.toISOString().slice(0, 10), 
                    weight: '' 
                  }]);
                }}
              >
                <Package className="h-4 w-4 mr-2" /> Add Another Batch
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 bg-slate-50/50 border-t">
            {/* Live total check */}
            {splitOrder && (() => {
              const total = parseFloat(splitOrder.total_weight_kg || 0);
              const sum = splitBatches.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
              const diff = Math.abs(sum - total);
              const ok = diff <= 0.5;
              return total > 0 ? (
                <div className={`text-xs font-medium rounded px-3 py-2 mb-4 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {ok
                    ? `✅ Total: ${sum.toFixed(1)} kg — Valid!`
                    : `⚠️ Total: ${sum.toFixed(1)} kg (Expected ~${total} kg) — Mismatch`}
                </div>
              ) : null;
            })()}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={closeSplitModal} disabled={isSplitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSplitOrder}
                disabled={isSplitting}
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                {isSplitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Splitting...</>
                ) : (
                  <><SplitSquareHorizontal className="h-4 w-4 mr-2" /> Split Order</>
                )}
              </Button>
            </DialogFooter>
          </div>
          </DialogContent>
        </Dialog>

    </div>
    </TooltipProvider>
  );
}




