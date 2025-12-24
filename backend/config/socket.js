const socketIo = require('socket.io');

const configureSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    transports: ['websocket', 'polling']
  });

  // Track connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    const userId = socket.id;
    console.log('✅ User connected:', userId);
    connectedUsers.set(userId, {
      connectedAt: new Date(),
      rooms: new Set()
    });

    // Join user to their personal room
    socket.on('join-user', (userData) => {
      socket.join(`user-${userData.userId}`);
      console.log(`🎯 User ${userId} joined user room: user-${userData.userId}`);
    });

    // Join trip room
    socket.on('join-trip', (tripId) => {
      socket.join(`trip-${tripId}`);
      const user = connectedUsers.get(userId);
      if (user) {
        user.rooms.add(`trip-${tripId}`);
      }
      console.log(`🎯 User ${userId} joined trip: ${tripId}`);
    });

    // Leave trip room
    socket.on('leave-trip', (tripId) => {
      socket.leave(`trip-${tripId}`);
      const user = connectedUsers.get(userId);
      if (user) {
        user.rooms.delete(`trip-${tripId}`);
      }
      console.log(`🎯 User ${userId} left trip: ${tripId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', userId, 'Reason:', reason);
      connectedUsers.delete(userId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('🔌 Socket error for user', userId, ':', error);
    });

    // Force disconnect if too many connections from same origin
    socket.on('force-disconnect', () => {
      console.log('🛑 Force disconnecting user:', userId);
      socket.disconnect(true);
    });
  });

  // Clean up old connections periodically
  setInterval(() => {
    const now = new Date();
    let cleaned = 0;
    
    connectedUsers.forEach((user, userId) => {
      // If connection is older than 1 hour, disconnect
      if (now - user.connectedAt > 3600000) {
        const socket = io.sockets.sockets.get(userId);
        if (socket) {
          socket.disconnect(true);
          cleaned++;
        }
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old connections`);
    }
  }, 300000); // Check every 5 minutes

  return io;
};

module.exports = configureSocket;