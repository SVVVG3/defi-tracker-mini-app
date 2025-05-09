import { NextApiRequest, NextApiResponse } from 'next';
import { isTestEndpointsEnabled } from '../../../utils/feature-flags';

// This endpoint is only available when test endpoints are enabled
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow when test endpoints are enabled
  if (!isTestEndpointsEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get addresses from query params
    const { addresses } = req.query;
    
    if (!addresses) {
      return res.status(400).json({ error: 'No addresses provided' });
    }
    
    // Log the request for debugging
    console.log('Test positions-standalone request:', {
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
  } catch (error) {
    console.error('Error in test positions endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 