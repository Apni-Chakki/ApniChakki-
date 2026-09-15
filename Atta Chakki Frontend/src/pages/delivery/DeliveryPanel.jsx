import { DeliveryOrderCard } from '../../components/features/delivery/DeliveryOrderCard';
import { DeliveryConfirmDialog } from '../../components/features/delivery/DeliveryConfirmDialog';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Phone, Navigation, CheckCircle, Package, LogOut, Wheat, Clock, Truck, Radio, MessageCircle, Link2, Loader2, AlertTriangle, Power } from 'lucide-react';
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
  const [isDriverActive, setIsDriverActive] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
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

  // Fetch driver active / inactive duty status
  const fetchDriverStatus = useCallback(async () => {
    try {
      const driverPhone = user?.phone || user?.username;
      if (!driverPhone) return;
      const res = await fetch(`${API_BASE_URL}/toggle_driver_status.php?driver_phone=${encodeURIComponent(driverPhone)}`);
      const data = await res.json();
      if (data.success && typeof data.isActive === 'boolean') {
        setIsDriverActive(data.isActive);
      }
    } catch (e) {
      console.warn("Error fetching driver status:", e);
    }
  }, [user]);

  // Toggle driver active / inactive duty status
  const handleToggleDriverStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const driverPhone = user?.phone || user?.username;
      const nextStatus = !isDriverActive;
      const res = await fetch(`${API_BASE_URL}/toggle_driver_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_phone: driverPhone,
          isActive: nextStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsDriverActive(data.isActive);
        if (data.isActive) {
          toast.success(t('🟢 You are now Online (Active). Ready to receive orders!'));
        } else {
          toast.warning(t('🔴 You are now Offline (Inactive / Emergency). No new orders will be assigned to you.'));
        }

        // Emit real-time status update via Socket.io
        if (socketRef.current?.connected) {
          socketRef.current.emit('driver:status_changed', {
            driver_name: user?.name || data.driver_name || 'Driver',
            driver_phone: driverPhone,
            isActive: data.isActive
          });
        }
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Network error updating status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDriverStatus();
      loadOrders();
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadOrders();
          fetchDriverStatus();
        }
      }, 20000); // Check every 20s when tab is active
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, pageSize, fetchDriverStatus]);

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
          customerName: order.customer_name || order.full_name || 'Customer',
          phone: order.customer_phone || order.phone || order.user_phone || '',
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

        // Sort: Out for delivery -> Delivery Assigned -> Ready -> Coming for Pickup -> Pickup Assigned -> Processing/Pending
        const sortedOrders = mappedOrders.sort((a, b) => {
          const statusOrder = { 'out-for-delivery': 1, 'delivery_assigned': 2, 'coming_for_pickup': 3, 'ready': 4, 'pickup_assigned': 5, 'processing': 6, 'pending': 7 };
          return (statusOrder[a.status] || 10) - (statusOrder[b.status] || 10);
        });
        
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error("Error loading delivery orders:", error);
    }
  };

  // rider location send karna
  const sendLocationToServer = useCallback(async (orderId, position) => {
    try {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;
      
      // api pe location update
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

      // socket pe emit
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

  // gps tracking start
  const startGpsTracking = useCallback((orderId) => {
    if (!navigator.geolocation) {
      toast.error(t('GPS not supported on this device'));
      return;
    }

    // live position watch
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

    // interval backup
    const intervalId = setInterval(() => {
      getCurrentPositionSafe({ timeout: 8000, maximumAge: 3000 })
        .then((position) => {
          if (position) sendLocationToServer(orderId, position);
        });
    }, 8000);

    trackingIntervals.current[orderId] = intervalId;
  }, [sendLocationToServer, t, getCurrentPositionSafe]);

  // tracking stop karna
  const stopGpsTracking = useCallback((orderId) => {
    if (activeTracking[orderId]) {
      navigator.geolocation.clearWatch(activeTracking[orderId]);
      setActiveTracking(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }

    if (trackingIntervals.current[orderId]) {
      clearInterval(trackingIntervals.current[orderId]);
      delete trackingIntervals.current[orderId];
    }
  }, [activeTracking]);

  // tracking link generate karna
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
      <div className="bg-primary text-primary-foreground p-3 sm:p-4 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wheat className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold truncate">{t("GristMill's Delivery")}</h1>
            </div>
            <p className="text-xs text-primary-foreground/80 mt-0.5 truncate">
              {user?.name && `Driver: ${user.name}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Active / Inactive Duty Toggle Button */}
            <button
              type="button"
              onClick={handleToggleDriverStatus}
              disabled={isTogglingStatus}
              title={isDriverActive ? t("Click to go Inactive / Off Duty (Emergency)") : t("Click to go Active / On Duty")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border cursor-pointer active:scale-95 shadow-sm ${
                isDriverActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/60 ring-2 ring-emerald-400/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/60 ring-2 ring-rose-400/20 animate-pulse'
              }`}
            >
              {isTogglingStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white shrink-0" />
              ) : (
                <span className={`w-2 h-2 rounded-full shrink-0 ${isDriverActive ? 'bg-emerald-300 animate-pulse' : 'bg-rose-200'}`} />
              )}
              <span className="hidden md:inline">
                {isDriverActive ? t('Active (On Duty)') : t('Inactive (Emergency / Off Duty)')}
              </span>
              <span className="md:hidden">
                {isDriverActive ? t('On Duty') : t('Off Duty')}
              </span>
            </button>

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

      {/* Offline / Emergency Warning Banner */}
      {!isDriverActive && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 shadow-xs">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-rose-900">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{t('You are currently Offline / Inactive. New orders will not be assigned.')}</span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 shrink-0"
              onClick={handleToggleDriverStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {t('Go Online')}
            </Button>
          </div>
        </div>
      )}

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
            {orders.map((order) => (
              <DeliveryOrderCard
                key={order.id}
                order={order}
                activeTracking={activeTracking}
                openMaps={openMaps}
                handleCompleteDelivery={handleCompleteDelivery}
                handleComingForPickup={handleComingForPickup}
                generateWhatsAppLink={generateWhatsAppLink}
                handleArrivedAtShopForPickup={handleArrivedAtShopForPickup}
                handleStartDelivery={handleStartDelivery}
                handleImComing={handleImComing}
                t={t}
              />
            ))}

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
      <DeliveryConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        onConfirm={confirmAction}
        t={t}
      />
    </div>
  );
} 





