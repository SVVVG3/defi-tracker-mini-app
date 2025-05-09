import { NextApiRequest, NextApiResponse } from 'next';

// This endpoint is only available in development mode
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'development-key') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user data from request body
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    console.log('Test monitor received request with users:', users.length);

    // Return mock response
    return res.status(200).json({
      success: true,
      processed: users.length,
      results: users.map(user => ({
        fid: user.fid,
        status: 'success',
        outOfRangePositions: 1,
        notificationsSent: 1
      })),
      mockNotifications: [
        {
          positionId: 'aerodrome-weth-usdc',
          appName: 'Aerodrome',
          tokenPair: 'WETH-USDC',
          status: 'sent'
        }
      ]
    });
  } catch (error) {
    console.error('Error in test monitor endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 