import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

// JWT Secret (should be in env variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';

// This endpoint is only available in development mode
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract authorization token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Extract token from "Bearer <token>"
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Verify the JWT token
      const decodedToken = jwt.verify(token, JWT_SECRET) as any;
      
      // Get addresses from query params
      const { addresses } = req.query;
      
      if (!addresses) {
        return res.status(400).json({ error: 'No addresses provided' });
      }
      
      // Log the request for debugging
      console.log('Test positions request:', {
        user: decodedToken,
        addresses: Array.isArray(addresses) ? addresses : [addresses]
      });
      
      // Return mock position data
      return res.status(200).json({
        positions: [
          {
            id: 'uniswap-v3-eth-usdc',
            appName: 'Uniswap V3',
            label: 'ETH-USDC',
            value: 1250.75,
            isInRange: true,
            tokens: [{ symbol: 'ETH' }, { symbol: 'USDC' }]
          },
          {
            id: 'aerodrome-weth-usdc',
            appName: 'Aerodrome',
            label: 'WETH-USDC',
            value: 890.25,
            isInRange: false,
            tokens: [{ symbol: 'WETH' }, { symbol: 'USDC' }]
          },
          {
            id: 'balancer-v2-weth-usdc-dai',
            appName: 'Balancer V2',
            label: 'WETH-USDC-DAI',
            value: 1575.50,
            isInRange: true,
            tokens: [{ symbol: 'WETH' }, { symbol: 'USDC' }, { symbol: 'DAI' }]
          }
        ],
        summary: {
          totalPositions: 3,
          totalValue: 3716.50,
          outOfRangeCount: 1
        }
      });
    } catch (jwtError) {
      console.error('Error verifying JWT token:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Error in test positions endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 