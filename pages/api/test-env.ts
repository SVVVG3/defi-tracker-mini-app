import { NextApiRequest, NextApiResponse } from 'next';
import env from '../../src/utils/environment';

/**
 * Test Environment Variables API
 * This is a diagnostic endpoint to verify environment variables are properly loaded
 * DO NOT use in production as it may expose sensitive configuration
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'This endpoint is only available in development mode' });
  }
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Collect environment information
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    nextPublicKeys: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((obj, key) => {
        // Only show first few characters of values for security
        obj[key] = typeof process.env[key] === 'string' ? 
          `${(process.env[key] as string).substring(0, 4)}...` : 
          process.env[key];
        return obj;
      }, {} as Record<string, any>),
    envHelperValues: {
      zapperApiKey: env.getZapperApiKey() ? 
        `${env.getZapperApiKey().substring(0, 4)}... (${env.getZapperApiKey().length} chars)` : 
        'Not found',
      isDevelopment: env.isDevelopment(),
      isProduction: env.isProduction(),
    },
    systemInfo: {
      platform: process.platform,
      nodeVersion: process.version,
    }
  };
  
  // Return the environment information
  return res.status(200).json(envInfo);
} 