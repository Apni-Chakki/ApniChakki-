import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Phone, Navigation, CheckCircle, Package, LogOut, Wheat, Clock, Truck, Radio, MessageCircle, Link2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/button';
import { Card } from '../../components/common/card';
import { Badge } from '../../components/common/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/common/dialog';
import { useAuth } from '../../store/AuthContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API_BASE_URL, SOCKET_URL } from '../../config';
import { io } from 'socket.io-client';
import { Pagination } from '../../components/common/Pagination';

export function DeliveryPanel() {
  const [orders, setOrders] = useState([]);
  const [activeTracking, setActiveTracking] = useState({}); // { [orderId]: watchId }
  const [trackingLinks, setTrackingLinks] = useState({}); // { [orderId]: { url, whatsapp_url } }
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const trackingIntervals = useRef({}); // { [orderId]: intervalId }
  const socketRef = useRef(null);
  const socketEnabled = import.meta.env.VITE_ENABLE_SOCKET === 'true' && !!SOCKET_URL;
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  
  // Confirmation Dialog States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDesc, setConfirmDesc] = useState('');

  const getCurrentPositionSafe = useCallback((options = {}) => {
    if (!navigator.geolocation) return Promise.resolve(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          ...options,
        }
      );
    });
  }, []);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!socketEnabled) {
      socketRef.current = null;
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      timeout: 8000,
    });

    socket.on('connect', () => {
      console.log('🔌 Driver socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.warn('Driver socket unavailable, continuing without realtime updates:', error.message);
      socket.disconnect();
    });

    socket.on('disconnect', () => {
      console.log('❌ Driver socket disconnected');
    });

    socketRef.current = socket;

    return () => {
      if (socket) socket.disconnect();
    };
  }, [socketEnabled]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (user) {
      loadOrders();
      const interval = setInterval(loadOrders, 5000); // Check every 5s
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, pageSize]);

  // Cleanup all tracking on unmount
  useEffect(() => {
    return () => {
      Object.values(trackingIntervals.current).forEach(clearInterval);
      Object.values(activeTracking).forEach(watchId => {
        if (navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
        }
      });
    };
  }, []);

  // Fetch from Database
  const loadOrders = async () => {
    try {
      const driverPhone = user?.phone || user?.username;
      if (!driverPhone) return;

      // Fetch delivery orders specifically for this driver from DB
      const params = new URLSearchParams({
        driver_phone: driverPhone,
        page: String(page),
        limit: String(pageSize),
      });
      const response = await fetch(`${API_BASE_URL}/get_delivery_orders.php?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTotalItems(data.total || 0);
        // Map them to match the UI props
        const mappedOrders = data.orders.map(order => ({
          ...order,
          customerName: order.customer_name,
          phone: order.customer_phone,
          deliveryAddress: order.shipping_address,
          total: parseFloat(order.total_amount || 0),
          paymentStatus: order.payment_status || 'pending',
          advancePayment: parseFloat(order.amount_paid || 0),
          couponDiscount: parseFloat(order.coupon_discount || 0),
          items: order.items || [],
          // order_type: 'pickup' = customer collects from store themselves
          // order_type: 'delivery' = driver delivers to customer
          orderType: order.order_type || 'delivery'
        }));

        // Sort: Out for delivery -> Ready -> Coming for Pickup -> Pickup Assigned -> Processing/Pending
        const sortedOrders = mappedOrders.sort((a, b) => {
          const statusOrder = { 'out-for-delivery': 1, 'coming_for_pickup': 2, 'ready': 3, 'pickup_assigned': 4, 'processing': 5, 'pending': 6 };
          return (statusOrder[a.status] || 10) - (statusOrder[b.status] || 10);
        });
        
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error("Error loading delivery orders:", error);
    }
  };

  // Send GPS coordinates to backend + Socket.io
  const sendLocationToServer = useCallback(async (orderId, position) => {
    try {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;
      
      // 1. Send to PHP backend (database storage)
      await fetch(`${API_BASE_URL}/update_driver_location.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          driver_name: user?.name || 'Unknown',
          driver_phone: user?.phone || user?.username || null,
          latitude,
          longitude,
          accuracy: accuracy || 0,
          speed: speed || null,
          heading: heading || null,
          status: 'in_transit'
        })
      });

      // 2. Emit via Socket.io for real-time customer updates
      if (socketRef.current?.connected) {
        socketRef.current.emit('driver:location_update', {
          order_id: orderId,
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          accuracy: accuracy || 0,
          driver_name: user?.name || 'Unknown'
        });
      }
    } catch (e) {
      console.warn('Failed to send location update:', e);
    }
  }, [user]);

  // Start GPS tracking for an order
  const startGpsTracking = useCallback((orderId) => {
    if (!navigator.geolocation) {
      toast.error(t('GPS not supported on this device'));
      return;
    }

    // Use watchPosition for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocationToServer(orderId, position);
      },
      (error) => {
        if (error?.code && error.code !== 3) {
          console.warn('GPS tracking error:', error.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    setActiveTracking(prev => ({ ...prev, [orderId]: watchId }));

    // Also send location via interval as backup (every 8 seconds)
    const intervalId = setInterval(() => {
      getCurrentPositionSafe({ timeout: 8000, maximumAge: 3000 })
        .then((position) => {
          if (position) sendLocationToServer(orderId, position);
        });
    }, 8000);

    trackingIntervals.current[orderId] = intervalId;
  }, [sendLocationToServer, t, getCurrentPositionSafe]);

  // Stop GPS tracking for an order
  const stopGpsTracking = useCallback((orderId) => {
    // Clear watchPosition
    if (activeTracking[orderId]) {
      navigator.geolocation.clearWatch(activeTracking[orderId]);
      setActiveTracking(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }

    // Clear interval
    if (trackingIntervals.current[orderId]) {
      clearInterval(trackingIntervals.current[orderId]);
      delete trackingIntervals.current[orderId];
    }
  }, [activeTracking]);

  // Generate tracking link via API
  const generateTrackingLink = useCallback(async (order) => {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${API_BASE_URL}/generate_tracking_link.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          driver_name: user?.name || 'Driver',
          driver_phone: user?.phone || user?.username || null,
          base_url: baseUrl
        })
      });
      const data = await response.json();
      if (data.success) {
        setTrackingLinks(prev => ({
          ...prev,
          [order.id]: {
            url: data.tracking_url,
            whatsapp_url: data.whatsapp_url,
            token: data.token
          }
        }));
        return data;
      }
    } catch(e) {
      console.warn('Failed to generate tracking link:', e);
    }
    return null;
  }, [user]);

  // Helper to generate clean WhatsApp message link (without tracking link)
  const generateWhatsAppLink = useCallback((order) => {
    const customerPhone = order.phone || order.customer_phone || '';
    let formattedPhone = customerPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('92')) {
      formattedPhone = '92' + formattedPhone;
    }

    let itemsText = "";
    if (order.items && order.items.length > 0) {
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
            itemsText += `   📅 _Rental: ${item.rental_days} days (${item.rental_start_date} to ${item.rental_end_date})_\n`;
            itemsText += `   💰 _Rate: Rs. ${Number(item.rental_price_per_day).toLocaleString()}/day | Deposit: Rs. ${Number(item.security_deposit).toLocaleString()}_\n`;
        }
      });
    }

    const subtotal = parseFloat(order.total_amount || order.total) || 0;
    const discount = parseFloat(order.coupon_discount || order.couponDiscount) || 0;
    const grandTotal = subtotal - discount;
    const advancePaid = parseFloat(order.amount_paid || order.advancePayment) || 0;
    const remainingDue = grandTotal - advancePaid;

    let priceBreakdown = `💰 *Subtotal:* Rs. ${subtotal.toLocaleString()}\n`;
    if (discount > 0) {
        priceBreakdown += `🏷️ *Discount:* -Rs. ${discount.toLocaleString()}\n`;
        priceBreakdown += `💰 *Grand Total:* Rs. ${grandTotal.toLocaleString()}\n`;
    }
    if (advancePaid > 0) {
        priceBreakdown += `✅ *Advance Paid:* Rs. ${advancePaid.toLocaleString()}\n`;
    }
    priceBreakdown += `❗ *Remaining Due:* Rs. ${remainingDue.toLocaleString()}`;

    const isPickupReq = ['pickup_assigned', 'coming_for_pickup'].includes(order.status) || order.total === 0;

    const message = encodeURIComponent(
      `🌟 *Suchi Chakki — Order On The Way!* 🌟\n\n` +
      `Assalam-o-Alaikum! Your order *#${order.id}* has been dispatched and is on its way. 🚚💨\n\n` +
      `📦 *ORDER DETAILS:*\n` +
      `${itemsText}\n` +
      `-----------------------------------\n` +
      `${isPickupReq ? `❗ *Amount:* TBD (Pickup Request)\n` : `${priceBreakdown}\n`}` +
      `🚚 *Delivery Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n` +
      `🧑‍💼 *Rider:* ${user?.name || 'Suchi Chakki Driver'}\n\n` +
      `Please keep your phone nearby so our rider can reach you easily.\n\n` +
      `Thank you for choosing Suchi Chakki! JazakAllah! 🙏🌾`
    );

    return `https://wa.me/${formattedPhone}?text=${message}`;
  }, [user]);

  // Central helper: Send clean WhatsApp Customer update
  const shareLocationViaWhatsApp = useCallback(async (order) => {
    const customerPhone = order.phone || order.customer_phone;
    if (!customerPhone) {
      toast.warning('⚠️ Customer ka phone number available nahi. WhatsApp message nahi bheja ja sakta.');
      return;
    }

    // Format phone number for WhatsApp (Pakistan format)
    const rawPhone = customerPhone.replace(/\D/g, '');
    let formattedPhone = rawPhone;
    if (rawPhone.startsWith('0')) {
      formattedPhone = '92' + rawPhone.substring(1);
    } else if (!rawPhone.startsWith('92')) {
      formattedPhone = '92' + rawPhone;
    }

    // Build order items summary
    let itemsText = '';
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const unit = item.unit || item.service?.unit || 'unit';
        const name = item.name || item.service?.name || '';
        const qty = item.quantity || 1;
        itemsText += `🔸 *${name}* × ${qty} ${unit}\n`;
      });
    }

    // Payment summary
    const subtotal = parseFloat(order.total_amount || order.total) || 0;
    const discount = parseFloat(order.coupon_discount || order.couponDiscount) || 0;
    const grandTotal = subtotal - discount;
    const advancePaid = parseFloat(order.amount_paid || order.advancePayment) || 0;
    const remaining = grandTotal - advancePaid;
    const isPickup = ['pickup_assigned', 'coming_for_pickup'].includes(order.status) || order.total === 0;

    const message = encodeURIComponent(
      `🚚 *Suchi Chakki — Rider On The Way!* 🚚\n\n` +
      `Assalam-o-Alaikum *${order.customerName || 'Customer'}*! 👋\n\n` +
      `Aapka order *#${order.id}* dispatch ho gaya hai aur rider aapki taraf aa raha hai. 🛵💨\n\n` +
      `📦 *Order Summary:*\n${itemsText}\n` +
      (isPickup
        ? `💰 *Amount:* TBD (Pickup Request)\n`
        : `💰 *Total:* Rs. ${grandTotal.toLocaleString()}\n` +
          (advancePaid > 0 ? `✅ *Advance Paid:* Rs. ${advancePaid.toLocaleString()}\n` : '') +
          `❗ *Remaining Due:* Rs. ${remaining.toLocaleString()}\n`) +
      `\n📍 *Delivery Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n` +
      `🧑‍💼 *Rider:* ${user?.name || 'Suchi Chakki Driver'}\n\n` +
      `Apna phone paas rakhein taake rider aap tak asaani se pahunch sake.\n\n` +
      `Shukriya! JazakAllah! 🙏🌾`
    );

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

    toast.dismiss();
    setTimeout(() => window.open(whatsappUrl, '_blank'), 300);
    toast.success('✅ WhatsApp khul gaya! Customer ko details bhej di gayi hain.');
  }, [user]);

  // Update Status to Out-For-Delivery + Start Tracking
  const handleStartDelivery = async (order) => {
    try {
      // 1. Get GPS position
      toast.loading('📡 Getting your location...', { id: 'start-delivery' });
      let initialLat = null, initialLng = null;
      const position = await getCurrentPositionSafe({ timeout: 15000, maximumAge: 0 });
      toast.dismiss('start-delivery');

      if (position) {
        initialLat = position.coords.latitude;
        initialLng = position.coords.longitude;

        // Send the initial "started" ping to server
        await fetch(`${API_BASE_URL}/update_driver_location.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            driver_name: user?.name || 'Unknown',
            driver_phone: user?.phone || user?.username || null,
            latitude: initialLat,
            longitude: initialLng,
            accuracy: position.coords.accuracy || 0,
            status: 'started'
          })
        });
      }

      // 2. Update order status to out-for-delivery
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'out-for-delivery' })
      });
      const result = await response.json();
      
      if (result.success) {
        // 3. Assign driver in DB
        await fetch(`${API_BASE_URL}/assign_driver.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, driver_name: user.name })
        });
        
        // 4. Start continuous GPS tracking
        startGpsTracking(order.id);
        toast.success('🚚 Delivery started! GPS tracking active.');

        // 5. Send order update to customer via WhatsApp
        await shareLocationViaWhatsApp(order);

        loadOrders();
      } else {
        toast.error('Failed to start delivery');
      }
    } catch (error) {
      toast.dismiss('start-delivery');
      toast.error('Network error starting delivery');
      console.error('Start delivery error:', error);
    }
  };

  // Update Status to Completed + Stop Tracking
  const handleCompleteDelivery = async (order) => {
    const execute = async () => {
      try {
        // Send final "completed" GPS ping
        try {
          const position = await getCurrentPositionSafe({ timeout: 5000, maximumAge: 0 });
          if (!position) throw new Error('No GPS fix');
          await fetch(`${API_BASE_URL}/update_driver_location.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: order.id,
              driver_name: user?.name || 'Unknown',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              status: 'completed'
            })
          });
        } catch(e) { /* GPS final ping failed, not critical */ }

        // Emit delivery completed via Socket.io
        if (socketRef.current?.connected) {
          socketRef.current.emit('driver:delivery_completed', {
            order_id: order.id,
            driver_name: user?.name || 'Unknown'
          });
        }

        // Stop GPS tracking
        stopGpsTracking(order.id);

        const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, status: 'completed' })
        });
        const result = await response.json();

        if (result.success) {
          const isPickupReq = ['pickup_assigned', 'coming_for_pickup'].includes(order.status) || order.total === 0;
          const displayTotal = isPickupReq ? 'TBD' : `Rs. ${order.total?.toLocaleString()}`;
          
          // Rich success toast
          toast.success(
            `🎉 Order #${order.id} Delivered!\n` +
            `Customer: ${order.customerName}\n` +
            `Amount: ${displayTotal}`,
            { duration: 5000 }
          );

          if (order.phone) {
            const customerPhone = (order.phone || '').replace(/\D/g, '');
            let formattedPhone = customerPhone.startsWith('0') 
              ? '92' + customerPhone.substring(1) 
              : customerPhone.startsWith('92') ? customerPhone : '92' + customerPhone;

            let itemsText = "";
            if (order.items && order.items.length > 0) {
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
                
                if (item.is_rental === 1 || item.is_rental === '1' || item.isRental) {
                    itemsText += `   🗓️ _Rental: ${item.rental_days} days (${item.rental_start_date} to ${item.rental_end_date})_\n`;
                    itemsText += `   💰 _Rate: Rs. ${Number(item.rental_price_per_day).toLocaleString()}/day | Deposit: Rs. ${Number(item.security_deposit).toLocaleString()}_\n`;
                }
              });
            }

            const subtotal = parseFloat(order.total_amount || order.total) || 0;
            const discount = parseFloat(order.coupon_discount || order.couponDiscount) || 0;
            const grandTotal = subtotal - discount;
            const advancePaid = parseFloat(order.amount_paid || order.advancePayment) || 0;
            const remainingDue = grandTotal - advancePaid;

            let paymentMessage = "";
            if (isPickupReq) {
              paymentMessage = `📦 *Amount Collected:* TBD (Pickup Request)`;
            } else {
              paymentMessage = `💰 *Total Amount:* Rs. ${grandTotal.toLocaleString()}\n`;
              if (advancePaid > 0) {
                paymentMessage += `✅ *Advance Paid:* Rs. ${advancePaid.toLocaleString()}\n`;
              }
              if (order.paymentStatus === 'paid' || order.payment_status === 'paid') {
                paymentMessage += `💳 *Payment Status:* PAID (Rs. 0 collected by driver)`;
              } else {
                paymentMessage += `💵 *Remaining Balance Collected:* Rs. ${remainingDue.toLocaleString()}`;
              }
            }

            const deliveredMsg = encodeURIComponent(
              `✅ *Suchi Chakki — Order Delivered Successfully!* ✅\n\n` +
              `Assalam-o-Alaikum! Your order *#${order.id}* has been successfully delivered to you. 🎉\n\n` +
              `📦 *DELIVERED ITEMS:*\n` +
              `${itemsText}\n` +
              `-----------------------------------\n` +
              `${paymentMessage}\n` +
              `🚚 *Delivery Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n` +
              `🧑‍💼 *Delivered By:* ${user?.name || 'Suchi Chakki Driver'}\n\n` +
              `We hope you are satisfied with our pure and fresh products. 🌾\n` +
              `If you have any feedback or queries, please feel free to reach out to us.\n\n` +
              `Thank you for trusting Suchi Chakki! JazakAllah! ⭐🙏`
            );

            setTimeout(() => {
              window.open(`https://wa.me/${formattedPhone}?text=${deliveredMsg}`, '_blank');
            }, 1500);
          }

          loadOrders();
        } else {
          toast.error('Failed to complete delivery');
        }
      } catch (error) {
        toast.error('Network error completing delivery');
      }
    };

    openCompleteConfirm(order, execute);
  };

  const openMaps = useCallback((address) => {
    if (!address) return;
    const gpsMatch = String(address).match(/\[?GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]?/i) || String(address).match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (gpsMatch) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${gpsMatch[1]},${gpsMatch[2]}`, '_blank');
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  }, []);

  const openCompleteConfirm = (order, execute) => {
    setConfirmTitle(t('Confirm Delivery'));
    setConfirmDesc(`${t('Mark order')} #${order.id} ${t('for')} ${order.customerName} ${t('as delivered')}?`);
    setConfirmAction(() => () => execute());
    setConfirmOpen(true);
  };

  const handleLogout = () => {
    Object.keys(activeTracking).forEach(orderId => stopGpsTracking(orderId));
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border";
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className={`${base} font-semibold bg-amber-50 border-amber-200 text-amber-700`}>
            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            {t('Pending')}
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className={`${base} font-semibold bg-blue-50 border-blue-200 text-blue-700`}>
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-blue-700" />
            {t('Processing')}
          </Badge>
        );
      case 'ready':
        return (
          <Badge variant="outline" className={`${base} font-bold bg-emerald-50 border-emerald-200 text-emerald-700`}>
            <Package className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            {t('Ready for Pickup')}
          </Badge>
        );
      case 'out-for-delivery':
        return (
          <Badge variant="outline" className={`${base} font-bold animate-pulse bg-indigo-100 border-indigo-200 text-indigo-700`}>
            <Truck className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
            {t('Out for Delivery')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className={`${base} font-semibold bg-teal-50 border-teal-200 text-teal-700`}>
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-teal-700" />
            {t('Completed')}
          </Badge>
        );
      case 'pickup_assigned':
        return (
          <Badge variant="outline" className={`${base} font-bold bg-orange-50 border-orange-100 text-orange-600`}>
            <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-600" />
            {t('Pickup Assigned')}
          </Badge>
        );
      case 'coming_for_pickup':
        return (
          <Badge variant="outline" className={`${base} font-bold animate-pulse bg-cyan-50 border-cyan-100 text-cyan-600`}>
            <Truck className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
            {t('Coming for Pickup')}
          </Badge>
        );
      case 'arrived_at_shop':
        return (
          <Badge variant="outline" className={`${base} font-bold bg-violet-50 border-violet-200 text-violet-700`}>
            <Wheat className="h-3.5 w-3.5 shrink-0 text-violet-700" />
            {t('Arrived at Shop')}
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">{status}</Badge>;
    }
  };

  const handleComingForPickup = async (order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'coming_for_pickup' })
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Status updated to Coming for Pickup! GPS tracking started.');
        
        // Start GPS tracking for live driver location
        startGpsTracking(order.id);

        const cPhone = result.customer_phone || order.phone;
        const cName = result.customer_name || order.customerName;
        
        if (cPhone) {
          const customerPhone = cPhone.replace(/\D/g, '');
          let formattedPhone = customerPhone.startsWith('0') 
            ? '92' + customerPhone.substring(1) 
            : customerPhone.startsWith('92') ? customerPhone : '92' + customerPhone;

          let itemsText = "";
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
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
              itemsText += `\n`;
            });
          }

          const msg = encodeURIComponent(
            `🚚 *Suchi Chakki — Pickup Update* 🚚\n\n` +
            `Assalam-o-Alaikum ${cName || 'Customer'}!\n\n` +
            `Our rider *${user?.name || 'Suchi Chakki Rider'}* is currently on the way to your location to pick up your items. 🛵💨\n\n` +
            `📦 *ITEMS TO BE PICKED UP:*\n` +
            `${itemsText}\n` +
            `📍 *Pickup Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n\n` +
            `Please keep your items ready. If you have any specific instructions, feel free to let us know.\n\n` +
            `JazakAllah! 🙏🌾`
          );
          const whatsappUrl = `https://wa.me/${formattedPhone}?text=${msg}`;
          
          setTimeout(() => window.open(whatsappUrl, '_blank'), 800);
        }
        
        loadOrders();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleArrivedAtShopForPickup = async (order) => {
    const execute = async () => {
      try {
        // Stop active GPS location tracking
        stopGpsTracking(order.id);

        const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, status: 'arrived_at_shop' })
        });
        const result = await response.json();
        if (result.success) {
          loadOrders();
        } else {
          toast.error('Failed to update status');
        }
      } catch (error) {
        toast.error('Network error');
      }
    };

    setConfirmTitle(t('Confirm Arrival'));
    setConfirmDesc(`${t('Mark order')} #${order.id} ${t('as Arrived at Shop (Pickup Complete)')}?`);
    setConfirmAction(() => () => execute());
    setConfirmOpen(true);
  };

  const handleImComing = async (order) => {
    try {
      // 1. Notify backend database
      const pos = await getCurrentPositionSafe({ timeout: 8000, maximumAge: 3000 });
      const payload = {
        order_id: order.id,
        driver_name: user?.name || 'Driver',
        driver_phone: user?.phone || user?.username || null,
        message: "I'm coming",
      };
      
      let initialLat = null, initialLng = null;
      if (pos) {
        payload.lat = pos.coords.latitude;
        payload.lng = pos.coords.longitude;
        initialLat = pos.coords.latitude;
        initialLng = pos.coords.longitude;
      }

      const res = await fetch(`${API_BASE_URL}/driver_notify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Customer notified!');
      } else {
        console.warn('Notification failed, but will proceed to open WhatsApp');
      }

      // 2. Start tracking if not already active
      if (!activeTracking[order.id]) {
        startGpsTracking(order.id);
      }

      // 3. Send WhatsApp update (without tracking link)
      await shareLocationViaWhatsApp(order);
    } catch (e) {
      console.error('Im coming error', e);
      toast.error('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wheat className="h-6 w-6" />
              <h1 className="text-xl font-bold">{t("GristMill's Delivery")}</h1>
            </div>
            <p className="text-xs text-primary-foreground/80 mt-1">
              {user?.name && `Driver: ${user.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle className="text-primary-foreground hover:bg-primary-foreground/20 border-white/20" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {totalItems === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t('No Deliveries Available')}</h2>
            <p className="text-muted-foreground">
              You have no active deliveries or assigned tasks at the moment.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              // isStorePickup = customer comes to shop themselves (no driver needed)
              const isStorePickup = order.orderType === 'pickup';
              const isPickupRequest = ['pickup_assigned', 'coming_for_pickup', 'arrived_at_shop'].includes(order.status) || order.total === 0;
              const isActionable = ['pending', 'processing', 'ready', 'out-for-delivery', 'pickup_assigned', 'coming_for_pickup', 'arrived_at_shop'].includes(order.status);
              const isTracking = !!activeTracking[order.id];
              
              return (
                <Card 
                  key={order.id} 
                  className={`p-6 relative overflow-hidden transition-all duration-300 border border-slate-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-4 ${
                    !isActionable
                      ? 'opacity-70 bg-gray-50'
                      : 'bg-white'
                  }`}
                >
                  {/* Left accent color strip */}
                  {isActionable && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${
                        isStorePickup
                          ? 'from-green-500 to-green-600'   // green = store pickup
                          : isPickupRequest
                            ? 'from-amber-400 to-orange-500' // orange = driver pickup
                            : 'from-blue-500 to-indigo-600'  // blue = delivery
                      }`}
                    />
                  )}

                  <div className="flex flex-col gap-4">
                    {/* Order Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                            #{order.id}
                          </span>
                          {getStatusBadge(order.status)}
                          {isTracking && (
                            <Badge className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider animate-pulse border-none bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                              <Radio className="h-3 w-3 text-white" />
                              LIVE
                            </Badge>
                          )}
                        </div>

                        {/* Customer Avatar & Name */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="rounded-full flex items-center justify-center font-bold text-sm shrink-0 border w-10 h-10 min-w-10 min-h-10 bg-gradient-to-br from-slate-50 to-slate-200 border-slate-300 text-slate-600">
                            {order.customerName ? order.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h3 className="font-bold text-base leading-tight m-0 text-slate-800">
                              {order.customerName}
                            </h3>
                            <p className="text-[11px] font-bold leading-none mt-1 uppercase tracking-wider text-slate-400">
                              {t('Customer')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1 text-slate-400">
                            {isPickupRequest ? t('Pickup Request') : t('Total Amount')}
                          </span>
                          <p className="text-xl font-extrabold leading-none m-0 text-slate-900">
                            {isPickupRequest ? 'TBD' : `Rs. ${order.total.toLocaleString()}`}
                          </p>
                        </div>
                        {(() => {
                          if (isPickupRequest) return null;
                          const totalAmt = parseFloat(order.total || order.total_amount || 0);
                          const advPaid = parseFloat(order.advancePayment || order.amount_paid || 0);
                          const remDue = Math.max(0, totalAmt - advPaid);
                          const isPaid = (order.paymentStatus === 'paid' || order.payment_status === 'paid' || (totalAmt > 0 && advPaid >= totalAmt));

                          if (isPaid) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700"
                              >
                                {t('Paid Online')}
                              </Badge>
                            );
                          }

                          if (advPaid > 0 && remDue > 0) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700"
                              >
                                {t('Collect')}: Rs. {remDue.toLocaleString()} ({t('Adv')}: Rs. {advPaid.toLocaleString()})
                              </Badge>
                            );
                          }

                          return (
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700"
                            >
                              {t('Collect Cash')}: Rs. {remDue > 0 ? remDue.toLocaleString() : totalAmt.toLocaleString()}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Address Block */}
                    <div className="flex p-4 rounded-xl border items-center justify-between gap-3 bg-stone-50 border-stone-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="rounded-full border flex items-center justify-center shrink-0 w-10 h-10 min-w-10 min-h-10 bg-red-100 border-red-300">
                          <MapPin className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                            {t('Delivery Address')}
                          </span>
                          <p className="text-sm font-semibold leading-snug break-words m-0 text-slate-700">
                            {order.deliveryAddress || t('No address provided')}
                          </p>
                        </div>
                      </div>

                      {isActionable && (
                        <div className="flex items-center gap-2 shrink-0 ml-1">
                          <button
                            className="rounded-full bg-white border flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer w-9 h-9 min-w-9 min-h-9 border-slate-200 text-blue-600 p-0"
                            onClick={() => openMaps(order.deliveryAddress || '')}
                            title={t('Navigate')}
                          >
                            <Navigation className="h-4.5 w-4.5 text-blue-600" />
                          </button>
                          {order.phone && (
                            <button
                              className="rounded-full bg-white border flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer w-9 h-9 min-w-9 min-h-9 border-slate-200 text-slate-600 p-0"
                              onClick={() => window.open(`tel:${order.phone}`, '_self')}
                              title={t('Call Customer')}
                            >
                              <Phone className="h-4.5 w-4.5 text-slate-600" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isActionable && (
                      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">

                        {/* STORE PICKUP: Customer comes to shop — only Complete button */}
                        {isStorePickup ? (
                          <>
                            <div className="w-full text-center text-xs font-semibold rounded-xl py-2 border flex items-center justify-center gap-2 bg-green-50 border-green-200 text-green-700">
                              <Package className="h-4 w-4 text-green-700" />
                              {t('Customer will collect from store')}
                            </div>
                            {order.status === 'ready' && (
                              <button
                                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br from-green-500 to-green-700 border-none px-6"
                                onClick={() => handleCompleteDelivery(order)}
                              >
                                <CheckCircle className="h-5 w-5 animate-pulse text-white" />
                                {t('Mark as Collected')}
                              </button>
                            )}
                          </>

                        ) : isPickupRequest ? (
                          <>
                            {/* Status: pickup_assigned — I'm Coming button */}
                            {order.status === 'pickup_assigned' && (
                              <button
                                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br from-blue-500 to-blue-700 border-none px-6"
                                onClick={() => handleComingForPickup(order)}
                              >
                                <Navigation className="h-4 w-4 text-white" />
                                {t("I'm coming")}
                              </button>
                            )}

                            {/* Status: coming_for_pickup — WhatsApp Share + Mark as Arrived */}
                            {order.status === 'coming_for_pickup' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* WhatsApp Share button */}
                                {order.phone && (
                                  <button
                                    className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.98] border-emerald-500 text-emerald-700 bg-emerald-50 px-4"
                                    onClick={() => {
                                      const url = generateWhatsAppLink(order);
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                                    {t('WhatsApp Update')}
                                  </button>
                                )}

                                {/* Mark as Arrived at Shop */}
                                <button
                                  className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md col-span-1 sm:col-span-1 bg-gradient-to-br from-teal-600 to-teal-700 border-none px-4"
                                  onClick={() => handleArrivedAtShopForPickup(order)}
                                >
                                  <CheckCircle className="h-4.5 w-4.5 text-white" />
                                  {t('Mark as Arrived')}
                                </button>
                              </div>
                            )}

                            {/* Status: arrived_at_shop — info block */}
                            {order.status === 'arrived_at_shop' && (
                              <div className="w-full text-center text-sm font-semibold rounded-xl py-3 border shadow-2xs flex items-center justify-center gap-2 bg-teal-50 border-teal-100 text-teal-700">
                                <CheckCircle className="h-4.5 w-4.5 animate-bounce text-teal-700" />
                                {t('Arrived at Shop — Admin processing')}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {order.status !== 'out-for-delivery' ? (
                              <button
                                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br from-blue-500 to-blue-700 border-none px-6"
                                onClick={() => handleStartDelivery(order)}
                              >
                                <Truck className="h-5 w-5 text-white" />
                                {t('Start Delivery')}
                              </button>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                  {order.phone && (
                                    <button
                                      className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.98] border-emerald-500 text-emerald-700 bg-emerald-50 px-2"
                                      onClick={() => {
                                        const url = generateWhatsAppLink(order);
                                        window.open(url, '_blank');
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4 text-emerald-700" />
                                      {t('WhatsApp Update')}
                                    </button>
                                  )}
                                  <button
                                    className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] bg-slate-100 text-slate-700 border-none px-2"
                                    onClick={() => handleImComing(order)}
                                  >
                                    <Navigation className="h-4 w-4 text-slate-600" />
                                    {t("I'm coming")}
                                  </button>
                                </div>
                                <button
                                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md mt-1 bg-gradient-to-br from-emerald-500 to-emerald-600 border-none px-6"
                                  onClick={() => handleCompleteDelivery(order)}
                                >
                                  <CheckCircle className="h-5 w-5 animate-pulse text-white" />
                                  {t('Mark as Delivered')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {totalItems > 0 && (
              <Pagination
                currentPage={page}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                className="mt-4"
              />
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="py-2 text-base">
              {confirmDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none"
              onClick={() => setConfirmOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button 
              className="flex-1 sm:flex-none bg-success hover:bg-success/90"
              onClick={() => {
                if (confirmAction) confirmAction();
                setConfirmOpen(false);
              }}
            >
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 





