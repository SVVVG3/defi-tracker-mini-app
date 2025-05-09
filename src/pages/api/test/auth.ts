import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { isTestEndpointsEnabled } from '../../../utils/feature-flags';

// This endpoint is only available when test endpoints are enabled
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow when test endpoints are enabled
  if (!isTestEndpointsEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a mock user
    const user = {
      fid: 12345,
      username: 'testuser',
      displayName: 'Test User'
    };
    
    // Generate a mock JWT token
    // In a real app, use a secure secret from environment variables
    const secret = process.env.JWT_SECRET || 'test-secret-do-not-use-in-production';
    const token = jwt.sign(user, secret, { expiresIn: '7d' });
    
    return res.status(200).json({
      token,
      user,
      message: 'Mock authentication successful'
    });
  } catch (error) {
    console.error('Error in test auth endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 