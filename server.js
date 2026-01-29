const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const ws = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const devices = new Map(); // Store connected devices

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 100 * 1024 * 1024, // 100MB for file transfers
    pingTimeout: 300000, // 5 minutes - very long timeout to handle inactive periods
    pingInterval: 60000, // 1 minute ping interval - check less frequently
    connectTimeout: 60000, // 1 minute connection timeout
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    cookie: false, // because we don't use cookies for auth
    perMessageDeflate: false, // Disable compression for stability
    // Additional settings to prevent disconnections
    allowUpgrades: true,
    httpCompression: false,
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle device registration
    socket.on('register-device', (deviceName) => {
      devices.set(socket.id, { id: socket.id, name: deviceName });
      console.log(`Device registered: ${deviceName} (${socket.id})`);
      
      // Broadcast updated device list to all clients
      broadcastDeviceList();
    });

    // Handle chat messages
    socket.on('send-message', ({ targetId, message, senderId, senderName }) => {
      console.log(`Message from ${senderName} to ${targetId}: ${message}`);
      
      // Send to target device
      io.to(targetId).emit('receive-message', {
        message,
        senderId,
        senderName,
        timestamp: Date.now()
      });
    });

    // Handle file metadata
    socket.on('send-file-metadata', ({ targetId, fileData }) => {
      console.log(`File metadata from ${socket.id} to ${targetId}:`, fileData.name);
      
      // Send to target device
      io.to(targetId).emit('receive-file-metadata', {
        fileData,
        senderId: socket.id,
        senderName: devices.get(socket.id)?.name || 'Unknown'
      });
    });

    // Handle file chunk transfer
    socket.on('send-file-chunk', ({ targetId, chunk, transferId }) => {
      io.to(targetId).emit('receive-file-chunk', {
        chunk,
        transferId,
        senderId: socket.id
      });
    });

    // Handle file transfer complete
    socket.on('file-transfer-complete', ({ targetId, transferId }) => {
      io.to(targetId).emit('file-transfer-completed', {
        transferId,
        senderId: socket.id
      });
    });

    // Handle file transfer cancel
    socket.on('cancel-file-transfer', ({ targetId, transferId }) => {
      io.to(targetId).emit('file-transfer-cancelled', {
        transferId,
        senderId: socket.id
      });
    });

    // Handle heartbeat to keep connection alive
    socket.on('heartbeat', () => {
      console.log(`Heartbeat received from ${devices.get(socket.id)?.name || socket.id} at ${new Date().toISOString()}`);
      // Respond to heartbeat to confirm connection is alive
      socket.emit('heartbeat-response');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      devices.delete(socket.id);
      broadcastDeviceList();
    });

    // Send initial device list to new connection
    socket.emit('device-list', Array.from(devices.values()).filter(d => d.id !== socket.id));
  });

  function broadcastDeviceList() {
    const deviceList = Array.from(devices.values());
    
    // Send to each device their own filtered list (excluding themselves)
    devices.forEach((device, socketId) => {
      const filteredList = deviceList.filter(d => d.id !== socketId);
      io.to(socketId).emit('device-list', filteredList);
    });
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
