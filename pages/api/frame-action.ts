import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Frame Action API Handler
 * This endpoint handles button clicks from Farcaster Frames
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set appropriate CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests (Farcaster sends POST for button actions)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the incoming request for debugging
    console.log('Frame Action Request:', {
      headers: req.headers,
      body: req.body,
    });

    // Parse the frame message from the request
    const frameMessage = req.body;
    
    // Get the button index that was clicked (1-indexed)
    const buttonIndex = frameMessage?.untrustedData?.buttonIndex || 0;
    
    // Get the user's FID (Farcaster ID) if available
    const fid = frameMessage?.untrustedData?.fid;
    
    console.log(`Button ${buttonIndex} clicked by user ${fid}`);

    // Respond with a new frame based on the button clicked
    switch (buttonIndex) {
      case 1:
        // Main action - Track DeFi Positions
        return res.status(200).json({
          frames: {
            version: 'vNext',
            image: 'https://defi-tracker.vercel.app/og-image.png',
            buttons: [
              {
                label: 'View My Positions',
                action: 'post',
              },
              {
                label: 'Back',
                action: 'post',
              }
            ],
          }
        });
      
      default:
        // Default response for any other button or if buttonIndex is missing
        return res.status(200).json({
          frames: {
            version: 'vNext',
            image: 'https://defi-tracker.vercel.app/og-image.png',
            buttons: [
              {
                label: 'Track My DeFi Positions',
                action: 'post',
              }
            ],
          }
        });
    }
  } catch (error) {
    console.error('Error handling frame action:', error);
    return res.status(500).json({ 
      error: 'Failed to process frame action',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 