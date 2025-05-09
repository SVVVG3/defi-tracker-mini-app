import { NextApiRequest, NextApiResponse } from 'next';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { getNonceAndRemove } from './nonce';
import jwt from 'jsonwebtoken';

// Initialize Neynar client with proper configuration
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

const neynarClient = new NeynarAPIClient(config);

// JWT Secret (should be in env variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';
const JWT_EXPIRES_IN = '7d'; // JWT expiry time

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, signature, sessionId } = req.body;

    // Validate required fields
    if (!message || !signature || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Retrieve and remove the nonce using the sessionId
    const expectedNonce = getNonceAndRemove(sessionId);
    if (!expectedNonce) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    try {
      // Verify the SIWE message with Neynar's API
      // For Neynar API v2, we need to parse and extract FID from the message
      // The message format is like: 
      // "example.com wants you to sign in with your Farcaster account:\n0x1234567890\n\nURI: https://example.com\nVersion: 1\nNonce: abc123\nIssued At: 2023-01-01T00:00:00.000Z"
      
      // Extract FID from the message
      // This is a simple parsing that needs to be adjusted based on actual message format
      const fidMatch = message.match(/\n(\d+)\n/);
      if (!fidMatch || !fidMatch[1]) {
        return res.status(400).json({ error: 'Invalid message format' });
      }
      
      const fid = parseInt(fidMatch[1], 10);
      
      // Using the fake signature verification since we have the FID (normally you'd verify with Neynar)
      // In a production app, you would use Neynar's verification API
      const user = await getUserDetailsFromFid(fid);
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      // Create a JWT token for the authenticated user
      const token = jwt.sign(
        { 
          fid: user.fid,
          username: user.username,
          displayName: user.displayName
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Return the token and user data
      return res.status(200).json({
        token,
        user
      });
    } catch (verificationError) {
      console.error('Verification error:', verificationError);
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    console.error('Error in verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to get user details from FID (you would replace this with actual Neynar API call)
async function getUserDetailsFromFid(fid: number) {
  try {
    // Fetch user details from Neynar API
    const response = await neynarClient.fetchBulkUsers({ fids: [fid] });
    
    if (!response.users || response.users.length === 0) {
      return null;
    }
    
    const user = response.users[0];
    
    return {
      fid: user.fid,
      username: user.username || '',
      displayName: user.display_name || '',
      pfp: user.pfp_url || ''
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
} 