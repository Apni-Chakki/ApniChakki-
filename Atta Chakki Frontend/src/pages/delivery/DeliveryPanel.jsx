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

  // ─── Initialize Socket.io connection ───
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
    if (user) {
      loadOrders();
      const interval = setInterval(loadOrders, 5000); // Check every 5s
      return () => clearInterval(interval);
    }
  }, [user]);

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

  // --- 1. Fetch from Database ---
  const loadOrders = async () => {
    try {
      const driverPhone = user?.phone || user?.username;
      if (!driverPhone) return;

      // Fetch delivery orders specifically for this driver from DB
      const response = await fetch(`${API_BASE_URL}/get_delivery_orders.php?driver_phone=${encodeURIComponent(driverPhone)}`);
      const data = await response.json();

      if (data.success) {
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

  // ─── Send GPS coordinates to backend + Socket.io ───
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

  // ─── Start GPS tracking for an order ───
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

  // ─── Stop GPS tracking for an order ───
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

  // ─── Generate tracking link via API ───
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

  // ─── Fallback WhatsApp link (Google Maps static location) ───
  const generateWhatsAppLink = useCallback((order, lat, lng) => {
    const customerPhone = order.phone || order.customer_phone || '';
    let formattedPhone = customerPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('92')) {
      formattedPhone = '92' + formattedPhone;
    }

    // Use tracking link if available, otherwise Google Maps link
    const trackingData = trackingLinks[order.id];
    if (trackingData?.whatsapp_url) {
      return trackingData.whatsapp_url;
    }

    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const mapsLink = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    
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
      `🌟 *Apni Chakki — Order On The Way!* 🌟\n\n` +
      `Assalam-o-Alaikum! Your order *#${order.id}* has been dispatched and is on its way. 🚚💨\n\n` +
      `📦 *ORDER DETAILS:*\n` +
      `${itemsText}\n` +
      `-----------------------------------\n` +
      `${isPickupReq ? `❗ *Amount:* TBD (Pickup Request)\n` : `${priceBreakdown}\n`}` +
      `🚚 *Delivery Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n` +
      `🧑‍💼 *Rider:* ${user?.name || 'Apni Chakki Driver'}\n\n` +
      `${mapsLink ? `📍 *Driver's Static Location:*\n${mapsLink}\n\n` : ''}` +
      `Please keep your phone nearby so our rider can reach you easily.\n\n` +
      `Thank you for choosing Apni Chakki! JazakAllah! 🙏🌾`
    );

    return `https://wa.me/${formattedPhone}?text=${message}`;
  }, [trackingLinks, user]);

  // ─── Central helper: GPS → Google Maps Link → WhatsApp Customer ───
  const shareLocationViaWhatsApp = useCallback(async (order, lat, lng) => {
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

    // Build Google Maps link with current GPS coordinates
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const mapsLink = hasCoords
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;

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
      `🚚 *Apni Chakki — Rider On The Way!* 🚚\n\n` +
      `Assalam-o-Alaikum *${order.customerName || 'Customer'}*! 👋\n\n` +
      `Aapka order *#${order.id}* dispatch ho gaya hai aur rider aapki taraf aa raha hai. 🛵💨\n\n` +
      `📦 *Order Summary:*\n${itemsText}\n` +
      (isPickup
        ? `💰 *Amount:* TBD (Pickup Request)\n`
        : `💰 *Total:* Rs. ${grandTotal.toLocaleString()}\n` +
          (advancePaid > 0 ? `✅ *Advance Paid:* Rs. ${advancePaid.toLocaleString()}\n` : '') +
          `❗ *Remaining Due:* Rs. ${remaining.toLocaleString()}\n`) +
      `\n📍 *Delivery Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n` +
      `🧑‍💼 *Rider:* ${user?.name || 'Apni Chakki Driver'}\n\n` +
      (mapsLink
        ? `🗺️ *Rider ki Live Location (Google Maps):*\n${mapsLink}\n\n`
        : '') +
      `Apna phone paas rakhein taake rider aap tak asaani se pahunch sake.\n\n` +
      `Shukriya! JazakAllah! 🙏🌾`
    );

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

    toast.dismiss();
    setTimeout(() => window.open(whatsappUrl, '_blank'), 300);
    toast.success(
      mapsLink
        ? '✅ WhatsApp khul gaya! Customer ko Google Maps location bhi mil jaegi.'
        : '✅ WhatsApp khul gaya! (GPS location nahi mili, baaki details bhej di gayi hain.)'
    );
  }, [user]);

  // --- 2. Update Status to Out-For-Delivery + Start Tracking ---
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

        // 5. Send live location to customer via WhatsApp
        await shareLocationViaWhatsApp(order, initialLat, initialLng);

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

  // --- 3. Update Status to Completed + Stop Tracking ---
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
              `✅ *Apni Chakki — Order Delivered Successfully!* ✅\n\n` +
              `Assalam-o-Alaikum! Your order *#${order.id}* has been successfully delivered to you. 🎉\n\n` +
              `📦 *DELIVERED ITEMS:*\n` +
              `${itemsText}\n` +
              `-----------------------------------\n` +
              `${paymentMessage}\n` +
              `🚚 *Delivery Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n` +
              `🧑‍💼 *Delivered By:* ${user?.name || 'Apni Chakki Driver'}\n\n` +
              `We hope you are satisfied with our pure and fresh products. 🌾\n` +
              `If you have any feedback or queries, please feel free to reach out to us.\n\n` +
              `Thank you for trusting Apni Chakki! JazakAllah! ⭐🙏`
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
    const badgeStyle = (bg, border, text) => ({
      backgroundColor: bg,
      borderColor: border,
      color: text,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    });

    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={badgeStyle('#fffbeb', '#fde68a', '#b45309')}>
            <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: '#b45309' }} />
            {t('Pending')}
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={badgeStyle('#eff6ff', '#bfdbfe', '#1d4ed8')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: '#1d4ed8' }} />
            {t('Processing')}
          </Badge>
        );
      case 'ready':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={badgeStyle('#ecfdf5', '#a7f3d0', '#047857')}>
            <Package className="h-3.5 w-3.5 shrink-0" style={{ color: '#047857' }} />
            {t('Ready for Pickup')}
          </Badge>
        );
      case 'out-for-delivery':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse" style={badgeStyle('#e0e7ff', '#c7d2fe', '#4338ca')}>
            <Truck className="h-3.5 w-3.5 shrink-0" style={{ color: '#4338ca' }} />
            {t('Out for Delivery')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={badgeStyle('#f0fdfa', '#99f6e4', '#0f766e')}>
            <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: '#0f766e' }} />
            {t('Completed')}
          </Badge>
        );
      case 'pickup_assigned':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={badgeStyle('#fff7ed', '#ffedd5', '#ea580c')}>
            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: '#ea580c' }} />
            {t('Pickup Assigned')}
          </Badge>
        );
      case 'coming_for_pickup':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse" style={badgeStyle('#ecfeff', '#cffafe', '#0891b2')}>
            <Truck className="h-3.5 w-3.5 shrink-0" style={{ color: '#0891b2' }} />
            {t('Coming for Pickup')}
          </Badge>
        );
      case 'arrived_at_shop':
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={badgeStyle('#f5f3ff', '#ddd6fe', '#6d28d9')}>
            <Wheat className="h-3.5 w-3.5 shrink-0" style={{ color: '#6d28d9' }} />
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
        
        // GPS tracking shuru karo takay admin location dekh sake
        startGpsTracking(order.id);

        // Tracking link generate karo
        const trackingData = await generateTrackingLink(order);

        const cPhone = result.customer_phone || order.phone;
        const cName = result.customer_name || order.customerName;
        
        if (cPhone) {
          const customerPhone = cPhone.replace(/\D/g, '');
          let formattedPhone = customerPhone.startsWith('0') 
            ? '92' + customerPhone.substring(1) 
            : customerPhone.startsWith('92') ? customerPhone : '92' + customerPhone;

          // Agar tracking link mil gayi to use karo, warna simple message
          let whatsappUrl;
          if (trackingData?.whatsapp_url) {
            whatsappUrl = trackingData.whatsapp_url;
          } else {
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
              `🚚 *Apni Chakki — Pickup Update* 🚚\n\n` +
              `Assalam-o-Alaikum ${cName || 'Customer'}!\n\n` +
              `Our rider *${user?.name || 'Apni Chakki Rider'}* is currently on the way to your location to pick up your items. 🛵💨\n\n` +
              `📦 *ITEMS TO BE PICKED UP:*\n` +
              `${itemsText}\n` +
              `📍 *Pickup Address:* ${order.deliveryAddress || order.shipping_address || 'Not provided'}\n\n` +
              `Please keep your items ready. If you have any specific instructions, feel free to let us know.\n\n` +
              `JazakAllah! 🙏🌾`
            );
            whatsappUrl = `https://wa.me/${formattedPhone}?text=${msg}`;
          }
          
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
        // GPS tracking band karo
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

      // 3. Share Live Location via WhatsApp (automatically opens customer's chat)
      await shareLocationViaWhatsApp(order, initialLat, initialLng);
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
        {orders.length === 0 ? (
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
                  className={`p-6 relative overflow-hidden transition-all duration-300 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    !isActionable 
                      ? 'opacity-70 bg-gray-50' 
                      : 'bg-white'
                  }`}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    borderColor: '#f1f5f9',
                    backgroundColor: !isActionable ? '#f9fafb' : '#ffffff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Left accent color strip */}
                  {isActionable && (
                    <div 
                      className="absolute left-0 top-0 bottom-0"
                      style={{ 
                        width: '6px', 
                        background: isStorePickup
                          ? 'linear-gradient(to bottom, #22c55e, #16a34a)'   // green = store pickup
                          : isPickupRequest 
                            ? 'linear-gradient(to bottom, #fbbf24, #f97316)' // orange = driver pickup
                            : 'linear-gradient(to bottom, #3b82f6, #4f46e5)' // blue = delivery
                      }} 
                    />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Order Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="flex items-center flex-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          <span 
                            className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-md border"
                            style={{ backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
                          >
                            #{order.id}
                          </span>
                          {getStatusBadge(order.status)}
                          {isTracking && (
                            <Badge 
                              className="text-white text-[10px] font-bold tracking-wider animate-pulse border-none"
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: '#ef4444', 
                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                              }}
                            >
                              <Radio className="h-3 w-3" style={{ color: '#ffffff' }} />
                              LIVE
                            </Badge>
                          )}
                        </div>
                        
                        {/* Customer Avatar & Name */}
                        <div className="flex items-center" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                          <div 
                            className="rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              minWidth: '40px', 
                              minHeight: '40px', 
                              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                              borderColor: '#cbd5e1', 
                              color: '#475569' 
                            }}
                          >
                            {order.customerName ? order.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h3 className="font-bold text-base leading-tight" style={{ color: '#1e293b', margin: 0 }}>
                              {order.customerName}
                            </h3>
                            <p className="text-[11px] font-bold leading-none mt-1 uppercase tracking-wider" style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>
                              {t('Customer')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end" style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '6px' }}>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1" style={{ color: '#94a3b8', margin: '0 0 4px 0' }}>
                            {isPickupRequest ? t('Pickup Request') : t('Total Amount')}
                          </span>
                          <p className="text-xl font-extrabold leading-none" style={{ color: '#0f172a', margin: 0 }}>
                            {isPickupRequest ? 'TBD' : `Rs. ${order.total.toLocaleString()}`}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: order.payment_method === 'cash' ? '#fffbeb' : '#ecfdf5',
                            borderColor: order.payment_method === 'cash' ? '#fde68a' : '#a7f3d0',
                            color: order.payment_method === 'cash' ? '#b45309' : '#047857'
                          }}
                        >
                          {order.payment_method === 'cash' ? t('Collect Cash') : t('Paid Online')}
                        </Badge>
                      </div>
                    </div>

                    {/* Address Block */}
                    <div 
                      className="flex p-4 rounded-xl border items-center justify-between"
                      style={{ backgroundColor: '#fafaf9', borderColor: '#e7e5e4', gap: '12px', display: 'flex' }}
                    >
                      <div className="flex items-center min-w-0 flex-1" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div 
                          className="rounded-full border flex items-center justify-center shrink-0"
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            minWidth: '40px', 
                            minHeight: '40px', 
                            backgroundColor: '#fee2e2', 
                            borderColor: '#fca5a5' 
                          }}
                        >
                          <MapPin className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: '#94a3b8', margin: '0 0 4px 0' }}>
                            {t('Delivery Address')}
                          </span>
                          <p className="text-sm font-semibold leading-snug break-words" style={{ color: '#334155', margin: 0 }}>
                            {order.deliveryAddress || t('No address provided')}
                          </p>
                        </div>
                      </div>
                      
                      {isActionable && (
                        <div className="flex items-center shrink-0 ml-1" style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="rounded-full bg-white border flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                            style={{ 
                              width: '36px', 
                              height: '36px', 
                              minWidth: '36px', 
                              minHeight: '36px', 
                              borderColor: '#e2e8f0', 
                              color: '#2563eb',
                              padding: '0'
                            }}
                            onClick={() => openMaps(order.deliveryAddress || '')}
                            title={t('Navigate')}
                          >
                            <Navigation className="h-4.5 w-4.5" style={{ color: '#2563eb' }} />
                          </button>
                          {order.phone && (
                            <button
                              className="rounded-full bg-white border flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ 
                                width: '36px', 
                                height: '36px', 
                                minWidth: '36px', 
                                minHeight: '36px', 
                                borderColor: '#e2e8f0', 
                                color: '#475569',
                                padding: '0'
                              }}
                              onClick={() => window.open(`tel:${order.phone}`, '_self')}
                              title={t('Call Customer')}
                            >
                              <Phone className="h-4.5 w-4.5" style={{ color: '#475569' }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isActionable && (
                      <div className="flex flex-col pt-3" style={{ borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* ── STORE PICKUP: Customer comes to shop — only Complete button ── */}
                        {isStorePickup ? (
                          <>
                            <div
                              className="w-full text-center text-xs font-semibold rounded-xl py-2 border flex items-center justify-center gap-2"
                              style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}
                            >
                              <Package className="h-4 w-4" style={{ color: '#15803d' }} />
                              {t('Customer will collect from store')}
                            </div>
                            {order.status === 'ready' && (
                              <button
                                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md"
                                style={{
                                  background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                                  border: 'none',
                                  padding: '0 1.5rem'
                                }}
                                onClick={() => handleCompleteDelivery(order)}
                              >
                                <CheckCircle className="h-5 w-5 animate-pulse" style={{ color: '#ffffff' }} />
                                {t('Mark as Collected')}
                              </button>
                            )}
                          </>

                        ) : isPickupRequest ? (
                          <>
                            {/* Status: pickup_assigned — I'm Coming button */}
                            {order.status === 'pickup_assigned' && (
                              <button
                                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md"
                                style={{ 
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0 1.5rem'
                                }}
                                onClick={() => handleComingForPickup(order)}
                              >
                                <Navigation className="h-4 w-4" style={{ color: '#ffffff' }} />
                                {t("I'm coming")}
                              </button>
                            )}

                            {/* Status: coming_for_pickup — WhatsApp Share + Mark as Arrived */}
                            {order.status === 'coming_for_pickup' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ display: 'grid', gap: '8px' }}>
                                {/* WhatsApp Share button */}
                                {order.phone && (
                                  <button
                                    className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.98]"
                                    style={{ 
                                      borderColor: '#10b981', 
                                      color: '#047857', 
                                      backgroundColor: '#ecfdf5',
                                      padding: '0 1rem'
                                    }}
                                    onClick={() => {
                                      const trackingData = trackingLinks[order.id];
                                      if (trackingData?.whatsapp_url) {
                                        window.open(trackingData.whatsapp_url, '_blank');
                                      } else {
                                        generateTrackingLink(order).then(data => {
                                          if (data?.whatsapp_url) {
                                            window.open(data.whatsapp_url, '_blank');
                                          } else {
                                            getCurrentPositionSafe({ timeout: 5000, maximumAge: 3000 }).then(pos => {
                                              const url = generateWhatsAppLink(order, pos?.coords?.latitude, pos?.coords?.longitude);
                                              window.open(url, '_blank');
                                            });
                                          }
                                        });
                                      }
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4" style={{ color: '#047857' }} />
                                    {t('Share Live Location')}
                                  </button>
                                )}

                                {/* Mark as Arrived at Shop */}
                                <button
                                  className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md col-span-1 sm:col-span-1"
                                  style={{ 
                                    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', 
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0 1rem'
                                  }}
                                  onClick={() => handleArrivedAtShopForPickup(order)}
                                >
                                  <CheckCircle className="h-4.5 w-4.5" style={{ color: '#ffffff' }} />
                                  {t('Mark as Arrived')}
                                </button>
                              </div>
                            )}

                            {/* Status: arrived_at_shop — info block */}
                            {order.status === 'arrived_at_shop' && (
                              <div 
                                className="w-full text-center text-sm font-semibold rounded-xl py-3 border shadow-2xs flex items-center justify-center gap-2"
                                style={{ 
                                  backgroundColor: '#f0fdfa', 
                                  borderColor: '#ccfbf1', 
                                  color: '#0f766e',
                                  gap: '8px'
                                }}
                              >
                                <CheckCircle className="h-4.5 w-4.5 animate-bounce" style={{ color: '#0f766e' }} />
                                {t('Arrived at Shop — Admin processing')}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {order.status !== 'out-for-delivery' ? (
                              <button
                                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md"
                                style={{ 
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0 1.5rem'
                                }}
                                onClick={() => handleStartDelivery(order)}
                              >
                                <Truck className="h-5 w-5" style={{ color: '#ffffff' }} />
                                {t('Start Delivery')}
                              </button>
                            ) : (
                              <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="grid grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                                  {order.phone && (
                                    <button
                                      className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.98]"
                                      style={{ 
                                        borderColor: '#10b981', 
                                        color: '#047857', 
                                        backgroundColor: '#ecfdf5',
                                        padding: '0 0.5rem'
                                      }}
                                      onClick={() => {
                                        getCurrentPositionSafe({ timeout: 5000, maximumAge: 3000 })
                                          .then((pos) => {
                                            if (pos) {
                                              const url = generateWhatsAppLink(order, pos.coords.latitude, pos.coords.longitude);
                                              window.open(url, '_blank');
                                              return;
                                            }
                                            toast.info(t('Could not get current location. Sending the update without live coordinates.'));
                                            window.open(generateWhatsAppLink(order, null, null), '_blank');
                                          });
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4" style={{ color: '#047857' }} />
                                      {t('WhatsApp Update')}
                                    </button>
                                  )}
                                  <button
                                    className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98]"
                                    style={{ 
                                      backgroundColor: '#f1f5f9', 
                                      color: '#334155',
                                      border: 'none',
                                      padding: '0 0.5rem'
                                    }}
                                    onClick={() => handleImComing(order)}
                                  >
                                    <Navigation className="h-4 w-4" style={{ color: '#475569' }} />
                                    {t("I'm coming")}
                                  </button>
                                </div>
                                <button
                                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md mt-1"
                                  style={{ 
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0 1.5rem'
                                  }}
                                  onClick={() => handleCompleteDelivery(order)}
                                >
                                  <CheckCircle className="h-5 w-5 animate-pulse" style={{ color: '#ffffff' }} />
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





