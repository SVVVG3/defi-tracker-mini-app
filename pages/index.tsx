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

export default function Home() {
  // Basic state
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Initialize SDK and load positions
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
        } catch (e) {
          console.error('SDK initialization error:', e);
          setError(`SDK error: ${e instanceof Error ? e.message : String(e)}`);
        }
        
        // Load positions directly
        loadPositions();
      } catch (e) {
        console.error('App initialization error:', e);
        setError(`Initialization error: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    
    initializeApp();
  }, []);
  
  // Function to load positions
  const loadPositions = async () => {
    try {
      setLoading(true);
      console.log('Loading positions...');
      
      // Sample addresses - use these directly
      const addresses = [
        '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      ];
      
      // Call the standalone test endpoint for positions
      const response = await axios.get('/api/test/positions-standalone', {
        params: { addresses }
      });
      
      console.log('Positions loaded:', response.data);
      setPositions(response.data.positions);
      setSummary(response.data.summary);
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
            <button onClick={loadPositions} style={{ 
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
              <p style={{ marginTop: '10px' }}>Loading DeFi positions...</p>
            </div>
          )}
          
          {/* Error state */}
          {!loading && error && (
            <div style={{ padding: '15px', backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: '6px' }}>
              <p style={{ color: '#FF3B30', margin: 0 }}>{error}</p>
              <button onClick={loadPositions} style={{ 
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
                  <p>No positions found. Try reloading the data.</p>
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