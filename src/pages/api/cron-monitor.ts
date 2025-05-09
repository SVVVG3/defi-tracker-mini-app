import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, ApiError } from '../../utils/api-error-handler';
import axios from 'axios';

/**
 * This endpoint is called by Vercel Cron Jobs to monitor positions and send notifications.
 * It securely calls the main monitor API internally.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    throw ApiError.badRequest('Method not allowed', 'METHOD_NOT_ALLOWED');
  }
  
  // Validate cron authorization
  // Vercel Cron sends an Authorization header with a token matching CRON_SECRET
  const authHeader = req.headers.authorization;
  
  // In production, validate the cron secret
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET environment variable is not set!');
      throw ApiError.internal('Server configuration error', 'MISSING_CRON_SECRET');
    }
    
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      throw ApiError.unauthorized('Unauthorized', 'INVALID_CRON_SECRET');
    }
  }
  
  try {
    // Call the internal monitor API with the monitor API key
    const monitorApiKey = process.env.MONITOR_API_KEY;
    
    if (!monitorApiKey) {
      throw ApiError.internal('MONITOR_API_KEY not configured', 'MISSING_API_KEY');
    }
    
    // Log the start of the monitoring job
    console.log(`[CRON] Starting monitoring job at ${new Date().toISOString()}`);
    
    // Call the internal monitor API
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/monitor`, 
      {},
      {
        headers: {
          'Authorization': `Bearer ${monitorApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[CRON] Monitoring complete, processed ${response.data.monitored || 0} positions`);
    
    // Return the monitor API response
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...response.data
    });
  } catch (error: any) {
    console.error('[CRON] Error during monitoring:', error);
    
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: error.response.data?.error || 'Failed to run monitoring job',
        code: error.response.data?.code || 'MONITOR_ERROR'
      });
    }
    
    throw ApiError.internal('Failed to run monitoring job', 'MONITOR_ERROR');
  }
}

// Export with error handling
export default withErrorHandler(handler); 