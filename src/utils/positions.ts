import axios from 'axios';

// Zapper API key from environment variables
const ZAPPER_API_KEY = process.env.ZAPPER_API_KEY || '';

// Function to fetch positions from Zapper API
export async function fetchPositionsFromZapper(addresses: string[]) {
  // Check if Zapper API key is available
  if (!ZAPPER_API_KEY) {
    throw new Error('Zapper API key not configured');
  }
  
  try {
    // Normalize addresses to lowercase
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
    
    // Get Base chain positions (chainId = 8453)
    const response = await axios.get('https://api.zapper.xyz/v2/positions', {
      headers: {
        'Authorization': `Basic ${ZAPPER_API_KEY}`
      },
      params: {
        'addresses[]': normalizedAddresses,
        'network': 'base',
        'bundled': true
      }
    });
    
    // Process the response to extract the relevant positions
    // Focus on liquidity pool positions, especially Uniswap v3 positions
    const allPositions = response.data?.positions || [];
    
    // Process and structure the positions
    return processPositions(allPositions);
  } catch (error) {
    console.error('Zapper API error:', error);
    throw new Error('Failed to fetch positions from Zapper');
  }
}

// Process and structure the positions data
function processPositions(positions: any[]) {
  // Filter for liquidity positions and structure them
  const liquidityPositions = positions.filter(position => {
    // Filter for liquidity pool positions
    return (
      position.appId === 'uniswap-v3' || 
      position.appId === 'aerodrome' ||
      position.appId === 'balancer-v2' ||
      position.appId === 'curve'
    );
  }).map(position => {
    // Extract relevant information
    return {
      id: position.key || position.id,
      appName: position.appName || position.appId,
      type: position.type || 'liquidity',
      label: position.label || position.name,
      value: position.value || 0,
      tokens: position.tokens || [],
      // Additional data for concentrated liquidity positions
      isInRange: position.isInRange !== undefined ? position.isInRange : true,
      lowerPrice: position.lowerPrice,
      upperPrice: position.upperPrice,
      currentPrice: position.currentPrice,
      // Add contract address and related info
      address: position.address,
      network: position.network || 'base',
      // Add position-specific information
      metadata: position.metadata || {},
    };
  });
  
  return {
    positions: liquidityPositions,
    summary: {
      totalPositions: liquidityPositions.length,
      totalValue: liquidityPositions.reduce((sum: number, pos: any) => sum + (pos.value || 0), 0),
      outOfRangeCount: liquidityPositions.filter((pos: any) => pos.isInRange === false).length
    }
  };
}

// Find positions that are out of range
export function findOutOfRangePositions(positionsData: any) {
  const { positions } = positionsData;
  
  // Filter for positions that are out of range
  return positions.filter((position: any) => position.isInRange === false);
} 