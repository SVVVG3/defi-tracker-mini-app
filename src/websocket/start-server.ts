import { initRealTimeMonitoring, getPositionChecker } from './index';

// Configuration
const PORT = parseInt(process.env.WS_PORT || '3002', 10);

// Initialize the real-time monitoring system
const { positionChecker, notificationManager } = initRealTimeMonitoring(PORT);

console.log(`WebSocket server started on port ${PORT}`);

// Example positions for testing
const examplePositions = [
  {
    id: 'pos_1',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    appName: 'Uniswap V3',
    label: 'ETH/USDC',
    poolAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC contract address
    value: 5000,
    tokens: [
      { symbol: 'ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }
    ],
    priceLower: 1800,
    priceUpper: 2200,
    isInRange: true
  },
  {
    id: 'pos_2',
    address: '0x1234567890abcdef1234567890abcdef12345679',
    appName: 'Aerodrome',
    label: 'WETH/ARB',
    poolAddress: '0x912ce59144191c1204e64559fe8253a0e49e6548', // ARB contract address
    value: 3000,
    tokens: [
      { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
      { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' }
    ],
    priceLower: 0.5,
    priceUpper: 1.5,
    isInRange: true
  }
];

// Add example positions for testing
for (const position of examplePositions) {
  positionChecker.addPosition(position);
  console.log(`Added position ${position.id} (${position.label}) for monitoring`);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  
  // Stop checkers
  positionChecker.stop();
  notificationManager.stop();
  
  process.exit(0);
});

// Log active monitoring status every 60 seconds
setInterval(() => {
  const positions = positionChecker.getAllPositions();
  const outOfRangePositions = positionChecker.getOutOfRangePositions();
  
  console.log(`Monitoring status: ${positions.length} positions total, ${outOfRangePositions.length} out of range`);
}, 60000); 