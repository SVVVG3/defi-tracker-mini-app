// Export all WebSocket components
export * from './server';
export * from './uniswap-listener';
export * from './position-checker';
export * from './notification-manager';

// Main monitoring system
import { initWebSocketServer } from './server';
import { createPositionChecker, PositionChecker } from './position-checker';
import { createNotificationManager, NotificationManager } from './notification-manager';

// Singleton instances
let positionChecker: PositionChecker | null = null;
let notificationManager: NotificationManager | null = null;

/**
 * Initialize the real-time monitoring system
 */
export function initRealTimeMonitoring(port: number = 3002) {
  // Initialize WebSocket server
  const { io } = initWebSocketServer(port);
  
  // Create position checker and notification manager
  positionChecker = createPositionChecker();
  notificationManager = createNotificationManager();
  
  // Start the position checker
  positionChecker.start();
  
  // Start the notification manager
  notificationManager.start();
  
  // When position status changes, send notification
  positionChecker.on('positionStatusChange', (statusChange) => {
    // For each connected user, check if they should receive a notification
    io.sockets.sockets.forEach((socket) => {
      const { user } = socket.data;
      
      if (user && user.fid) {
        // Check if the position belongs to this user
        // In a real implementation, this would check position ownership
        
        // For now, send notification to all connected users
        notificationManager?.handlePositionStatusChange(statusChange, user.username, user.fid);
        
        // Emit status change event to connected clients
        socket.emit('positionStatusChange', statusChange);
      }
    });
  });
  
  console.log('Real-time monitoring system initialized');
  
  return {
    io,
    positionChecker,
    notificationManager
  };
}

/**
 * Get the position checker instance
 */
export function getPositionChecker(): PositionChecker {
  if (!positionChecker) {
    positionChecker = createPositionChecker();
  }
  return positionChecker;
}

/**
 * Get the notification manager instance
 */
export function getNotificationManager(): NotificationManager {
  if (!notificationManager) {
    notificationManager = createNotificationManager();
  }
  return notificationManager;
} 