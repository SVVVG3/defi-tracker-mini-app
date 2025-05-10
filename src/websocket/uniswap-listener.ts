import { createClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

// GraphQL endpoint for Uniswap V3 on Base
const UNISWAP_GRAPH_URL = 'wss://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest';

// Type for subscription
interface Subscription {
  unsubscribe: () => void;
}

// Types for the swap entity
interface Swap {
  id: string;
  timestamp: string;
  pool: {
    id: string;
    token0: {
      id: string;
      symbol: string;
      decimals: string;
    };
    token1: {
      id: string;
      symbol: string;
      decimals: string;
    };
    feeTier: string;
    sqrtPrice: string;
    tick: string;
  };
  sender: string;
  recipient: string;
  origin: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  logIndex: number;
}

// Type for price update event
export interface PriceUpdate {
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

// Use type declaration to add EventEmitter methods
export interface UniswapPriceListener {
  on(event: 'priceUpdate', listener: (update: PriceUpdate) => void): this;
  emit(event: 'priceUpdate', update: PriceUpdate): boolean;
}

// Event emitter for price updates
export class UniswapPriceListener extends EventEmitter {
  private client: ReturnType<typeof createClient>;
  private subscription: Subscription | null = null;
  private pools: Set<string> = new Set(); // Set of pool addresses to monitor

  constructor() {
    super();
    
    // Initialize GraphQL client
    this.client = createClient({
      url: UNISWAP_GRAPH_URL,
      webSocketImpl: WebSocket,
      retryAttempts: 5,
      connectionParams: {},
    });
    
    console.log('Initialized Uniswap V3 price listener');
  }

  /**
   * Add pool to monitoring list
   */
  addPool(poolAddress: string) {
    this.pools.add(poolAddress.toLowerCase());
    console.log(`Added pool ${poolAddress} to monitoring list`);
    
    // If we're already subscribed, restart subscription to include new pool
    if (this.subscription) {
      this.unsubscribe();
      this.subscribe();
    }
  }

  /**
   * Remove pool from monitoring list
   */
  removePool(poolAddress: string) {
    this.pools.delete(poolAddress.toLowerCase());
    console.log(`Removed pool ${poolAddress} from monitoring list`);
    
    // If we're already subscribed, restart subscription
    if (this.subscription) {
      this.unsubscribe();
      this.subscribe();
    }
  }

  /**
   * Start listening for price updates
   */
  subscribe() {
    if (this.subscription) {
      console.log('Already subscribed to Uniswap price updates');
      return;
    }

    if (this.pools.size === 0) {
      console.log('No pools to monitor. Add pools before subscribing.');
      return;
    }

    const poolAddresses = Array.from(this.pools);
    console.log(`Subscribing to price updates for ${poolAddresses.length} pools`);

    // Create the pool filter for the GraphQL query
    const poolFilter = poolAddresses.length > 0 
      ? `pool_in: ["${poolAddresses.join('","')}"]` 
      : '';

    // Subscribe to swaps for the monitored pools
    const unsubscribe = this.client.subscribe({
      query: `
        subscription PriceUpdates {
          swaps(
            orderBy: timestamp
            orderDirection: desc
            first: 5
            where: { ${poolFilter} }
          ) {
            id
            timestamp
            pool {
              id
              token0 {
                id
                symbol
                decimals
              }
              token1 {
                id
                symbol
                decimals
              }
              feeTier
              sqrtPrice
              tick
            }
            sender
            recipient
            origin
            amount0
            amount1
            amountUSD
            logIndex
          }
        }
      `,
    }, {
      next: (result: any) => {
        try {
          // Extract swaps from the result
          const swaps = result?.data?.swaps as Swap[] || [];
          
          if (swaps.length > 0) {
            // Process each swap
            swaps.forEach((swap: Swap) => {
              // Calculate current price
              const { pool, amount0, amount1, amountUSD } = swap;
              
              // Skip if no amounts (shouldn't happen)
              if (!amount0 || !amount1) return;
              
              // Calculate price based on amounts
              const price = Math.abs(Number(amount1) / Number(amount0));
              
              // Emit price update event
              this.emit('priceUpdate', {
                poolAddress: pool.id,
                token0: {
                  address: pool.token0.id,
                  symbol: pool.token0.symbol,
                  decimals: parseInt(pool.token0.decimals),
                },
                token1: {
                  address: pool.token1.id,
                  symbol: pool.token1.symbol,
                  decimals: parseInt(pool.token1.decimals),
                },
                price,
                timestamp: parseInt(swap.timestamp) * 1000, // Convert to milliseconds
                amountUSD: parseFloat(amountUSD),
                tick: parseInt(pool.tick),
              });
            });
          }
        } catch (error) {
          console.error('Error processing Uniswap price update:', error);
        }
      },
      error: (error) => {
        console.error('Error in Uniswap price subscription:', error);
        // Try to reconnect after a delay
        setTimeout(() => {
          console.log('Attempting to reconnect to Uniswap subscription...');
          this.unsubscribe();
          this.subscribe();
        }, 5000);
      },
      complete: () => {
        console.log('Uniswap price subscription completed');
        this.subscription = null;
      },
    });

    this.subscription = { unsubscribe };
    console.log('Subscribed to Uniswap price updates');
  }

  /**
   * Stop listening for price updates
   */
  unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      console.log('Unsubscribed from Uniswap price updates');
    }
  }
}

/**
 * Create and return a Uniswap price listener
 */
export function createUniswapPriceListener() {
  return new UniswapPriceListener();
} 