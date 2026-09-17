import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
import { CheckCircle, Clock, MapPin, Phone, User, Package, Printer, FileDown, Loader2, CalendarClock, Timer, Weight, ArrowRight, Zap, AlertTriangle, AlertCircle, History, SplitSquareHorizontal, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { downloadBillPDF } from '../../utils/billPdfUtils';
import { deductFromInventory } from '../../utils/inventoryUtils';
import { PrintSlip } from './PrintSlip';
import { sendWhatsAppMessage } from '../../utils/whatsappHelper';
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
import { WhatsAppReadyModal } from "../../components/features/admin/todaysWork/WhatsAppReadyModal";
import { CancelOrderModal } from "../../components/features/admin/todaysWork/CancelOrderModal";
import { SplitOrderModal } from "../../components/features/admin/todaysWork/SplitOrderModal";
import { PreparedOrderCard } from "../../components/features/admin/todaysWork/PreparedOrderCard";
import { OrderProcessCard } from "../../components/features/admin/todaysWork/OrderProcessCard";
import { useCancelOrder } from "../../hooks/useCancelOrder";

export function TodaysWork() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printOrder, setPrintOrder] = useState(null);
  const [sendingBill, setSendingBill] = useState(null);
  const [overriding, setOverriding] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [activePersonnel, setActivePersonnel] = useState([]);

  const {
    cancelOrder,
    setCancelOrder,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancelOrder,
  } = useCancelOrder({ onSuccess: () => fetchOrders(), cancelledBy: 'Admin' });

  const [splitOrder, setSplitOrder] = useState(null);
  const [splitBatches, setSplitBatches] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [heavyThreshold, setHeavyThreshold] = useState(15);
  const [storeName, setStoreName] = useState('Suchi Chakki');
  const [whatsappReadyModal, setWhatsappReadyModal] = useState(null);

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

  const carriedForwardOrders = processingOrders.filter(o => o.is_carried_forward);
  const todayNewOrders = processingOrders.filter(o => !o.is_carried_forward);

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
          setHeavyThreshold(parseFloat(data.settings.heavyOrderThreshold) || 15);
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
          // Use DB order_type or shipping_address keywords — 'pickup' = store pickup, 'delivery' = home delivery
          type: (order.order_type === 'pickup' || (order.shipping_address && (
            order.shipping_address.toLowerCase().includes('pickup') || 
            order.shipping_address.toLowerCase().includes('store') || 
            order.shipping_address.toLowerCase().includes('collect') || 
            order.shipping_address.toLowerCase().includes('self') || 
            order.shipping_address.toLowerCase().includes('shop')
          ))) ? 'pickup' : 'delivery',
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
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOrders();
      }
    }, 30000);
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
          const orderObj = orders.find(o => o.id === orderId);
          const isPickup = orderObj && (orderObj.type === 'pickup' || orderObj.order_type === 'pickup');

          if (isPickup) {
            toast.success(`Assigned to ${personnelName} successfully!`);
            let targetPhone = personnelPhone;
            if (!targetPhone) {
              const found = activePersonnel.find(p => p.name === personnelName);
              if (found && found.phone) targetPhone = found.phone;
            }
            if (targetPhone) {
              const message = `Assalam-o-Alaikum *${personnelName}*! 👋\n\nApko Suchi Chakki ki taraf se nayi Pickup Request assign hui hai:\n📦 *Pickup Request #${orderId}*\n\nBara-e-meherbani Delivery Portal check karein aur waqt par mukammal karein.\nShukriya!`;
              sendWhatsAppMessage(targetPhone, message);
            }
          } else {
            toast.success(`Driver ${personnelName} pre-assigned! Will be dispatched to portal once Ready.`);
          }
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
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const response = await fetch(`${API_BASE_URL}/split_order_batch.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

  // Safe external URL opener (dispatches real click to bypass browser popup blockers)
  const openWhatsAppSafely = (url) => {
    if (!url) return;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 300);
    } catch (err) {
      console.warn("Failed to trigger anchor click, fallback to window.open", err);
      window.open(url, '_blank');
    }
  };

  // whatsapp message and details generator
  const generateWhatsAppDetails = (order) => {
    if (!order) return null;
    const isDelivery = order.type !== 'pickup';
    const orderType = isDelivery ? "DELIVERY" : "PICKUP";
    
    let itemsText = "";
    const items = order.items || [];
    items.forEach(item => {
        const itemPrice = parseFloat(item.price_at_purchase) || parseFloat(item.service?.price) || parseFloat(item.price) || 0;
        const unit = item.unit || item.service?.unit || 'unit';
        const name = item.name || item.service?.name || 'Product';
        
        let customText = "";
        if (item.customizations?.length > 0) {
            customText = item.customizations.map(c => c.option_name).join(' + ');
        } else {
            const services = [];
            if (item.is_cleaning == 1) services.push('Cleaning');
            if (item.is_grinding == 1) services.push('Grinding');
            customText = services.join(' + ');
        }
        
        itemsText += `🔸 *${name}* × ${item.quantity || 1} ${unit}`;
        if (customText) {
            itemsText += ` (${customText})`;
        }
        if (itemPrice > 0) {
            itemsText += ` = Rs. ${((item.quantity || 1) * itemPrice).toLocaleString()}`;
        }
        itemsText += `\n`;
        
        // Rental details
        if (item.is_rental === 1 || item.is_rental === '1' || item.isRental) {
            itemsText += `   🗓️ _Rental: ${item.rental_days} days (${item.rental_start_date} to ${item.rental_end_date})_\n`;
            itemsText += `   💰 _Rate: Rs. ${Number(item.rental_price_per_day).toLocaleString()}/day | Deposit: Rs. ${Number(item.security_deposit).toLocaleString()}_\n`;
        }
    });

    const customerName = order.customer_name || order.customerName || order.full_name || 'Valued Customer';
    let phone = (order.customer_phone || order.phone || '').replace(/\D/g,'');
    if (phone.startsWith('0')) {
        phone = '92' + phone.substring(1);
    } else if (phone && !phone.startsWith('92')) {
        phone = '92' + phone; 
    }

    const subtotal = parseFloat(order.total_amount || order.total) || 0;
    const discount = parseFloat(order.coupon_discount || order.couponDiscount) || 0;
    const grandTotal = subtotal - discount;
    const advancePaid = parseFloat(order.amount_paid || order.advancePayment) || 0;
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
    if (isDelivery && (order.shipping_address || order.deliveryAddress)) {
        addressSection = `*DELIVERY ADDRESS:* ${order.shipping_address || order.deliveryAddress}\n`;
    }

    const message = `
*SUCHI CHAKKI* - Fresh Flour Daily 🌾
-----------------------------------
Assalam-o-Alaikum / Hello *${customerName}*! 👋
Your order is now *READY* for ${orderType}.

*ORDER DETAILS*
Order ID: #${order.id}
Status: READY

*ORDER ITEMS*
${itemsText}-----------------------------------
${priceBreakdown}
${addressSection}-----------------------------------
Thank you for your business!
Suchi Chakki — Pure & Fresh Processing
`.trim();
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}` 
      : `https://api.whatsapp.com/send?text=${encodedMessage}`;

    return {
      url: whatsappUrl,
      rawMessage: message,
      phone: phone || order.customer_phone || order.phone || '',
      customerName,
      order
    };
  };

  // mark as ready + download PDF bill + send whatsapp
  const markAsReady = async (order) => {
    setSendingBill(order.id);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ order_id: order.id, status: 'ready' })
      });
      const data = await response.json();

      if (data.success) {
        // 1. Inventory deduction (non-blocking)
        try {
          await deductFromInventory(order);
        } catch (invErr) {
          console.warn("Inventory update note:", invErr);
        }

        // 2. Sync split batch siblings
        if (order.is_split_batch && order.siblings) {
          for (const sib of order.siblings) {
            if (sib.status === 'batch_ready') {
              try {
                await fetch(`${API_BASE_URL}/update_order_status.php`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({ order_id: sib.id, status: 'ready' })
                });
              } catch(e) {
                console.error("Failed to sync sibling status", e);
              }
            }
          }
        }

        // 3. Prepare PDF Object (Use full parent order if this was a split batch)
        const billSource = (order.is_split_batch && order.parent_order) ? order.parent_order : order;
        const totalAmount = parseFloat(billSource.total_amount || billSource.total) || 0;
        const amountPaid = parseFloat(billSource.amount_paid || billSource.advancePayment) || 0;
        const pdfOrder = {
          id: String(billSource.id),
          customerName: billSource.customer_name || billSource.customerName || billSource.full_name || 'Walk-in Customer',
          phone: billSource.customer_phone || billSource.phone || '',
          total: totalAmount,
          status: 'ready',
          advancePayment: amountPaid,
          type: (billSource.type === 'pickup' || billSource.order_type === 'pickup') ? 'pickup' : 'delivery',
          deliveryAddress: billSource.shipping_address || billSource.deliveryAddress || '',
          paymentMethod: billSource.payment_method || billSource.paymentMethod || 'cash',
          paymentStatus: (amountPaid >= totalAmount && totalAmount > 0) ? 'paid' : (amountPaid > 0 ? 'partial' : 'pending'),
          couponCode: billSource.coupon_code || '',
          couponDiscount: parseFloat(billSource.coupon_discount || 0),
          createdAt: billSource.created_at || billSource.createdAt || new Date().toISOString(),
          items: (billSource.items || []).map(item => ({
            quantity: item.quantity || 1,
            isWeightPending: false,
            service: {
              name: item.name || item.service?.name || item.prod_name || 'Product',
              price: parseFloat(item.price_at_purchase || item.price || item.service?.price) || 0,
              unit: item.unit || item.service?.unit || 'kg'
            }
          }))
        };

        // 4. Generate & Download PDF Bill
        try {
          const filename = await downloadBillPDF(pdfOrder);
          toast.success(`📄 Bill PDF downloaded: ${filename}`);
        } catch (pdfErr) {
          console.warn("PDF generation warning:", pdfErr);
        }

        // 5. Update local list state
        setOrders(prev => prev.filter(o => o.id !== order.id));
        toast.success(`Order #${order.id} is marked as Ready!`);

        // 6. Generate WhatsApp message & prompt (using full billSource)
        try {
          const waDetails = generateWhatsAppDetails(billSource);
          if (waDetails && waDetails.url) {
            // direct whatsapp kholna
            openWhatsAppSafely(waDetails.url);

            // whatsapp ka modal show karna
            setWhatsappReadyModal(waDetails);

            toast.info(`📱 WhatsApp message ready for ${waDetails.customerName}`, {
              action: {
                label: 'Open WhatsApp',
                onClick: () => openWhatsAppSafely(waDetails.url)
              }
            });
          }
        } catch (waErr) {
          console.warn("WhatsApp link warning:", waErr);
        }
      } else {
        toast.error(data.message || 'Failed to update status.');
      }
    } catch (error) {
      console.error("markAsReady error:", error);
      toast.error('Error: ' + error.message);
    } finally {
      setSendingBill(null);
    }
  };

  const handlePrint = (order) => {
    const printSource = (order.is_split_batch && order.parent_order) ? order.parent_order : order;
    const totalAmount = parseFloat(printSource.total_amount || printSource.total) || 0;
    const amountPaid = parseFloat(printSource.amount_paid || printSource.advancePayment) || 0;
    
    let paymentStatus = printSource.payment_status || 'pending';
    if (paymentStatus === 'paid' || amountPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partial';
    }

    const transformedOrder = {
      id: printSource.id.toString(),
      customerName: printSource.customer_name || printSource.full_name || 'Walk-in Customer',
      phone: printSource.customer_phone || printSource.phone || '',
      total: totalAmount,
      status: printSource.status || 'ready',
      createdAt: printSource.created_at,
      paymentMethod: printSource.payment_method || 'cod',
      paymentStatus: paymentStatus,
      advancePayment: amountPaid,
      type: (printSource.type === 'pickup' || printSource.order_type === 'pickup') ? 'pickup' : 'delivery',
      source: (printSource.user_id === '1' || !printSource.user_id) ? 'manual' : 'online',
      deliveryPersonnel: printSource.driver_name || null,
      deliveryAddress: printSource.shipping_address,
      deliveryFee: parseFloat(printSource.delivery_fee || printSource.deliveryFee || printSource.shipping_cost || 0),
      cancellationReason: null,
      cancelledBy: null,
      couponCode: printSource.coupon_code || '',
      couponDiscount: parseFloat(printSource.coupon_discount || 0),
      items: printSource.items ? printSource.items.map(item => ({
        quantity: item.quantity,
        isWeightPending: false,
        price_at_purchase: item.price_at_purchase || 0,
        name: item.name || item.service?.name || item.prod_name,
        service: { name: item.name || item.service?.name || item.prod_name, price: item.price_at_purchase || 0 }
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

      const orderType = order.type === 'pickup' ? 'PICKUP' : 'DELIVERY';
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
        End of Today's Work List • Suchi Chakki Software System
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

  return (
    <TooltipProvider>
    <div className="space-y-4 sm:space-y-6">
      {/* header with quick stats */}
      <div className="rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-2 sm:mb-3">
              {t('Processing Board')}
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900">{t("Today's Work")}</h1>
            <p className="text-xs sm:text-base text-slate-600 mt-1 sm:mt-2 max-w-2xl">
              {t('Orders currently in production, with live capacity, driver assignment, and scheduling actions in one place.')}
            </p>
          </div>
          <div className="flex items-stretch gap-2 self-stretch lg:self-auto sm:items-center sm:flex-wrap">
            <Button
              onClick={handlePrintAll}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md flex items-center justify-center gap-2 flex-1 sm:flex-none h-11 rounded-lg"
            >
              <Printer className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" />
              <span className="hidden sm:inline">{t("Print Today's Work List")}</span>
              <span className="sm:hidden">{t('Print List')}</span>
            </Button>
            <div className="flex-1 sm:flex-none h-11 sm:h-auto rounded-lg sm:rounded-full bg-secondary text-secondary-foreground text-sm sm:text-lg font-semibold flex items-center justify-center px-3 sm:px-4 sm:py-2 border border-border sm:border-0">
              {orders.length} {t('Active Jobs')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-3 mt-4 sm:mt-6 gap-2 sm:gap-5">
          <div className="rounded-xl border border-gray-200/70 p-3 sm:p-5 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
            <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] text-gray-500 font-bold mb-1 sm:mb-3">Total Weight</p>
            <p className="text-base sm:text-2xl font-black text-gray-900">{totalWeight.toFixed(1)} kg</p>
          </div>
          <div className="rounded-xl border border-gray-200/70 p-3 sm:p-5 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
            <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] text-gray-500 font-bold mb-1 sm:mb-3">Workload</p>
            <p className="text-base sm:text-2xl font-black text-gray-900">{totalProcessingMinutes} mins</p>
          </div>
          <div className="rounded-xl border border-gray-200/70 p-3 sm:p-5 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
            <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] text-gray-500 font-bold mb-1 sm:mb-3">Drivers</p>
            <p className="text-base sm:text-2xl font-black text-gray-900">{activeDrivers}</p>
          </div>
        </div>
      </div>

      {/* capacity utilization bar */}
      {capacity && (
        <Card className="border-blue-200 rounded-xl" style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)' }}>
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                <span className="font-semibold text-blue-900 text-sm sm:text-base">Today's Capacity</span>
              </div>
              <div className="text-[11px] sm:text-sm text-blue-700 sm:text-right">
                <span className="font-bold">{Math.round(capacity.booked_minutes)}</span> mins booked
                <span className="mx-1.5 sm:mx-2">•</span>
                <span className="font-bold text-green-700">{Math.round(capacity.remaining_minutes)} mins</span> remaining
                <span className="text-[10px] sm:text-xs text-blue-500 ml-1">(from now)</span>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  capacity.percentage_used > 90 ? 'bg-red-500' :
                  capacity.percentage_used > 70 ? 'bg-orange-500' :
                  'bg-blue-600'
                }`}
                style={{ width: `${Math.min(capacity.percentage_used, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] sm:text-xs text-blue-600 gap-1">
              <span className="truncate">{capacity.opening_time} <span className="hidden sm:inline">(Open)</span></span>
              <span className="font-semibold text-center shrink-0">
                {capacity.percentage_used}% utilized
                {capacity.current_time && <span className="ml-2 text-blue-400 hidden sm:inline">· Now: {capacity.current_time}</span>}
              </span>
              <span className="truncate text-right">{capacity.closing_time} <span className="hidden sm:inline">(Close)</span></span>
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
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-1">
              <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm border border-blue-200 self-start">
                <Timer className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">Grinding Processing Board (Kg Items)</span>
                <span className="sm:hidden">Grinding Board</span>
              </div>
              <div className="hidden sm:block flex-1 h-px bg-slate-200" />
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">
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
                        <OrderProcessCard key={order.id} order={order} heavyThreshold={heavyThreshold} formatETA={formatETA} getTimeRemaining={getTimeRemaining} markAsReady={markAsReady} markBatchProcessed={markBatchProcessed} sendingBill={sendingBill} openSplitModal={openSplitModal} moveToTomorrow={moveToTomorrow} overriding={overriding} activePersonnel={activePersonnel} handleAssignPersonnel={handleAssignPersonnel} handlePrint={handlePrint} setCancelOrder={setCancelOrder} />
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
                        <OrderProcessCard key={order.id} order={order} heavyThreshold={heavyThreshold} formatETA={formatETA} getTimeRemaining={getTimeRemaining} markAsReady={markAsReady} markBatchProcessed={markBatchProcessed} sendingBill={sendingBill} openSplitModal={openSplitModal} moveToTomorrow={moveToTomorrow} overriding={overriding} activePersonnel={activePersonnel} handleAssignPersonnel={handleAssignPersonnel} handlePrint={handlePrint} setCancelOrder={setCancelOrder} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* 2. Prepared & Ready to Deliver Section */}
          <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-1">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm border border-emerald-200 self-start">
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Prepared & Ready to Deliver (Oil, Liter, Pieces, etc.)</span>
                <span className="sm:hidden">Ready to Deliver</span>
              </div>
              <div className="hidden sm:block flex-1 h-px bg-slate-200" />
              <span className="text-[11px] sm:text-xs text-emerald-600 font-semibold">
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
                  <PreparedOrderCard key={order.id} order={order} sendingBill={sendingBill} markAsReady={markAsReady} activePersonnel={activePersonnel} handleAssignPersonnel={handleAssignPersonnel} handlePrint={handlePrint} setCancelOrder={setCancelOrder} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* print overlay dialog */}
      <PrintSlip
        order={printOrder}
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
      />

        <CancelOrderModal cancelOrder={cancelOrder} setCancelOrder={setCancelOrder} cancelReason={cancelReason} setCancelReason={setCancelReason} handleCancelOrder={handleCancelOrder} isCancelling={isCancelling} />

      <SplitOrderModal splitOrder={splitOrder} closeSplitModal={closeSplitModal} splitBatches={splitBatches} setSplitBatches={setSplitBatches} handleSplitOrder={handleSplitOrder} isSplitting={isSplitting} />

      <WhatsAppReadyModal whatsappReadyModal={whatsappReadyModal} setWhatsappReadyModal={setWhatsappReadyModal} openWhatsAppSafely={openWhatsAppSafely} />
    </div>
    </TooltipProvider>
  );
}
