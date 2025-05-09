import { NextApiRequest, NextApiResponse } from 'next';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import jwt from 'jsonwebtoken';

// Initialize Neynar client with proper configuration
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

const neynarClient = new NeynarAPIClient(config);

// JWT Secret (should be in env variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';

type AuthHeader = {
  Authorization?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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
      const decodedToken = jwt.verify(token, JWT_SECRET) as { fid: number };
      
      // Get FID from JWT token or from query params (for development)
      const { fid } = req.query;
      const numericFid = fid ? parseInt(fid as string, 10) : decodedToken.fid;
      
      if (isNaN(numericFid)) {
        return res.status(400).json({ error: 'Invalid FID format' });
      }

      // Get user details including connected wallets from Neynar API
      const userResponse = await neynarClient.fetchBulkUsers({ fids: [numericFid] });
      const user = userResponse.users[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Extract verified addresses from user data
      const ethAddresses = user.verified_addresses?.eth_addresses || [];
      const solAddresses = user.verified_addresses?.sol_addresses || [];

      // Return the list of wallet addresses
      return res.status(200).json({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        wallets: {
          eth: ethAddresses,
          sol: solAddresses,
        },
        custody_address: user.custody_address,
      });
    } catch (jwtError) {
      console.error('Error verifying JWT token:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return res.status(500).json({ error: 'Failed to fetch wallets' });
  }
} 