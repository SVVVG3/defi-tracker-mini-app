import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// JWT Secret (should be in env variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

type AuthHeader = {
  Authorization?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract authorization token from header
    const authHeader = req.headers as AuthHeader;
    const token = authHeader.Authorization?.split(' ')[1]; // Extract token from "Bearer <token>"
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Verify the JWT token
      const decodedToken = jwt.verify(token, JWT_SECRET) as any;
      const { fid } = decodedToken;
      
      // Get notification data from request body
      const { 
        positionId, 
        appName, 
        tokenPair,
        currentPrice,
        priceRange
      } = req.body;
      
      if (!positionId || !appName || !tokenPair) {
        return res.status(400).json({ error: 'Missing required notification data' });
      }
      
      // Send notification using Neynar API
      const notificationResult = await sendFarcasterNotification({
        fid,
        positionId,
        appName,
        tokenPair,
        currentPrice,
        priceRange
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Notification sent successfully',
        details: notificationResult
      });
    } catch (jwtError) {
      console.error('Error verifying JWT token:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}

// Function to send notification through Farcaster
async function sendFarcasterNotification({ 
  fid, 
  positionId, 
  appName, 
  tokenPair,
  currentPrice,
  priceRange
}: {
  fid: number;
  positionId: string;
  appName: string;
  tokenPair: string;
  currentPrice?: string;
  priceRange?: { lower: string; upper: string };
}) {
  // Check if Neynar API key is available
  if (!NEYNAR_API_KEY) {
    throw new Error('Neynar API key not configured');
  }
  
  try {
    // Create notification message
    const notificationTitle = `Position Out of Range`;
    const notificationBody = `Your ${appName} ${tokenPair} position is now out of range. ${
      currentPrice && priceRange 
        ? `Current price: ${currentPrice}, Range: ${priceRange.lower} - ${priceRange.upper}`
        : ''
    }`;
    
    // Use Neynar API to send notification
    // Note: This is a placeholder implementation - replace with actual Neynar API call
    // when documentation becomes available
    
    // For now, we'll simulate a successful notification
    // In production, you'd make an API call here
    
    console.log(`Notification to FID ${fid}:`, {
      title: notificationTitle,
      body: notificationBody
    });
    
    return {
      delivered: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Farcaster notification error:', error);
    throw new Error('Failed to send Farcaster notification');
  }
} 