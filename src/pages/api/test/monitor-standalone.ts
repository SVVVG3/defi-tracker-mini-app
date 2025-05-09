import { NextApiRequest, NextApiResponse } from 'next';
import { isTestEndpointsEnabled } from '../../../utils/feature-flags';

// This endpoint is only available when test endpoints are enabled
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow when test endpoints are enabled
  if (!isTestEndpointsEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Allow both GET and POST for easier testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the request for debugging
    console.log('Test monitor-standalone received request');
    
    // Return mock monitoring data
    return res.status(200).json({
      monitored: 3,
      outOfRange: 1,
      notificationsTriggered: 1,
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
          isInRange: false, // This is out of range
          tokens: [{ symbol: 'WETH' }, { symbol: 'USDC' }],
          notification: {
            sent: true,
            timestamp: new Date().toISOString()
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error in test monitor endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 