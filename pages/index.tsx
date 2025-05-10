import { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';

// Simplified position types
type Token = {
  symbol: string;
  address: string;
};

type Position = {
  id: string;
  appName: string;
  label: string;
  value: number;
  tokens: Token[];
  isInRange: boolean;
  address: string;
  lowerPrice?: number;
  upperPrice?: number;
  currentPrice?: number;
};

type PositionsResponse = {
  positions: Position[];
  summary: {
    totalPositions: number;
    totalValue: number;
    outOfRangeCount: number;
  };
};

type FarcasterUser = {
  fid: number;
  username: string;
  displayName?: string;
  pfp?: string;
  custody_address?: string;
  verified_addresses?: string[];
  eth_addresses?: string[];
};

export default function Home() {
  // Basic state
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User state
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [wallets, setWallets] = useState<string[]>([]);
  
  // Positions data
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PositionsResponse['summary'] | null>(null);

  // Frame metadata
  const frameMetadata = {
    version: "next",
    image: {
      src: "https://defi-tracker.vercel.app/og-image.png",
      aspectRatio: "1.91:1"
    },
    buttons: [
      {
        label: "Track DeFi Positions",
        action: "post"
      }
    ],
    postUrl: "https://defi-tracker.vercel.app"
  };

  // Initialize SDK and user data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Initialize SDK
        let sdk;
        try {
          sdk = typeof window !== 'undefined' && (window as any).sdk;
          if (!sdk) {
            const imported = await import('@farcaster/frame-sdk');
            sdk = imported.sdk;
          }
          
          setSdkLoaded(true);
          console.log('SDK loaded successfully');
          
          // Call ready immediately
          await sdk.actions.ready();
          setReadyCalled(true);
          console.log('Ready called successfully');
          
          // Check if in frame
          const inFrame = await sdk.isInMiniApp();
          setIsInFrame(inFrame);
          console.log('In frame detected:', inFrame);
          
          // If in frame, get user data from SDK context
          if (inFrame) {
            try {
              // Farcaster SDK provides user data directly in the context after ready() is called
              const userData = sdk.user;
              console.log('Farcaster user data:', userData);
              
              if (userData && userData.fid) {
                setUser(userData);
                
                // Collect wallets from user data
                const addresses: string[] = [];
                
                // Add custody address if present
                if (userData.custody_address) {
                  addresses.push(userData.custody_address);
                }
                
                // Add verified addresses if present
                if (userData.verified_addresses && userData.verified_addresses.length > 0) {
                  addresses.push(...userData.verified_addresses);
                }
                
                // Add eth addresses if present
                if (userData.eth_addresses && userData.eth_addresses.length > 0) {
                  addresses.push(...userData.eth_addresses);
                }
                
                // If no addresses found, add a default test address
                if (addresses.length === 0) {
                  addresses.push('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
                }
                
                setWallets(addresses);
                console.log('Found user wallets:', addresses);
                
                // Load positions for these wallets
                loadPositions(addresses);
              } else {
                console.log('No user data found in SDK context, using default wallets');
                const defaultWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
                setWallets(defaultWallets);
                loadPositions(defaultWallets);
              }
            } catch (e) {
              console.error('Error getting user data from SDK:', e);
              const defaultWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
              setWallets(defaultWallets);
              loadPositions(defaultWallets);
            }
          } else {
            // Not in frame, use default wallet for testing
            const defaultWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
            setWallets(defaultWallets);
            loadPositions(defaultWallets);
          }
        } catch (e) {
          console.error('SDK initialization error:', e);
          setError(`SDK error: ${e instanceof Error ? e.message : String(e)}`);
          // Try to load positions with default wallet anyway
          const defaultWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
          setWallets(defaultWallets);
          loadPositions(defaultWallets);
        }
      } catch (e) {
        console.error('App initialization error:', e);
        setError(`Initialization error: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    
    initializeApp();
  }, []);
  
  // Function to load positions
  const loadPositions = async (addressList: string[] = wallets) => {
    if (!addressList.length) {
      setError('No wallet addresses to load positions for');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading positions for wallets:', addressList);
      
      // Call the mini-app-positions endpoint
      const response = await axios.get('/api/mini-app-positions', {
        params: { addresses: addressList }
      });
      
      console.log('Positions loaded:', response.data);
      setPositions(response.data.positions);
      setSummary(response.data.summary);
      setError(null);
    } catch (e) {
      console.error('Failed to load positions:', e);
      setError(`Failed to load positions: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>DeFi Position Tracker</title>
        <meta name="description" content="Track your DeFi positions across multiple chains" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Critical: Use the correct fc:frame metadata format */}
        <meta property="fc:frame" content={JSON.stringify({
          version: "next",
          imageUrl: "https://defi-tracker.vercel.app/og-image.png",
          button: {
            title: "Track DeFi Positions",
            action: {
              type: "launch_frame",
              name: "DeFi Position Tracker",
              url: "https://defi-tracker.vercel.app",
              splashImageUrl: "https://defi-tracker.vercel.app/logo.png",
              splashBackgroundColor: "#000000"
            }
          }
        })} />
        
        {/* Additional farcaster meta tags */}
        <meta property="og:title" content="DeFi Position Tracker" />
        <meta property="og:description" content="Track your DeFi positions across multiple chains" />
        <meta property="og:image" content="https://defi-tracker.vercel.app/og-image.png" />
      </Head>
      
      <div style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        color: '#000',
        backgroundColor: '#fff',
        minHeight: '100vh'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>DeFi Position Tracker</h1>
        
        {/* User info when available */}
        {user && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f0f4ff', 
            borderRadius: '8px',
            border: '1px solid #c7d3f9',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {user.pfp && (
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                overflow: 'hidden',
                flexShrink: 0
              }}>
                <img 
                  src={user.pfp} 
                  alt={user.displayName || user.username} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            )}
            <div>
              <p style={{ margin: '0', fontWeight: 'bold' }}>{user.displayName || user.username}</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>@{user.username}</p>
              {wallets.length > 0 && (
                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#666' }}>
                  {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} connected
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Simple status - minimal debug info */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '15px',
          fontSize: '12px'
        }}>
          <p>
            <strong>SDK:</strong> {sdkLoaded ? '✅' : '❌'} | 
            <strong>Ready:</strong> {readyCalled ? '✅' : '❌'} | 
            <strong>Frame:</strong> {isInFrame ? '✅' : '❌'} | 
            <button onClick={() => loadPositions()} style={{ 
              marginLeft: '8px', 
              padding: '2px 6px', 
              fontSize: '10px', 
              backgroundColor: '#6C5CE7', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer' 
            }}>
              Reload
            </button>
          </p>
        </div>
        
        {/* Main content area */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '20px' 
        }}>
          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                margin: '0 auto',
                border: '3px solid #f3f3f3', 
                borderTop: '3px solid #6C5CE7', 
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ marginTop: '10px' }}>Loading your DeFi positions...</p>
            </div>
          )}
          
          {/* Error state */}
          {!loading && error && (
            <div style={{ padding: '15px', backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: '6px' }}>
              <p style={{ color: '#FF3B30', margin: 0 }}>{error}</p>
              <button onClick={() => loadPositions()} style={{ 
                marginTop: '10px', 
                padding: '8px 16px', 
                backgroundColor: '#6C5CE7', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer' 
              }}>
                Try Again
              </button>
            </div>
          )}
          
          {/* Positions successfully loaded */}
          {!loading && !error && summary && positions && (
            <div>
              {/* Summary */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f1f1f1', borderRadius: '6px' }}>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px' }}><strong>Total Positions:</strong> {summary.totalPositions}</p>
                    <p style={{ margin: '0', fontSize: '14px' }}><strong>Total Value:</strong> ${summary.totalValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px', color: summary.outOfRangeCount > 0 ? 'red' : 'green' }}>
                      <strong>Out of Range:</strong> {summary.outOfRangeCount}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Position List */}
              <div>
                {positions.length === 0 ? (
                  <p>No positions found for your connected wallets. Try adding more wallets or connecting to DeFi apps.</p>
                ) : (
                  <div>
                    {positions.map(position => (
                      <div 
                        key={position.id} 
                        style={{ 
                          padding: '15px', 
                          border: '1px solid #eaeaea', 
                          borderLeft: `4px solid ${position.isInRange ? '#00C853' : '#FF3B30'}`,
                          borderRadius: '6px', 
                          marginBottom: '10px',
                          backgroundColor: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ margin: '0', fontSize: '16px' }}>{position.appName}</h3>
                            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>{position.label}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>${position.value.toFixed(2)}</p>
                            <p style={{ 
                              margin: '0', 
                              fontSize: '12px',
                              padding: '2px 8px',
                              display: 'inline-block',
                              borderRadius: '12px',
                              backgroundColor: position.isInRange ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                              color: position.isInRange ? '#00C853' : '#FF3B30'
                            }}>
                              {position.isInRange ? 'In Range' : 'Out of Range'}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ fontSize: '14px' }}>
                          <p style={{ margin: '0' }}>
                            <strong>Tokens:</strong> {position.tokens.map(t => t.symbol).join('/')}
                          </p>
                          {position.lowerPrice && position.upperPrice && (
                            <p style={{ margin: '0' }}>
                              <strong>Range:</strong> ${position.lowerPrice.toFixed(4)} - ${position.upperPrice.toFixed(4)}
                            </p>
                          )}
                          {position.currentPrice && (
                            <p style={{ margin: '0' }}>
                              <strong>Current Price:</strong> ${position.currentPrice.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* No positions loaded yet */}
          {!loading && !error && (!summary || !positions) && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p>Loading your DeFi positions...</p>
              <button onClick={() => loadPositions()} style={{ 
                marginTop: '10px', 
                padding: '8px 16px', 
                backgroundColor: '#6C5CE7', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer' 
              }}>
                Load Positions
              </button>
            </div>
          )}
        </div>
        
        {/* Global style for the spinner animation */}
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
} 