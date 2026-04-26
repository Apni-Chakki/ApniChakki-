import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Phone, Navigation, CheckCircle, Package, LogOut, Wheat, Clock, Truck, Radio, MessageCircle, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../lib/AuthContext';
import { LanguageToggle } from '../LanguageToggle';
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

  const getCurrentPositionSafe = useCallback((options = {}) => {
    if (!navigator.geolocation) return Promise.resolve(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        {
          enableHighAccuracy: false,
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
          paymentStatus: 'pending' // You can map this if you have it in DB
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
        enableHighAccuracy: false,
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
  const generateWhatsAppLink = (order, lat, lng) => {
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
    const isPickupReq = ['pickup_assigned', 'coming_for_pickup'].includes(order.status) || order.total === 0;
    const displayTotal = isPickupReq ? 'TBD' : `Rs. ${order.total?.toLocaleString()}`;
    const message = encodeURIComponent(
      `🚚 *Apni Chakki Delivery Update*\n\n` +
      `Assalam-o-Alaikum! Your order #${order.id} is on the way! 🎉\n\n` +
      `📦 Total: ${displayTotal}\n` +
      `🧑‍💼 Driver: ${user?.name || 'Driver'}\n` +
      `${mapsLink ? `📍 Live Location: ${mapsLink}\n\n` : ''}` +
      `Please keep your phone nearby. JazakAllah! 🙏`
    );

    return `https://wa.me/${formattedPhone}?text=${message}`;
  };

  // --- 2. Update Status to Out-For-Delivery + Start Tracking ---
  const handleStartDelivery = async (order) => {
    try {
      // First get current GPS position for the initial "started" ping
      let initialLat = null, initialLng = null;

      const position = await getCurrentPositionSafe({ timeout: 15000, maximumAge: 0 });

      if (position) {
        initialLat = position.coords.latitude;
        initialLng = position.coords.longitude;

        // Send the "started" ping to server
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

      // Update order status in DB
      const response = await fetch(`${API_BASE_URL}/update_order_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: 'out-for-delivery' })
      });
      const result = await response.json();
      
      if (result.success) {
        // Assign driver in DB
        await fetch(`${API_BASE_URL}/assign_driver.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, driver_name: user.name })
        });
        
        // Start continuous GPS tracking
        startGpsTracking(order.id);
        
        toast.success('🚚 Delivery started! GPS tracking active.');

        // Generate tracking link and open WhatsApp with it
        if (order.phone) {
          const trackingData = await generateTrackingLink(order);
          
          setTimeout(() => {
            if (trackingData?.whatsapp_url) {
              window.open(trackingData.whatsapp_url, '_blank');
            } else if (initialLat && initialLng) {
              const whatsappUrl = generateWhatsAppLink(order, initialLat, initialLng);
              window.open(whatsappUrl, '_blank');
            }
          }, 1000);
        }

        loadOrders();
      }
    } catch (error) {
      toast.error('Network error starting delivery');
      console.error('Start delivery error:', error);
    }
  };

  // --- 3. Update Status to Completed + Stop Tracking ---
  const handleCompleteDelivery = async (order) => {
    if (confirm(`Mark order #${order.id} for ${order.customerName} as delivered?`)) {
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

          // Send WhatsApp "Delivered" confirmation to customer
          if (order.phone) {
            const customerPhone = (order.phone || '').replace(/\D/g, '');
            let formattedPhone = customerPhone.startsWith('0') 
              ? '92' + customerPhone.substring(1) 
              : customerPhone.startsWith('92') ? customerPhone : '92' + customerPhone;

            const isPickupReq = ['pickup_assigned', 'coming_for_pickup'].includes(order.status) || order.total === 0;
            const displayTotal = isPickupReq ? 'TBD' : `Rs. ${order.total?.toLocaleString()}`;

            const deliveredMsg = encodeURIComponent(
              `✅ *Apni Chakki — Order Delivered!*\n\n` +
              `Your order #${order.id} has been delivered successfully! 🎉\n\n` +
              `📦 Total: ${displayTotal}\n` +
              `🧑‍💼 Delivered by: ${user?.name || 'Driver'}\n\n` +
              `Thank you for choosing Apni Chakki! ⭐\n` +
              `We'd love your feedback. JazakAllah! 🙏`
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
    }
  };

  const handleLogout = () => {
    Object.keys(activeTracking).forEach(orderId => stopGpsTracking(orderId));
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'ready':
        return <Badge className="bg-green-600 text-white">Ready for Pickup</Badge>;
      case 'out-for-delivery':
        return <Badge className="bg-purple-600 text-white animate-pulse">Out for Delivery</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-600 text-white">Completed</Badge>;
      case 'pickup_assigned':
        return <Badge className="bg-orange-500 text-white">Pickup Assigned</Badge>;
      case 'coming_for_pickup':
        return <Badge className="bg-blue-500 text-white animate-pulse">Coming for Pickup</Badge>;
      case 'arrived_at_shop':
        return <Badge className="bg-teal-600 text-white">Arrived at Shop</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
            const msg = encodeURIComponent(
              `🚚 *Apni Chakki Pickup Update*\n\n` +
              `Hello ${cName || 'Customer'},\n\nOur rider is on the way to your location to pick up your order #${order.id}. Please keep the items ready!\n\n` +
              `📦 Amount: TBD`
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
    if (confirm(`Mark order #${order.id} as Arrived at Shop (Pickup Complete)?`)) {
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
          toast.success('✅ Pickup complete! Admin ko update ho gaya.');
          loadOrders();
        } else {
          toast.error('Failed to update status');
        }
      } catch (error) {
        toast.error('Network error');
      }
    }
  };

  const handleImComing = async (order) => {
    try {
      const pos = await getCurrentPositionSafe({ timeout: 8000, maximumAge: 3000 });
      const payload = {
        order_id: order.id,
        driver_name: user?.name || 'Driver',
        driver_phone: user?.phone || user?.username || null,
        message: "I'm coming",
      };
      if (pos) {
        payload.lat = pos.coords.latitude;
        payload.lng = pos.coords.longitude;
      }

      const res = await fetch(`${API_BASE_URL}/driver_notify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Notified');
      } else {
        toast.error(data.message || 'Failed to notify');
      }
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
              const isPickupRequest = ['pickup_assigned', 'coming_for_pickup', 'arrived_at_shop'].includes(order.status) || order.total === 0;
              // If it's a pickup request, it is actionable in pending/processing state too.
              const isActionable = ['pending', 'processing', 'ready', 'out-for-delivery', 'pickup_assigned', 'coming_for_pickup', 'arrived_at_shop'].includes(order.status);
              const isTracking = !!activeTracking[order.id];
              
              return (
              <Card key={order.id} className={`p-5 ${!isActionable ? 'opacity-75 bg-gray-50' : 'border-l-4 border-l-primary'}`}>
                <div className="space-y-4">
                  {/* Order Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">#{order.id}</span>
                        {getStatusBadge(order.status)}
                        {isTracking && (
                          <Badge className="bg-red-500 text-white text-[10px] animate-pulse gap-1">
                            <Radio className="h-3 w-3" />
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg">{order.customerName}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {isPickupRequest ? 'TBD' : `Rs. ${order.total.toLocaleString()}`}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {order.payment_method === 'cash' ? 'Collect Cash' : 'Paid Online'}
                      </Badge>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex gap-3 bg-background p-3 rounded-md border border-border">
                    <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{order.deliveryAddress || 'No address provided'}</p>
                    </div>
                    {isActionable && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600"
                          onClick={() => openMaps(order.deliveryAddress || '')}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                        {order.phone && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => window.open(`tel:${order.phone}`, '_self')}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {isActionable && (
                    <div className="flex flex-col gap-2">
                      {isPickupRequest ? (
                        <>
                          {/* Status: pickup_assigned — sirf I'm Coming button */}
                          {order.status === 'pickup_assigned' && (
                            <button
                              className="w-full h-11 rounded-md px-8 flex items-center justify-center gap-2 text-sm font-medium text-white transition-colors"
                              style={{ backgroundColor: '#2563eb' }}
                              onClick={() => handleComingForPickup(order)}
                            >
                              <Navigation className="h-4 w-4" />
                              {t("I'm coming")}
                            </button>
                          )}

                          {/* Status: coming_for_pickup — WhatsApp Share + Mark as Arrived */}
                          {order.status === 'coming_for_pickup' && (
                            <>
                              {/* WhatsApp Share button */}
                              {order.phone && (
                                <button
                                  className="w-full h-11 rounded-md px-4 flex items-center justify-center gap-2 text-sm font-medium border transition-colors"
                                  style={{ borderColor: '#22c55e', color: '#15803d', backgroundColor: '#f0fdf4' }}
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
                                  <MessageCircle className="h-4 w-4" />
                                  {t('Share Live Location')}
                                </button>
                              )}

                              {/* Mark as Arrived at Shop */}
                              <button
                                className="w-full h-12 rounded-md px-4 flex items-center justify-center gap-2 text-base font-semibold text-white transition-colors"
                                style={{ backgroundColor: '#0d9488' }}
                                onClick={() => handleArrivedAtShopForPickup(order)}
                              >
                                <CheckCircle className="h-5 w-5" />
                                {t('Mark as Arrived at Shop')}
                              </button>
                            </>
                          )}

                          {/* Status: arrived_at_shop — sirf info dikhao */}
                          {order.status === 'arrived_at_shop' && (
                            <div className="w-full text-center text-sm text-teal-700 font-semibold bg-teal-50 rounded-md py-3 border border-teal-200">
                              ✅ Arrived at Shop — Admin processing karega
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {order.status !== 'out-for-delivery' ? (
                            <button
                              className="w-full h-11 rounded-md flex items-center justify-center gap-2 text-sm font-semibold text-white transition-colors"
                              style={{ backgroundColor: '#2563eb' }}
                              onClick={() => handleStartDelivery(order)}
                            >
                              <Truck className="h-5 w-5" />
                              {t('Start Delivery')}
                            </button>
                          ) : (
                            <>
                              {order.phone && (
                                <button
                                  className="w-full h-11 rounded-md flex items-center justify-center gap-2 text-sm font-medium border transition-colors"
                                  style={{ borderColor: '#22c55e', color: '#15803d', backgroundColor: '#f0fdf4' }}
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
                                  <MessageCircle className="h-4 w-4" />
                                  {t('Send WhatsApp Update')}
                                </button>
                              )}
                              <button
                                className="w-full h-11 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                                style={{ backgroundColor: '#e2e8f0', color: '#334155' }}
                                onClick={() => handleImComing(order)}
                              >
                                <Navigation className="h-4 w-4" />
                                {t("I'm coming")}
                              </button>
                              <button
                                className="w-full h-12 rounded-md flex items-center justify-center gap-2 text-base font-semibold text-white transition-colors"
                                style={{ backgroundColor: '#16a34a' }}
                                onClick={() => handleCompleteDelivery(order)}
                              >
                                <CheckCircle className="h-5 w-5" />
                                {t('Mark as Delivered')}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )})}
          </div>
        )}
      </div>
    </div>
  );
} 
