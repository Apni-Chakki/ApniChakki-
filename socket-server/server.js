// live tracking k liye socket server hai ye

const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
  // server check karne k liye route
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      activeConnections: io.engine.clientsCount,
      activeDrivers: Object.keys(activeDrivers).length,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket', 'polling']
});

// driver aur watchers ka data yahan save hoga
const activeDrivers = {};
const orderRooms = {};

// jab koi naya banda connect ho
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // driver apni location bhej raha hai
  socket.on('driver:location_update', (data) => {
    const { order_id, latitude, longitude, heading, speed, driver_name, accuracy } = data;

    if (!order_id || latitude == null || longitude == null) {
      socket.emit('error', { message: 'Missing required fields: order_id, latitude, longitude' });
      return;
    }

    // nai location save kar rahe han
    activeDrivers[order_id] = {
      order_id,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      driver_name: driver_name || 'Driver',
      lastUpdate: Date.now(),
      socketId: socket.id
    };

    // sab ko location bhej rahe han jo dekh rahe han
    const roomName = `order_${order_id}`;
    io.to(roomName).emit('tracking:location_update', {
      order_id,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      driver_name: driver_name || 'Driver',
      timestamp: Date.now()
    });

    // admin ko bhi bata rahe han driver kahan hai
    io.to('admin_tracking').emit('tracking:driver_moved', {
      order_id,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      driver_name: driver_name || 'Driver',
      timestamp: Date.now()
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📍 Driver [${driver_name}] Order #${order_id}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | heading: ${(heading || 0).toFixed(0)}° | speed: ${(speed || 0).toFixed(1)} m/s`);
    }
  });

  // jab delivery ho jaye
  socket.on('driver:delivery_completed', (data) => {
    const { order_id, driver_name } = data;
    const roomName = `order_${order_id}`;

    io.to(roomName).emit('tracking:delivery_completed', {
      order_id,
      driver_name,
      timestamp: Date.now()
    });

    io.to('admin_tracking').emit('tracking:delivery_completed', {
      order_id,
      driver_name,
      timestamp: Date.now()
    });

    delete activeDrivers[order_id];
    console.log(`✅ Delivery completed: Order #${order_id} by ${driver_name}`);
  });

  // customer order track karna chahta hai
  socket.on('tracking:subscribe', (data) => {
    const { order_id } = data;
    if (!order_id) return;

    const roomName = `order_${order_id}`;
    socket.join(roomName);

    if (!orderRooms[order_id]) orderRooms[order_id] = new Set();
    orderRooms[order_id].add(socket.id);

    console.log(`👀 Customer ${socket.id} watching Order #${order_id} (${orderRooms[order_id].size} watchers)`);

    // agar driver online hai to location bhej do
    if (activeDrivers[order_id]) {
      socket.emit('tracking:location_update', {
        ...activeDrivers[order_id],
        timestamp: activeDrivers[order_id].lastUpdate
      });
    }
  });

  // customer ne tracking band kar di
  socket.on('tracking:unsubscribe', (data) => {
    const { order_id } = data;
    if (!order_id) return;

    const roomName = `order_${order_id}`;
    socket.leave(roomName);

    if (orderRooms[order_id]) {
      orderRooms[order_id].delete(socket.id);
      if (orderRooms[order_id].size === 0) delete orderRooms[order_id];
    }
  });

  // admin tracking dekhne aaya hai
  socket.on('admin:subscribe', () => {
    socket.join('admin_tracking');
    console.log(`🔑 Admin ${socket.id} joined admin_tracking`);

    // send all active drivers
    socket.emit('admin:active_drivers', {
      drivers: Object.values(activeDrivers),
      count: Object.keys(activeDrivers).length
    });
  });

  // active drivers ki list nikal rahe han
  socket.on('tracking:get_active_drivers', () => {
    socket.emit('admin:active_drivers', {
      drivers: Object.values(activeDrivers),
      count: Object.keys(activeDrivers).length
    });
  });

  // jab koi chala jaye (disconnect)
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);

    for (const [orderId, driver] of Object.entries(activeDrivers)) {
      if (driver.socketId === socket.id) {
        console.log(`🚫 Driver disconnected for Order #${orderId}`);
        io.to(`order_${orderId}`).emit('tracking:driver_offline', {
          order_id: orderId,
          timestamp: Date.now()
        });
      }
    }

    for (const [orderId, watchers] of Object.entries(orderRooms)) {
      watchers.delete(socket.id);
      if (watchers.size === 0) delete orderRooms[orderId];
    }
  });
});

// har 30 second baad puray drivers ko saaf kar rahe han
setInterval(() => {
  const now = Date.now();
  const STALE_THRESHOLD = 2 * 60 * 1000;

  for (const [orderId, driver] of Object.entries(activeDrivers)) {
    if (now - driver.lastUpdate > STALE_THRESHOLD) {
      console.log(`🗑️ Removing stale driver for Order #${orderId} (last update: ${Math.round((now - driver.lastUpdate) / 1000)}s ago)`);
      
      io.to(`order_${orderId}`).emit('tracking:driver_offline', {
        order_id: orderId,
        timestamp: now
      });
      
      delete activeDrivers[orderId];
    }
  }
}, 30000);

// server start kar rahe han
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🚚 Apni Chakki Tracking Server                      ║
║  ──────────────────────────────────────────────────── ║
║  Socket.io server running on port ${PORT}              ║
║  Health check: http://localhost:${PORT}/health          ║
║  Ready for real-time delivery tracking!               ║
╚═══════════════════════════════════════════════════════╝
  `);
});
