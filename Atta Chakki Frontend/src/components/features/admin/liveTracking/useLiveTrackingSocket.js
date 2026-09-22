import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../../../config';

export function useLiveTrackingSocket({
  onDriverMoved,
  onActiveDrivers,
  onDeliveryCompleted,
}) {
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Keep callback refs fresh
  const onDriverMovedRef = useRef(onDriverMoved);
  const onActiveDriversRef = useRef(onActiveDrivers);
  const onDeliveryCompletedRef = useRef(onDeliveryCompleted);

  useEffect(() => {
    onDriverMovedRef.current = onDriverMoved;
    onActiveDriversRef.current = onActiveDrivers;
    onDeliveryCompletedRef.current = onDeliveryCompleted;
  });

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      socket.emit('admin:subscribe');
      setSocketConnected(true);
    });

    socket.on('tracking:driver_moved', (data) => {
      onDriverMovedRef.current?.(data);
    });

    socket.on('admin:active_drivers', (data) => {
      onActiveDriversRef.current?.(data);
    });

    socket.on('tracking:delivery_completed', (data) => {
      onDeliveryCompletedRef.current?.(data);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socketRef.current = socket;

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return {
    socketRef,
    socketConnected,
  };
}
