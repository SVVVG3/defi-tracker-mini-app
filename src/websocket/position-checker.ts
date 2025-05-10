import { EventEmitter } from 'events';
import { UniswapPriceListener } from './uniswap-listener';

// Types for position data
export interface Position {
  id: string;
  address: string;
  appName: string; // e.g., "Uniswap V3"
  label: string;
  poolAddress: string;
  value: number;
  tokens: Token[];
  priceLower?: number;
  priceUpper?: number;
  isInRange: boolean;
  lastChecked?: number;
  lastNotified?: number;
}

export interface Token {
  symbol: string;
  address: string;
  decimals?: number;
}

// Types for price update events
interface PriceUpdate {
  poolAddress: string;
  token0: {
    address: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
  };
  price: number;
  timestamp: number;
  amountUSD: number;
  tick: number;
}

// Type for position status change
export interface PositionStatusChange {
  position: Position;
  previousStatus: boolean;
  currentStatus: boolean;
  price: number;
  timestamp: number;
}

// Use type declaration to add EventEmitter methods
export interface PositionChecker {
  on(event: 'positionStatusChange', listener: (statusChange: PositionStatusChange) => void): this;
  emit(event: 'positionStatusChange', statusChange: PositionStatusChange): boolean;
}

// Track pool prices and positions
export class PositionChecker extends EventEmitter {
  private uniswapListener: UniswapPriceListener;
  private positions: Map<string, Position> = new Map(); // positionId -> position
  private poolPrices: Map<string, number> = new Map(); // poolAddress -> price
  private positionsByPool: Map<string, Set<string>> = new Map(); // poolAddress -> Set of positionIds
  private checkIntervalMs: number;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(checkIntervalMs: number = 60000) { // Default: check every minute
    super();
    this.uniswapListener = new UniswapPriceListener();
    this.checkIntervalMs = checkIntervalMs;

    // Listen for price updates
    this.uniswapListener.on('priceUpdate', this.handlePriceUpdate.bind(this));
  }

  /**
   * Start position checking
   */
  start() {
    if (this.checkInterval) {
      console.log('Position checker already running');
      return;
    }

    // Start regular position checking
    this.checkInterval = setInterval(() => {
      this.checkAllPositions();
    }, this.checkIntervalMs);

    console.log(`Started position checker with interval of ${this.checkIntervalMs}ms`);
    
    // Start the Uniswap listener if we have positions
    if (this.positions.size > 0) {
      this.uniswapListener.subscribe();
    }
  }

  /**
   * Stop position checking
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped position checker');
    }
    
    // Stop the Uniswap listener
    this.uniswapListener.unsubscribe();
  }

  /**
   * Add position for monitoring
   */
  addPosition(position: Position) {
    // Store the position
    this.positions.set(position.id, position);
    
    // Add to pool tracking
    if (!this.positionsByPool.has(position.poolAddress)) {
      this.positionsByPool.set(position.poolAddress, new Set());
      
      // Add pool to Uniswap listener
      this.uniswapListener.addPool(position.poolAddress);
    }
    
    this.positionsByPool.get(position.poolAddress)?.add(position.id);
    
    console.log(`Added position ${position.id} for monitoring`);
    
    // Start the Uniswap listener if this is our first position
    if (this.positions.size === 1 && !this.checkInterval) {
      this.start();
    }
  }

  /**
   * Remove position from monitoring
   */
  removePosition(positionId: string) {
    const position = this.positions.get(positionId);
    
    if (!position) {
      console.log(`Position ${positionId} not found`);
      return;
    }
    
    // Remove from positions map
    this.positions.delete(positionId);
    
    // Remove from pool tracking
    const poolAddress = position.poolAddress;
    const positionsForPool = this.positionsByPool.get(poolAddress);
    
    if (positionsForPool) {
      positionsForPool.delete(positionId);
      
      // If no more positions for this pool, remove pool tracking
      if (positionsForPool.size === 0) {
        this.positionsByPool.delete(poolAddress);
        
        // Remove pool from Uniswap listener
        this.uniswapListener.removePool(poolAddress);
      }
    }
    
    console.log(`Removed position ${positionId} from monitoring`);
    
    // Stop the checker if no more positions
    if (this.positions.size === 0) {
      this.stop();
    }
  }

  /**
   * Handle price updates from Uniswap
   */
  private handlePriceUpdate(update: PriceUpdate) {
    const { poolAddress, price, timestamp } = update;
    
    // Update the stored price for this pool
    this.poolPrices.set(poolAddress, price);
    
    console.log(`Price update for pool ${poolAddress}: ${price}`);
    
    // Check positions for this pool
    this.checkPositionsForPool(poolAddress, price, timestamp);
  }

  /**
   * Check all positions for a specific pool
   */
  private checkPositionsForPool(poolAddress: string, price: number, timestamp: number) {
    const positionIds = this.positionsByPool.get(poolAddress);
    
    if (!positionIds || positionIds.size === 0) {
      return;
    }
    
    console.log(`Checking ${positionIds.size} positions for pool ${poolAddress}`);
    
    // Check each position
    positionIds.forEach(positionId => {
      const position = this.positions.get(positionId);
      
      if (!position) return;
      
      // Check if position has price boundaries
      if (typeof position.priceLower !== 'number' || typeof position.priceUpper !== 'number') {
        console.log(`Position ${positionId} doesn't have price boundaries`);
        return;
      }
      
      // Calculate if position is in range
      const previousStatus = position.isInRange;
      const currentStatus = price >= position.priceLower && price <= position.priceUpper;
      
      // Update position status
      position.isInRange = currentStatus;
      position.lastChecked = timestamp;
      
      // If status changed, emit an event
      if (previousStatus !== currentStatus) {
        console.log(`Position ${positionId} status changed: ${previousStatus ? 'in range' : 'out of range'} -> ${currentStatus ? 'in range' : 'out of range'}`);
        
        const statusChange: PositionStatusChange = {
          position,
          previousStatus,
          currentStatus,
          price,
          timestamp,
        };
        
        // Emit the status change event
        this.emit('positionStatusChange', statusChange);
        
        // Update last notified time
        position.lastNotified = timestamp;
      }
    });
  }

  /**
   * Check all positions using current prices
   */
  private checkAllPositions() {
    const now = Date.now();
    console.log(`Checking all ${this.positions.size} positions`);
    
    // Check each pool with stored prices
    this.poolPrices.forEach((price, poolAddress) => {
      this.checkPositionsForPool(poolAddress, price, now);
    });
  }

  /**
   * Get all monitored positions
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get all out-of-range positions
   */
  getOutOfRangePositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => !p.isInRange);
  }
}

/**
 * Create and return a position checker
 */
export function createPositionChecker(checkIntervalMs?: number) {
  return new PositionChecker(checkIntervalMs);
} 