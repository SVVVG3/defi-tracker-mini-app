#!/usr/bin/env node

/**
 * Vercel Monitor Script
 * 
 * This script is designed to be run as a Vercel Cron Job to monitor DeFi positions
 * and send notifications when positions go out of range.
 * 
 * Usage: 
 * Setup in vercel.json with:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron-monitor",
 *       "schedule": "0 * /6 * * *"  // Run every 6 hours (remove the space between * and / in actual use)
 *     }
 *   ]
 * }
 * 
 * And create the endpoint at pages/api/cron-monitor.ts that calls the monitor API.
 */

const https = require('https');

// Configuration
const BASE_URL = process.env.VERCEL_URL || 
                 process.env.NEXT_PUBLIC_BASE_URL || 
                 'http://localhost:3000';
const MONITOR_API_KEY = process.env.MONITOR_API_KEY;

if (!MONITOR_API_KEY) {
  console.error('Error: MONITOR_API_KEY environment variable is not set');
  process.exit(1);
}

// Function to make the API request
async function callMonitorApi() {
  const apiPath = '/api/monitor';
  const fullUrl = `${BASE_URL}${apiPath}`;

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MONITOR_API_KEY}`
      }
    };

    const req = https.request(fullUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err.message}`));
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`Error making API request: ${e.message}`));
    });
    
    req.end();
  });
}

// Main execution
async function run() {
  console.log(`[${new Date().toISOString()}] Starting position monitoring job...`);
  
  try {
    const result = await callMonitorApi();
    
    console.log(`[${new Date().toISOString()}] Monitoring complete:`);
    console.log(`- Positions checked: ${result.monitored || 0}`);
    console.log(`- Out of range: ${result.outOfRange || 0}`);
    console.log(`- Notifications sent: ${result.notificationsTriggered || 0}`);
    
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during monitoring:`, error.message);
    process.exit(1);
  }
}

run(); 