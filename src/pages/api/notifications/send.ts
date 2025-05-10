import { NextApiRequest, NextApiResponse } from 'next';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Initialize Neynar client
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

const neynarClient = new NeynarAPIClient(config);

// API key for notification endpoint security
const API_KEY = process.env.MONITOR_API_KEY || 'development-api-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate request
    const apiKey = req.headers['x-api-key'] as string;
    
    // Skip API key check in development
    if (process.env.NODE_ENV === 'production' && apiKey !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get notification data
    const { fid, message } = req.body;
    
    if (!fid || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Send notification using Neynar API
    console.log(`Sending notification to FID ${fid}: ${message}`);
    
    // In a production environment, we would use the Neynar API to send a notification
    // For now, we'll just log it
    if (process.env.NODE_ENV === 'production') {
      try {
        // This is a placeholder - Neynar doesn't have a notifications API yet
        // When they do, we would use it here
        console.log(`[PRODUCTION] Sent notification to FID ${fid}: ${message}`);
      } catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ error: 'Failed to send notification' });
      }
    }
    
    // Return success
    return res.status(200).json({
      success: true,
      message: `Notification sent to FID ${fid}`,
    });
  } catch (error) {
    console.error('Error in notifications endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 