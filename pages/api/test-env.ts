import { NextApiRequest, NextApiResponse } from 'next';

// Simple test endpoint to verify environment variables
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get environment variables
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    // Check if Zapper API key exists (don't return the actual key)
    ZAPPER_API_KEY_EXISTS: !!process.env.ZAPPER_API_KEY,
    ZAPPER_API_KEY_LENGTH: process.env.ZAPPER_API_KEY ? process.env.ZAPPER_API_KEY.length : 0,
    // Check other environment variables
    NEXT_PUBLIC_BASE_URL_EXISTS: !!process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_ENABLE_TEST_ENDPOINT_EXISTS: !!process.env.NEXT_PUBLIC_ENABLE_TEST_ENDPOINT
  };
  
  // Return safe environment information
  res.status(200).json({
    environment: envVars,
    requestHeaders: {
      host: req.headers.host,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    }
  });
} 