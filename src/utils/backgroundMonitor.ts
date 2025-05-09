/**
 * Background Monitor Utility
 * 
 * This script is intended to be run as a scheduled job (e.g., via cron) to:
 * 1. Fetch all active users with their wallet addresses
 * 2. Check their DeFi positions
 * 3. Send notifications for out-of-range positions
 * 
 * Example usage with node-cron:
 * ```
 * import cron from 'node-cron';
 * import { runMonitor } from './backgroundMonitor';
 * 
 * // Run every 15 minutes
 * cron.schedule('*/15 * * * *', async () => {
 *   await runMonitor();
 * });
 * ```
 */

import axios from 'axios';
import { fetchPositionsFromZapper, findOutOfRangePositions } from './positions';

// Local environment variables
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const MONITOR_API_KEY = process.env.MONITOR_API_KEY || 'development-key';

/**
 * Main function to run the monitoring process
 */
export async function runMonitor() {
  try {
    console.log('Starting DeFi position monitor job...');
    
    // In a real application, you would fetch active users from a database
    // For this sample app, we'll use a simulated list of users
    const users = await getActiveUsers();
    
    if (users.length === 0) {
      console.log('No active users found');
      return;
    }
    
    console.log(`Found ${users.length} active users to check`);
    
    // Call the monitor API
    const response = await axios.post(
      `${BASE_URL}/api/monitor`,
      { users },
      {
        headers: {
          'x-api-key': MONITOR_API_KEY
        }
      }
    );
    
    // Log the results
    console.log('Monitor job completed:');
    console.log(`- Processed: ${response.data.processed} users`);
    console.log(`- Successful: ${response.data.results.filter((r: any) => r.status === 'fulfilled' && r.value?.status === 'success').length}`);
    console.log(`- Failed: ${response.data.results.filter((r: any) => r.status === 'rejected' || r.value?.status === 'error').length}`);
    
    return response.data;
  } catch (error) {
    console.error('Error running monitor job:', error);
    throw new Error('Monitor job failed');
  }
}

/**
 * Get a list of active users with their wallet addresses and auth tokens
 * In a real application, this would fetch from a database
 */
async function getActiveUsers() {
  // This is a placeholder function
  // In a real application, you would fetch users from a database
  // with their authentication tokens and wallet addresses
  
  // Return a simulated list for demonstration
  return [
    // Add test users here for development/testing
    // Example:
    // {
    //   fid: 12345,
    //   addresses: ['0x123...', '0x456...'],
    //   farcasterToken: 'jwt_token_here'
    // }
  ];
}

// If this file is executed directly (not imported)
if (require.main === module) {
  runMonitor()
    .then(() => console.log('Monitor job executed successfully'))
    .catch(err => console.error('Monitor job failed:', err))
    .finally(() => process.exit());
} 