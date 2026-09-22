import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { NOTIF_TYPES, computeDistanceBetween } from './liveTrackingUtils';

export function useLiveTrackingAlerts({
  drivers = [],
  driverETAs = {},
  nearDestination = {},
  geofenceEnabled = true,
  shopCoords = null,
  geofenceRadius = 5000,
}) {
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveCountdown, setLiveCountdown] = useState({});

  const notifRef = useRef(null);
  const notifTimestampsRef = useRef({});
  const prevPositionsRef = useRef({});

  // Close notifications popup when clicking outside
  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [notifOpen]);

  const addNotification = useCallback((type, orderId, driverName, extra = '') => {
    const key = `${type}-${orderId}`;
    const now = Date.now();
    if (notifTimestampsRef.current[key] && now - notifTimestampsRef.current[key] < 5 * 60 * 1000) return;
    notifTimestampsRef.current[key] = now;
    const notif = { id: now, type, orderId, driverName, extra, time: new Date().toLocaleTimeString(), read: false };
    setNotifications(prev => [notif, ...prev.slice(0, 49)]);
    setUnreadCount(c => c + 1);
    toast(
      `${NOTIF_TYPES[type].icon} ${NOTIF_TYPES[type].label}: ${driverName} (Order #${orderId}) ${extra}`,
      { duration: 6000, style: { background: '#1e293b', color: 'white' } }
    );
  }, []);

  // Monitor drivers every 15s for smart alerts
  useEffect(() => {
    if (drivers.length === 0) return;
    const check = () => {
      const now = Date.now();
      drivers.forEach(driver => {
        const orderId = String(driver.order_id);
        const lastPing = new Date(driver.created_at || 0).getTime();
        const pos = { lat: parseFloat(driver.latitude), lng: parseFloat(driver.longitude) };

        // Signal lost (no ping > 3 min)
        if (now - lastPing > 3 * 60 * 1000) {
          addNotification('SIGNAL', orderId, driver.driver_name);
        }

        // Driver stopped (same position for 5+ min)
        const prev = prevPositionsRef.current[orderId];
        if (prev) {
          const dist = Math.hypot(pos.lat - prev.lat, pos.lng - prev.lng);
          if (dist < 0.0001 && now - prev.time > 5 * 60 * 1000) {
            addNotification('STOPPED', orderId, driver.driver_name, '(5+ min without movement)');
          }
        }
        prevPositionsRef.current[orderId] = { ...pos, time: now };

        // ETA overdue
        const countdown = liveCountdown[orderId];
        if (countdown !== undefined && countdown <= 0 && driverETAs[orderId]) {
          addNotification('LATE', orderId, driver.driver_name, '- ETA has passed');
        }

        // Near destination
        if (nearDestination[orderId]) {
          addNotification('ARRIVED', orderId, driver.driver_name, 'is < 300m away!');
        }

        // Geofence check
        if (geofenceEnabled && shopCoords) {
          const dist = computeDistanceBetween(shopCoords, pos);
          if (dist > geofenceRadius) {
            addNotification('GEOFENCE', orderId, driver.driver_name, `(${(dist / 1000).toFixed(1)}km from shop)`);
          }
        }
      });
    };
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [drivers, liveCountdown, driverETAs, nearDestination, geofenceEnabled, shopCoords, geofenceRadius, addNotification]);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => setLiveCountdown(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.max(0, v - 1)]))), 1000);
    return () => clearInterval(tick);
  }, []);

  return {
    notifications,
    setNotifications,
    notifOpen,
    setNotifOpen,
    unreadCount,
    setUnreadCount,
    liveCountdown,
    setLiveCountdown,
    notifRef,
    addNotification,
  };
}
