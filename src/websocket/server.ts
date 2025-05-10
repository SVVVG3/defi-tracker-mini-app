import { createServer } from 'http';
import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';

// Types for socket events
interface UserAuthPayload {
  token: string;
}

interface RegisterPositionsPayload {
  positions: Position[];
}

interface Position {
  id: string;
  address: string;
  appName: string; // e.g., "Uniswap V3"
  tokens: {
    symbol: string;
    address: string;
  }[];
  priceLower?: number;
  priceUpper?: number;
}

interface UserPayload {
  fid: number;
  username: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

// Track user positions
const userPositions = new Map<number, Position[]>(); // fid -> positions

// JWT Secret (from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';

/**
 * Verify JWT token and return user payload
 */
function verifyToken(token: string): Promise<UserPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      
      resolve(decoded as UserPayload);
    });
  });
}

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(port: number = 3002) {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth as UserAuthPayload;
      
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Verify token and get user info
      const payload = await verifyToken(token);
      
      if (!payload || !payload.fid) {
        return next(new Error('Invalid authentication token'));
      }

      // Store user info in socket
      socket.data.user = payload;
      next();
    } catch (err) {
      console.error('WebSocket authentication error:', err);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const { user } = socket.data;
    console.log(`User ${user.username} (FID: ${user.fid}) connected to WebSocket`);
    
    // Register user positions for tracking
    socket.on('registerPositions', (payload: RegisterPositionsPayload) => {
      const { positions } = payload;
      console.log(`Registering ${positions.length} positions for user ${user.fid}`);
      
      userPositions.set(user.fid, positions);
      
      // Send confirmation
      socket.emit('positionsRegistered', { 
        success: true, 
        count: positions.length 
      });
    });
    
    // Handle position updates requests
    socket.on('getPositionUpdates', () => {
      const positions = userPositions.get(user.fid) || [];
      socket.emit('positionUpdatesList', { positions });
    });
    
    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`User ${user.username} (FID: ${user.fid}) disconnected from WebSocket`);
    });
  });

  // Start server
  httpServer.listen(port, () => {
    console.log(`WebSocket server listening on port ${port}`);
  });

  return { httpServer, io };
} 