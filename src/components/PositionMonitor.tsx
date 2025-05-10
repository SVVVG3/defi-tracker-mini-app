import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';

// Types for position data
interface Token {
  symbol: string;
  address: string;
}

interface Position {
  id: string;
  address: string;
  appName: string;
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

interface PositionStatusChange {
  position: Position;
  previousStatus: boolean;
  currentStatus: boolean;
  price: number;
  timestamp: number;
}

// WebSocket connection status
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Real-time position monitor component
 */
export const PositionMonitor: React.FC<{
  positions: Position[];
}> = ({ positions }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [statusChanges, setStatusChanges] = useState<PositionStatusChange[]>([]);
  const [registeredPositions, setRegisteredPositions] = useState<Position[]>([]);
  const { token } = useAuth();

  // Connect to WebSocket server
  useEffect(() => {
    if (!token) {
      console.log('No authentication token available');
      return;
    }

    // WebSocket server URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    
    console.log('Connecting to WebSocket server:', wsUrl);
    
    // Initialize socket connection with authentication
    const socketInstance = io(wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnectionStatus('connected');
      
      // Register positions for monitoring
      if (positions.length > 0) {
        socketInstance.emit('registerPositions', { positions });
      }
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnectionStatus('disconnected');
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    });
    
    socketInstance.on('positionsRegistered', (data: { success: boolean, count: number }) => {
      console.log(`Registered ${data.count} positions for monitoring`);
      setRegisteredPositions(positions);
    });
    
    socketInstance.on('positionStatusChange', (statusChange: PositionStatusChange) => {
      console.log('Position status change:', statusChange);
      
      // Add to status changes list
      setStatusChanges(prev => [statusChange, ...prev].slice(0, 10)); // Keep last 10 changes
    });
    
    // Store socket instance
    setSocket(socketInstance);
    setConnectionStatus('connecting');
    
    // Clean up on unmount
    return () => {
      console.log('Disconnecting from WebSocket server');
      socketInstance.disconnect();
    };
  }, [token, positions]);

  // Register positions when they change
  useEffect(() => {
    if (
      socket && 
      connectionStatus === 'connected' && 
      positions.length > 0 &&
      JSON.stringify(positions) !== JSON.stringify(registeredPositions)
    ) {
      console.log('Registering updated positions for monitoring');
      socket.emit('registerPositions', { positions });
    }
  }, [socket, connectionStatus, positions, registeredPositions]);

  // Render component
  return (
    <div className="position-monitor">
      <div className="connection-status">
        <h3>Real-Time Monitoring</h3>
        <div className={`status-indicator ${connectionStatus}`}>
          {connectionStatus === 'connected' ? 'Connected' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 
           connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
        </div>
        
        {connectionStatus === 'connected' && (
          <div className="registered-positions">
            <p>Monitoring {registeredPositions.length} positions</p>
          </div>
        )}
      </div>
      
      {statusChanges.length > 0 && (
        <div className="status-changes">
          <h4>Recent Status Changes</h4>
          <ul>
            {statusChanges.map((change, index) => (
              <li key={`${change.position.id}_${change.timestamp}_${index}`} className={change.currentStatus ? 'in-range' : 'out-of-range'}>
                <div className="change-header">
                  <span className="position-name">
                    {change.position.appName} {change.position.tokens.map(t => t.symbol).join('/')}
                  </span>
                  <span className="timestamp">{new Date(change.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="change-details">
                  <span className="status-text">
                    {change.previousStatus ? 'In Range' : 'Out of Range'} → {change.currentStatus ? 'In Range' : 'Out of Range'}
                  </span>
                  <span className="price-info">Price: ${change.price.toFixed(4)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <style jsx>{`
        .position-monitor {
          margin-top: 20px;
          padding: 16px;
          border-radius: 8px;
          background-color: var(--color-background-secondary);
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .status-indicator {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        
        .connected {
          background-color: var(--color-success);
          color: white;
        }
        
        .connecting {
          background-color: var(--color-warning);
          color: black;
        }
        
        .disconnected, .error {
          background-color: var(--color-error);
          color: white;
        }
        
        .status-changes {
          margin-top: 16px;
        }
        
        .status-changes h4 {
          margin-bottom: 8px;
        }
        
        .status-changes ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .status-changes li {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 4px solid;
        }
        
        .in-range {
          background-color: rgba(0, 200, 83, 0.1);
          border-left-color: var(--color-success);
        }
        
        .out-of-range {
          background-color: rgba(255, 59, 48, 0.1);
          border-left-color: var(--color-error);
        }
        
        .change-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        
        .position-name {
          font-weight: 600;
        }
        
        .timestamp {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        
        .change-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}; 