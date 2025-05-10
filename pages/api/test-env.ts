import { NextApiRequest, NextApiResponse } from 'next';

// Test endpoint to verify environment variables and API access
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set appropriate CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get environment variables (without exposing sensitive data)
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    
    // Zapper API Key info (partial)
    ZAPPER_API_KEY_EXISTS: !!process.env.ZAPPER_API_KEY,
    ZAPPER_API_KEY_LENGTH: process.env.ZAPPER_API_KEY ? process.env.ZAPPER_API_KEY.length : 0,
    ZAPPER_API_KEY_PREFIX: process.env.ZAPPER_API_KEY ? 
      `${process.env.ZAPPER_API_KEY.substring(0, 4)}...` : 'none',
    
    // Feature flags
    NEXT_PUBLIC_BASE_URL_EXISTS: !!process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_ENABLE_TEST_ENDPOINT_EXISTS: !!process.env.NEXT_PUBLIC_ENABLE_TEST_ENDPOINT,
    
    // Deployment info
    VERCEL_ENV: process.env.VERCEL_ENV || 'not_vercel',
    VERCEL_URL: process.env.VERCEL_URL || 'not_vercel',
  };
  
  // Check for runtime environment details
  const runtimeInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  
  // Get request metadata
  const requestInfo = {
    host: req.headers.host,
    referer: req.headers.referer,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    forwardedFor: req.headers['x-forwarded-for'],
    realIp: req.headers['x-real-ip'],
    protocol: req.headers['x-forwarded-proto'] || 'http',
  };
  
  // Return environment information (safe, no actual secrets)
  res.status(200).json({
    environment: envVars,
    runtime: runtimeInfo,
    request: requestInfo,
    message: "Environment test endpoint - use for debugging only"
  });
} 