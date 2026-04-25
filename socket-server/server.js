// socket server for live tracking

const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
  // health check route
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

// storing active drivers and watchers
const activeDrivers = {};
const orderRooms = {};

// when someone connects
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // driver sends their location
  socket.on('driver:location_update', (data) => {
    const { order_id, latitude, longitude, heading, speed, driver_name, accuracy } = data;

    if (!order_id || latitude == null || longitude == null) {
      socket.emit('error', { message: 'Missing required fields: order_id, latitude, longitude' });
      return;
    }

    // save latest position
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

    // send to everyone watching this order
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

    // also send to admin
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

  // delivery done
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

  // customer wants to track their order
  socket.on('tracking:subscribe', (data) => {
    const { order_id } = data;
    if (!order_id) return;

    const roomName = `order_${order_id}`;
    socket.join(roomName);

    if (!orderRooms[order_id]) orderRooms[order_id] = new Set();
    orderRooms[order_id].add(socket.id);

    console.log(`👀 Customer ${socket.id} watching Order #${order_id} (${orderRooms[order_id].size} watchers)`);

    // send current location if driver is active
    if (activeDrivers[order_id]) {
      socket.emit('tracking:location_update', {
        ...activeDrivers[order_id],
        timestamp: activeDrivers[order_id].lastUpdate
      });
    }
  });

  // customer stops tracking
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

  // admin joins tracking room
  socket.on('admin:subscribe', () => {
    socket.join('admin_tracking');
    console.log(`🔑 Admin ${socket.id} joined admin_tracking`);

    // send all active drivers
    socket.emit('admin:active_drivers', {
      drivers: Object.values(activeDrivers),
      count: Object.keys(activeDrivers).length
    });
  });

  // get active drivers list
  socket.on('tracking:get_active_drivers', () => {
    socket.emit('admin:active_drivers', {
      drivers: Object.values(activeDrivers),
      count: Object.keys(activeDrivers).length
    });
  });

  // cleanup when someone disconnects
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

// removing stale drivers every 30 sec
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

// starting the server
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
