import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, ApiError } from '../../utils/api-error-handler';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// JWT Secret (should be in env variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';
const ZAPPER_API_KEY = process.env.ZAPPER_API_KEY || '';

// Simple cache for positions to reduce API calls
type CacheEntry = {
  data: any;
  timestamp: number;
};

// Cache positions for 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;
const positionsCache: Record<string, CacheEntry> = {};

type AuthHeader = {
  Authorization?: string;
};

// Handler function
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET method
  if (req.method !== 'GET') {
    throw ApiError.badRequest('Method not allowed', 'METHOD_NOT_ALLOWED');
  }
  
  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  
  // Extract token
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw ApiError.unauthorized('Valid token required', 'INVALID_TOKEN');
  }

  try {
    // Verify JWT
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token', 'TOKEN_INVALID');
  }
  
  // Get addresses from query params
  const { addresses } = req.query;
  if (!addresses) {
    throw ApiError.badRequest('No addresses provided', 'MISSING_ADDRESSES');
  }

  const addressList = Array.isArray(addresses) ? addresses : [addresses];
  
  // Build cache key
  const cacheKey = `positions:${addressList.join(',')}`;
  
  // Check cache
  const now = Date.now();
  if (positionsCache[cacheKey] && now - positionsCache[cacheKey].timestamp < CACHE_TTL_MS) {
    console.log('Returning cached position data');
    return res.status(200).json(positionsCache[cacheKey].data);
  }
  
  try {
    // Fetch positions from Zapper API
    const positions = await fetchPositionsFromZapper(addressList);
    
    // Store in cache
    positionsCache[cacheKey] = {
      data: positions,
      timestamp: now
    };
    
    return res.status(200).json(positions);
  } catch (err) {
    console.error('Error fetching positions:', err);
    throw ApiError.internal('Failed to fetch position data', 'FETCH_FAILED');
  }
}

// Function to fetch positions from Zapper API
async function fetchPositionsFromZapper(addresses: string[]) {
  // Check if Zapper API key is available
  if (!ZAPPER_API_KEY) {
    throw new Error('Zapper API key not configured');
  }
  
  try {
    // Normalize addresses to lowercase
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
    
    // Get Base chain positions (chainId = 8453)
    const response = await axios.get('https://api.zapper.xyz/v2/positions', {
      headers: {
        'Authorization': `Basic ${ZAPPER_API_KEY}`
      },
      params: {
        'addresses[]': normalizedAddresses,
        'network': 'base',
        'bundled': true
      }
    });
    
    // Process the response to extract the relevant positions
    // Focus on liquidity pool positions, especially Uniswap v3 positions
    const allPositions = response.data?.positions || [];
    
    // Process and structure the positions
    return processPositions(allPositions);
  } catch (error) {
    console.error('Zapper API error:', error);
    throw new Error('Failed to fetch positions from Zapper');
  }
}

// Process and structure the positions data
function processPositions(positions: any[]) {
  // Filter for liquidity positions and structure them
  const liquidityPositions = positions.filter(position => {
    // Filter for liquidity pool positions
    return (
      position.appId === 'uniswap-v3' || 
      position.appId === 'aerodrome' ||
      position.appId === 'balancer-v2' ||
      position.appId === 'curve'
    );
  }).map(position => {
    // Extract relevant information
    return {
      id: position.key || position.id,
      appName: position.appName || position.appId,
      type: position.type || 'liquidity',
      label: position.label || position.name,
      value: position.value || 0,
      tokens: position.tokens || [],
      // Additional data for concentrated liquidity positions
      isInRange: position.isInRange !== undefined ? position.isInRange : true,
      lowerPrice: position.lowerPrice,
      upperPrice: position.upperPrice,
      currentPrice: position.currentPrice,
      // Add contract address and related info
      address: position.address,
      network: position.network || 'base',
      // Add position-specific information
      metadata: position.metadata || {},
    };
  });
  
  return {
    positions: liquidityPositions,
    summary: {
      totalPositions: liquidityPositions.length,
      totalValue: liquidityPositions.reduce((sum: number, pos: any) => sum + (pos.value || 0), 0),
      outOfRangeCount: liquidityPositions.filter((pos: any) => pos.isInRange === false).length
    }
  };
}

// Export the handler with error handling
export default withErrorHandler(handler); 