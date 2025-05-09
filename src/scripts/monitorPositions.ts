/**
 * Background monitoring script for DeFi positions
 * 
 * This script is intended to be run as a scheduled task to:
 * 1. Check for out-of-range positions for all users
 * 2. Send notifications for positions that have moved out of range
 * 
 * Usage:
 * - Direct execution: `ts-node src/scripts/monitorPositions.ts`
 * - With cron: Setup a crontab entry to run this script at regular intervals
 */

import cron from 'node-cron';
import dotenv from 'dotenv';
import { runMonitor } from '../utils/backgroundMonitor';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Function to run monitor job directly
async function runMonitorJob() {
  console.log('Starting manual monitor job run...');
  try {
    const result = await runMonitor();
    console.log('Monitor job completed successfully:', result);
  } catch (error) {
    console.error('Error running monitor job:', error);
  }
}

// Check if this script is being run directly or imported
if (require.main === module) {
  // Check if we should run once or schedule
  const runOnce = process.argv.includes('--run-once');
  
  if (runOnce) {
    // Run once and exit
    runMonitorJob().finally(() => process.exit(0));
  } else {
    // Schedule to run every 15 minutes
    console.log('Scheduling monitor job to run every 15 minutes...');
    
    // Run immediately on startup
    runMonitorJob();
    
    // Then schedule to run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('Running scheduled monitor job...');
      try {
        const result = await runMonitor();
        console.log('Scheduled monitor job completed:', result);
      } catch (error) {
        console.error('Error in scheduled monitor job:', error);
      }
    });
    
    console.log('Monitor job scheduler is running. Press Ctrl+C to exit.');
  }
} 