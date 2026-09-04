import 'dotenv/config';
import { connectDatabase } from './config/database';
import { initializeRedis, closeRedis } from './config/redis';
import { createApp } from './config/app';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🚀 Starting Event Ticket Booking Platform...');

    // Connect to MongoDB
    await connectDatabase();

    // Initialize Redis
    await initializeRedis();

    // Create Express app with Socket.IO
    const { app: _expressApp, httpServer, io: _ioServer } = createApp();

    // TODO: Register routes
    // TODO: Setup Socket.IO event handlers
    // TODO: Register error handlers

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ WebSocket server ready for connections`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📍 Received ${signal}. Shutting down gracefully...`);
      
      // Stop accepting new connections
      httpServer.close(async () => {
        console.log('HTTP server closed');
        
        // Close Redis
        await closeRedis();
        
        // Disconnect MongoDB
        await require('./config/database').disconnectDatabase();
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('❌ Force shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
