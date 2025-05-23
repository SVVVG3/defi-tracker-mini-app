import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import env from '../../src/utils/environment';

// API keys - Get from environment variables
const ZAPPER_API_KEY = env.getZapperApiKey();

// This endpoint is specifically for the Farcaster Mini App environment
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set appropriate CORS headers for the mini app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Debug info - log environment details for API key verification
  console.log('API Environment:', {
    nodeEnv: process.env.NODE_ENV,
    zapperKeyExists: !!ZAPPER_API_KEY,
    zapperKeyLength: ZAPPER_API_KEY ? ZAPPER_API_KEY.length : 0,
    zapperKeyStart: ZAPPER_API_KEY ? ZAPPER_API_KEY.substring(0, 4) : 'none',
    zapperKeyEnd: ZAPPER_API_KEY ? ZAPPER_API_KEY.substring(ZAPPER_API_KEY.length - 4) : 'none',
    isPlaceholder: ZAPPER_API_KEY?.includes('YOUR_'),
    vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ZAPPER') || k.includes('API') || k.includes('KEY')).join(', ')
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get addresses from query params - these should be the user's wallets
    const { addresses } = req.query;
    
    if (!addresses) {
      console.log('No addresses provided in request');
      return res.status(400).json({ error: 'No addresses provided' });
    }
    
    // Convert to array if not already
    const addressList = Array.isArray(addresses) ? addresses : addresses.split(',');
    
    // Log the request for debugging
    console.log('Mini app positions request:', { 
      addresses: addressList,
      addressCount: addressList.length
    });
    
    try {
      console.log('Using Zapper API to fetch real data');
      // Fetch positions from Zapper API for each address
      const positionsData = await Promise.all(
        addressList.map(async (address) => {
          try {
            // Log request to Zapper
            console.log(`Fetching data from Zapper for address: ${address}`);
            
            // Verify address format - should be a valid Ethereum address
            if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
              console.warn(`Invalid Ethereum address format: ${address}`);
              return { address, error: true, errorReason: 'Invalid address format' };
            }
            
            // Fetch from Zapper API
            const response = await axios.get(
              `https://api.zapper.xyz/v2/balances/apps`,
              {
                params: {
                  'addresses[]': address,
                  'networks[]': 'base', // Focus on Base network
                  'api_key': ZAPPER_API_KEY,
                },
                headers: {
                  accept: 'application/json',
                },
                timeout: 10000 // 10 second timeout
              }
            );
            
            console.log(`Got Zapper response for ${address}: status=${response.status}`);
            return { address, data: response.data };
          } catch (error) {
            console.error(`Error fetching data for address ${address}:`, error);
            // More detailed error logging for troubleshooting
            if (axios.isAxiosError(error)) {
              console.error('Axios error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url,
                params: error.config?.params
              });
              
              // Check for rate limiting
              if (error.response?.status === 429) {
                console.error('Zapper API rate limited, returning mock data');
                return { address, error: true, errorReason: 'Rate limited' };
              }
              
              // Check for API key errors
              if (error.response?.status === 401 || error.response?.status === 403) {
                console.error('Zapper API key invalid or unauthorized');
                return { address, error: true, errorReason: 'API key error' };
              }
            }
            return { address, error: true, errorReason: 'Unknown error' };
          }
        })
      );
      
      // Check if all requests failed with API key errors
      const allApiKeyErrors = positionsData.every(result => 
        result.error && (result.errorReason === 'API key error' || result.errorReason === 'Rate limited')
      );
      
      if (allApiKeyErrors) {
        console.error('All requests failed with API key issues, returning mock data');
        return returnMockData(res);
      }
      
      // Log processing status
      console.log(`Processing position data for ${positionsData.length} addresses`);
      
      // Process the data to extract positions
      let allPositions = [];
      let totalValue = 0;
      let outOfRangeCount = 0;
      let successfulAddresses = 0;
      
      for (const result of positionsData) {
        if (result.error) continue;
        
        successfulAddresses++;
        
        // Extract positions from Zapper data
        const appBalances = result.data?.balances || {};
        
        console.log(`Found ${Object.keys(appBalances).length} apps for address ${result.address}`);
        
        // Loop through all apps
        for (const appId in appBalances) {
          const app = appBalances[appId];
          
          // Extract products within each app
          for (const product of app.products || []) {
            // Focus only on liquidity pool assets
            if (product.label === 'Liquidity Pool' || product.label === 'Liquidity Positions') {
              for (const asset of product.assets || []) {
                // Create a position object for each asset
                const position = {
                  id: `${appId}-${asset.key || asset.address}`,
                  appName: app.appName || appId,
                  label: asset.label || 'Unnamed Position',
                  value: asset.balanceUSD || 0,
                  isInRange: asset.isInRange !== false, // Consider in range by default unless specifically marked
                  tokens: (asset.tokens || []).map((token: { symbol: string; address: string }) => ({
                    symbol: token.symbol,
                    address: token.address
                  })),
                  address: asset.address || '',
                  lowerPrice: asset.lowerPrice,
                  upperPrice: asset.upperPrice,
                  currentPrice: asset.currentPrice
                };
                
                allPositions.push(position);
                totalValue += position.value;
                if (!position.isInRange) outOfRangeCount++;
              }
            }
          }
        }
      }
      
      // If we didn't get any positions, return mock data
      if (allPositions.length === 0) {
        console.log(`No real positions found (${successfulAddresses} successful addresses), returning mock data`);
        return returnMockData(res);
      }
      
      console.log(`Returning ${allPositions.length} real positions from Zapper`);
      
      // Return the processed position data
      return res.status(200).json({
        positions: allPositions,
        summary: {
          totalPositions: allPositions.length,
          totalValue: totalValue,
          outOfRangeCount: outOfRangeCount
        }
      });
    } catch (error) {
      console.error('Error processing Zapper data:', error);
      // Fall back to mock data on error
      console.log('Falling back to mock data due to error');
      return returnMockData(res);
    }
  } catch (error) {
    console.error('Error in mini app positions endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Function to return mock data
function returnMockData(res: NextApiResponse) {
  console.log('Sending mock position data');
  return res.status(200).json({
    positions: [
      {
        id: 'uniswap-v3-eth-usdc',
        appName: 'Uniswap V3',
        label: 'ETH-USDC',
        value: 1250.75,
        isInRange: true,
        tokens: [
          { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' }, 
          { symbol: 'USDC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' }
        ],
        address: '0x1234567890abcdef1234567890abcdef12345678',
        lowerPrice: 1800.00,
        upperPrice: 2200.00,
        currentPrice: 2000.00
      },
      {
        id: 'aerodrome-weth-usdc',
        appName: 'Aerodrome',
        label: 'WETH-USDC',
        value: 890.25,
        isInRange: false,
        tokens: [
          { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' }, 
          { symbol: 'USDC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' }
        ],
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        lowerPrice: 2200.00,
        upperPrice: 2500.00,
        currentPrice: 2000.00
      },
      {
        id: 'balancer-v2-weth-usdc-dai',
        appName: 'Balancer V2',
        label: 'WETH-USDC-DAI',
        value: 1575.50,
        isInRange: true,
        tokens: [
          { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' }, 
          { symbol: 'USDC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' },
          { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' }
        ],
        address: '0x7890abcdef1234567890abcdef1234567890abcd',
        lowerPrice: null,
        upperPrice: null,
        currentPrice: null
      }
    ],
    summary: {
      totalPositions: 3,
      totalValue: 3716.50,
      outOfRangeCount: 1
    },
    isMockData: true
  });
} 