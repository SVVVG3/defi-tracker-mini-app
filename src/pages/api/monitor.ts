import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { fetchPositionsFromZapper, findOutOfRangePositions } from '../../utils/positions';

/**
 * DEPRECATED: This cron-based monitoring system has been replaced by the WebSocket-based real-time monitoring system.
 * Please use the WebSocket server located in src/websocket/ for real-time monitoring.
 */

// This would be a secure API key for production use
const MONITOR_API_KEY = process.env.MONITOR_API_KEY || 'development-key';

// Track positions status to only notify on state changes
const positionStatusCache: Record<string, boolean> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return a message indicating this endpoint is deprecated
  return res.status(200).json({
    success: false,
    deprecated: true,
    message: "This monitoring API has been deprecated in favor of the WebSocket-based real-time monitoring system.",
    alternative: "Please use the WebSocket server for real-time monitoring."
  });

  // The code below is kept for reference but will not execute
  /*
  // Only allow POST requests with proper authorization
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key - this would be a more secure check in production
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== MONITOR_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user data from request body
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Process each user
    const results = await Promise.allSettled(
      users.map(async (user: any) => {
        try {
          const { fid, addresses, farcasterToken } = user;
          
          if (!fid || !addresses || !Array.isArray(addresses) || !farcasterToken) {
            return {
              fid,
              status: 'error',
              error: 'Missing required user data'
            };
          }
          
          // Check positions for this user
          const positions = await fetchPositionsFromZapper(addresses);
          
          // Find out-of-range positions
          const outOfRangePositions = findOutOfRangePositions(positions);
          
          // Send notifications for positions that just went out of range
          const notifications = await sendNotificationsIfNeeded(fid, outOfRangePositions, farcasterToken);
          
          return {
            fid,
            status: 'success',
            outOfRangePositions: outOfRangePositions.length,
            notificationsSent: notifications.length
          };
        } catch (error) {
          console.error(`Error processing user ${user.fid}:`, error);
          return {
            fid: user.fid,
            status: 'error',
            error: 'Failed to process user'
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      processed: users.length,
      results
    });
  } catch (error) {
    console.error('Error in monitor service:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
  */
}

// Helper function to send notifications only when a position changes state
async function sendNotificationsIfNeeded(fid: number, outOfRangePositions: any[], authToken: string) {
  const notifications = [];
  
  for (const position of outOfRangePositions) {
    const positionKey = `${fid}-${position.id}`;
    
    // Check if we've already notified about this position being out of range
    if (positionStatusCache[positionKey] === true) {
      continue;
    }
    
    try {
      // Send notification
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`,
        {
          positionId: position.id,
          appName: position.appName,
          tokenPair: position.label,
          currentPrice: position.currentPrice,
          priceRange: {
            lower: position.lowerPrice,
            upper: position.upperPrice
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      // Update cache to indicate we've notified about this position
      positionStatusCache[positionKey] = true;
      
      notifications.push({
        positionId: position.id,
        status: 'sent'
      });
    } catch (error) {
      console.error(`Failed to send notification for position ${position.id}:`, error);
      notifications.push({
        positionId: position.id,
        status: 'failed'
      });
    }
  }
  
  return notifications;
} 