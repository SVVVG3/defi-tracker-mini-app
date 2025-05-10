import { Position, PositionStatusChange } from './position-checker';

// Types for notification
export interface Notification {
  id: string;
  userId: string;
  fid: number;
  positionId: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: number;
  sentAt?: number;
  retryCount: number;
}

// Interface for notification handler
export interface NotificationHandler {
  sendNotification(notification: Notification): Promise<boolean>;
}

// Default notification handler
class DefaultNotificationHandler implements NotificationHandler {
  async sendNotification(notification: Notification): Promise<boolean> {
    try {
      console.log(`[DefaultNotificationHandler] Sending notification to user ${notification.userId}:`, notification.message);
      
      // Make API call to send notification
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: notification.fid,
          message: notification.message,
        }),
      });
      
      if (!response.ok) {
        console.error(`Failed to send notification: ${response.status} ${response.statusText}`);
        return false;
      }
      
      console.log(`Successfully sent notification to user ${notification.userId}`);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }
}

// Notification manager
export class NotificationManager {
  private notifications: Map<string, Notification> = new Map(); // notificationId -> notification
  private notificationHandler: NotificationHandler;
  private notificationQueue: string[] = []; // Queue of notification IDs
  private isProcessing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly maxRetries: number = 3;
  private readonly retryIntervalMs: number = 60000; // 1 minute
  private readonly cooldownPeriodMs: number = 3600000; // 1 hour cooldown between notifications for the same position

  constructor(notificationHandler?: NotificationHandler) {
    this.notificationHandler = notificationHandler || new DefaultNotificationHandler();
  }

  /**
   * Start notification processing
   */
  start(intervalMs: number = 10000) { // Process notifications every 10s by default
    if (this.processInterval) {
      console.log('Notification manager already running');
      return;
    }
    
    this.processInterval = setInterval(() => {
      this.processNotificationQueue();
    }, intervalMs);
    
    console.log(`Started notification manager with processing interval of ${intervalMs}ms`);
  }

  /**
   * Stop notification processing
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('Stopped notification manager');
    }
  }

  /**
   * Handle position status change
   */
  handlePositionStatusChange(statusChange: PositionStatusChange, userId: string, fid: number) {
    const { position, previousStatus, currentStatus, price, timestamp } = statusChange;
    
    // Only send notifications for positions going out of range
    if (previousStatus && !currentStatus) {
      console.log(`Creating notification for position ${position.id} going out of range`);
      
      // Check if we've recently notified for this position
      if (this.shouldThrottleNotification(position)) {
        console.log(`Throttling notification for position ${position.id} due to cooldown period`);
        return;
      }
      
      // Create notification
      const notification: Notification = {
        id: `notification_${position.id}_${timestamp}`,
        userId,
        fid,
        positionId: position.id,
        message: this.createNotificationMessage(position, price),
        status: 'pending',
        createdAt: timestamp,
        retryCount: 0,
      };
      
      // Add to notification store and queue
      this.notifications.set(notification.id, notification);
      this.notificationQueue.push(notification.id);
      
      console.log(`Added notification ${notification.id} to queue`);
      
      // Start processing if not already started
      if (!this.processInterval) {
        this.start();
      }
    }
  }

  /**
   * Check if we should throttle notification for a position
   */
  private shouldThrottleNotification(position: Position): boolean {
    const lastNotified = position.lastNotified;
    
    if (!lastNotified) {
      return false;
    }
    
    const now = Date.now();
    return (now - lastNotified) < this.cooldownPeriodMs;
  }

  /**
   * Create notification message
   */
  private createNotificationMessage(position: Position, price: number): string {
    // Format the message
    const tokenSymbols = position.tokens.map(t => t.symbol).join('/');
    
    return `Your ${position.appName} ${tokenSymbols} position is now out of range. Current price: $${price.toFixed(4)}`;
  }

  /**
   * Process the notification queue
   */
  private async processNotificationQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get the next notification from the queue
      const notificationId = this.notificationQueue.shift();
      
      if (!notificationId) {
        this.isProcessing = false;
        return;
      }
      
      const notification = this.notifications.get(notificationId);
      
      if (!notification) {
        console.error(`Notification ${notificationId} not found in store`);
        this.isProcessing = false;
        return;
      }
      
      console.log(`Processing notification ${notificationId}`);
      
      // Send the notification
      const success = await this.notificationHandler.sendNotification(notification);
      
      if (success) {
        // Update notification status
        notification.status = 'sent';
        notification.sentAt = Date.now();
        console.log(`Successfully sent notification ${notificationId}`);
      } else {
        // Handle failure
        notification.retryCount += 1;
        
        if (notification.retryCount >= this.maxRetries) {
          notification.status = 'failed';
          console.log(`Notification ${notificationId} failed after ${this.maxRetries} retries`);
        } else {
          // Re-queue the notification for retry
          setTimeout(() => {
            console.log(`Re-queuing notification ${notificationId} for retry (attempt ${notification.retryCount + 1})`);
            this.notificationQueue.push(notificationId);
          }, this.retryIntervalMs);
        }
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): Notification[] {
    return Array.from(this.notifications.values()).filter(n => n.status === 'pending');
  }

  /**
   * Get failed notifications
   */
  getFailedNotifications(): Notification[] {
    return Array.from(this.notifications.values()).filter(n => n.status === 'failed');
  }
}

/**
 * Create and return a notification manager
 */
export function createNotificationManager(notificationHandler?: NotificationHandler) {
  return new NotificationManager(notificationHandler);
} 