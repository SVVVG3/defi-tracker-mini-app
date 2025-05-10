import { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import { useAuth } from '../src/lib/auth';
import LoadingState from '../src/components/LoadingState';
import ApiErrorFallback from '../src/components/ApiErrorFallback';
import { useApiRequest } from '../src/hooks/useApiRequest';
import { PositionMonitor } from '../src/components/PositionMonitor';

// Types for our app
type Wallet = {
  address: string;
  network: string;
};

type WalletResponse = {
  wallets: {
    eth: string[];
    sol: string[];
    custody_address?: string;
  };
};

type Position = {
  id: string;
  address: string;
  appName: string;
  label: string;
  value: number;
  tokens: { symbol: string; address: string }[];
  isInRange: boolean;
  [key: string]: any;
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
  // Farcaster SDK state
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  
  // Application state
  const { user, token, isAuthenticated, login, logout } = useAuth();
  const [stage, setStage] = useState<'init' | 'auth' | 'wallets' | 'positions'>('init');
  const [wallets, setWallets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // API requests setup
  const walletsRequest = useApiRequest<WalletResponse>();
  const positionsRequest = useApiRequest<PositionsResponse>();

  // Handle sign in with Farcaster
  const handleSignIn = async () => {
    if (!sdkLoaded) {
      setError('SDK not loaded yet. Please try again.');
      return;
    }

    try {
      setStage('auth');
      setError(null);
      console.log('Starting Farcaster authentication process...');

      // Get the SDK from window or dynamic import
      let sdk = typeof window !== 'undefined' && (window as any).sdk;
      if (!sdk) {
        const imported = await import('@farcaster/frame-sdk');
        sdk = imported.sdk;
      }

      // Generate a session ID for this auth request
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log('Generated session ID:', sessionId);
      
      // Get a nonce from our server
      const nonceResponse = await axios.post('/api/auth/nonce', { sessionId });
      const { nonce } = nonceResponse.data;
      
      // Request user to sign in with Farcaster
      console.log('Requesting user to sign with Farcaster...');
      const signInResult = await sdk.actions.signIn({
        nonce,
        domain: window.location.host,
        sessionId,
      });
      console.log('Received sign-in result:', signInResult);

      // Verify the signature with our server
      const verificationResponse = await axios.post('/api/auth/verify', {
        message: signInResult.message,
        signature: signInResult.signature,
        sessionId,
      });
      
      // Set the authentication state
      const { token: authToken, user: userData } = verificationResponse.data;
      console.log('Authentication successful, user:', userData);
      login(authToken, userData);
      
      // Move to the next stage
      setStage('wallets');
      
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(`Authentication failed: ${err.message}`);
      setStage('init');
    }
  };

  // Fetch user's connected wallets
  const fetchWallets = async () => {
    if (!isAuthenticated && !token && !isInFrame) {
      setError('Authentication required');
      setStage('auth');
      return;
    }

    try {
      setError(null);
      console.log('Fetching connected wallets...');
      
      // Use test endpoints directly when in Farcaster mini app environment
      if (isInFrame) {
        console.log('Using test wallets for Farcaster mini app environment');
        // Use hardcoded test wallets for now
        const testWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F', '0xdAC17F958D2ee523a2206206994597C13D831ec7'];
        setWallets(testWallets);
        setStage('positions');
        return;
      }
      
      const result = await walletsRequest.execute({
        url: '/api/wallets',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (result?.wallets?.eth) {
        console.log('Found wallets:', result.wallets);
        setWallets(result.wallets.eth);
        setStage('positions');
      } else {
        console.log('No Ethereum wallets found in response:', result);
        setError('No Ethereum wallets found');
      }
    } catch (err: any) {
      console.error('Failed to fetch wallets:', err);
      setError(`Failed to fetch wallets: ${err.message}`);
    }
  };

  // Fetch user's DeFi positions
  const fetchPositions = async () => {
    if (wallets.length === 0) {
      return;
    }

    try {
      setError(null);
      console.log('Fetching positions for wallets:', wallets);
      
      // Use test endpoints directly when in Farcaster mini app environment
      if (isInFrame) {
        console.log('Using test positions endpoint for Farcaster mini app environment');
        await positionsRequest.execute({
          url: '/api/test/positions-standalone',
          method: 'GET',
          params: {
            addresses: wallets,
          },
          onSuccess: (data) => {
            console.log('Positions loaded successfully:', data);
          },
          onError: (err) => {
            console.error('Failed to load positions from test endpoint:', err);
          }
        });
        return;
      }
      
      await positionsRequest.execute({
        url: '/api/positions',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          addresses: wallets,
        },
        onSuccess: (data) => {
          console.log('Positions loaded successfully:', data);
        },
        onError: (err) => {
          console.error('Failed to load positions:', err);
        }
      });
    } catch (err: any) {
      console.error('Failed to fetch positions:', err);
      setError(`Failed to fetch positions: ${err.message}`);
    }
  };

  // Load the Farcaster SDK
  useEffect(() => {
    let isMounted = true;
    
    const initSDK = async () => {
      try {
        // Use window.sdk if available (in Mini App), otherwise fallback to dynamic import
        let sdk = typeof window !== 'undefined' && (window as any).sdk;
        if (!sdk) {
          try {
            const imported = await import('@farcaster/frame-sdk');
            sdk = imported.sdk;
            if (!sdk) throw new Error('Dynamic import failed');
            if (isMounted) setSdkError('window.sdk not found, using dynamic import (dev mode)');
          } catch (e) {
            if (isMounted) setSdkError('Farcaster SDK not found in window or via import');
            return;
          }
        }
        if (!isMounted) return;
        
        setSdkLoaded(true);
        
        // CRITICAL: Call ready() immediately without checking for frame
        try {
          await sdk.actions.ready({ disableNativeGestures: true });
          if (isMounted) setReadyCalled(true);
          
          // Check if we're in a frame environment AFTER calling ready()
          try {
            const inFrame = await sdk.isInMiniApp();
            if (isMounted) {
              setIsInFrame(inFrame);
              
              // Auto-authenticate when in Farcaster mini app environment
              if (inFrame && stage === 'init') {
                console.log('Detected Farcaster mini app environment, bypassing authentication and going directly to wallet fetching...');
                // Skip authentication and jump straight to wallet retrieval when in Farcaster
                setStage('wallets');
              }
            }
          } catch (e) {
            if (isMounted) setSdkError(`Frame detection error: ${e instanceof Error ? e.message : String(e)}`);
          }
        } catch (e) {
          if (isMounted) setSdkError(`Ready error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } catch (e) {
        if (isMounted) setSdkError(`SDK loading error: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    // Start initializing without blocking rendering
    initSDK();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch wallets when authenticated
  useEffect(() => {
    if (isAuthenticated && stage === 'wallets') {
      fetchWallets();
    }
  }, [isAuthenticated, stage]);

  // Fetch positions when wallets are available
  useEffect(() => {
    if (stage === 'positions' && wallets.length > 0) {
      fetchPositions();
    }
  }, [stage, wallets]);

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
        
        {/* Farcaster SDK Status */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '15px',
          fontSize: '12px'
        }}>
          <p><strong>SDK Status:</strong> {sdkLoaded ? '✅' : '❌'} | <strong>Ready:</strong> {readyCalled ? '✅' : '❌'} | <strong>In Frame:</strong> {isInFrame ? '✅' : '❌'}</p>
          {isInFrame && (
            <p style={{ color: 'green', fontSize: '10px', marginTop: '5px' }}>
              <strong>Farcaster Fast Mode:</strong> Using direct data loading for mini app environment
            </p>
          )}
          {sdkError && <p style={{ color: 'red', fontSize: '10px' }}>{sdkError}</p>}
        </div>
        
        {/* Main Content */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '20px' 
        }}>
          {/* Not authenticated state */}
          {!isAuthenticated && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Track Your DeFi Positions</h2>
              <p style={{ marginBottom: '20px' }}>Sign in with Farcaster to view all your DeFi positions and receive notifications when liquidity positions move out of range.</p>
              
              <button 
                onClick={handleSignIn}
                disabled={!sdkLoaded || stage === 'auth'}
                style={{
                  padding: '10px 20px',
                  background: '#6C5CE7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: (!sdkLoaded || stage === 'auth') ? '0.7' : '1'
                }}
              >
                {stage === 'auth' ? 'Signing in...' : 'Sign in with Farcaster'}
              </button>
              
              {error && (
                <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>
              )}
            </div>
          )}
          
          {/* Loading wallets */}
          {isAuthenticated && stage === 'wallets' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Loading Your Wallets</h2>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  border: '3px solid #f3f3f3', 
                  borderTop: '3px solid #6C5CE7', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
              {walletsRequest.error && (
                <p style={{ color: 'red' }}>Failed to load wallets: {walletsRequest.error.message}</p>
              )}
            </div>
          )}
          
          {/* Loading positions */}
          {stage === 'positions' && positionsRequest.isLoading && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Loading Your DeFi Positions</h2>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  border: '3px solid #f3f3f3', 
                  borderTop: '3px solid #6C5CE7', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            </div>
          )}
          
          {/* Positions loaded */}
          {stage === 'positions' && !positionsRequest.isLoading && positionsRequest.data && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '18px', margin: 0 }}>Your DeFi Positions</h2>
                <div style={{ fontSize: '12px' }}>
                  {user && <p style={{ margin: 0 }}>@{user.username}</p>}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f1f1f1', borderRadius: '6px' }}>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px' }}><strong>Total Positions:</strong> {positionsRequest.data.summary.totalPositions}</p>
                    <p style={{ margin: '0', fontSize: '14px' }}><strong>Total Value:</strong> ${positionsRequest.data.summary.totalValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0', fontSize: '14px', color: positionsRequest.data.summary.outOfRangeCount > 0 ? 'red' : 'green' }}>
                      <strong>Out of Range:</strong> {positionsRequest.data.summary.outOfRangeCount}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Position List */}
              <div>
                {positionsRequest.data.positions.length === 0 ? (
                  <p>No positions found for your wallets. Try adding more wallets or connecting to DeFi apps.</p>
                ) : (
                  <div>
                    {positionsRequest.data.positions.map(position => (
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
          
          {/* Error state - add more detailed error information */}
          {(error || walletsRequest.error || positionsRequest.error) && (
            <div style={{ 
              marginTop: '20px', 
              padding: '10px', 
              backgroundColor: 'rgba(255, 59, 48, 0.1)', 
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>Debug Information</h3>
              
              {error && (
                <p style={{ color: '#FF3B30', margin: '0 0 5px 0' }}><strong>Error:</strong> {error}</p>
              )}
              
              {walletsRequest.error && (
                <div style={{ margin: '5px 0' }}>
                  <p style={{ color: '#FF3B30', margin: '0' }}><strong>Wallets Error:</strong> {walletsRequest.error.message}</p>
                  {walletsRequest.error.response && (
                    <pre style={{ 
                      margin: '3px 0', 
                      padding: '5px', 
                      backgroundColor: 'rgba(0,0,0,0.05)', 
                      fontSize: '10px', 
                      overflow: 'auto',
                      maxHeight: '100px'
                    }}>
                      Status: {walletsRequest.error.response.status} {walletsRequest.error.response.statusText}
                      {walletsRequest.error.response.data ? 
                        `\nData: ${JSON.stringify(walletsRequest.error.response.data, null, 2)}` : ''}
                    </pre>
                  )}
                </div>
              )}
              
              {positionsRequest.error && (
                <div style={{ margin: '5px 0' }}>
                  <p style={{ color: '#FF3B30', margin: '0' }}><strong>Positions Error:</strong> {positionsRequest.error.message}</p>
                  {positionsRequest.error.response && (
                    <pre style={{ 
                      margin: '3px 0', 
                      padding: '5px', 
                      backgroundColor: 'rgba(0,0,0,0.05)', 
                      fontSize: '10px', 
                      overflow: 'auto',
                      maxHeight: '100px'
                    }}>
                      Status: {positionsRequest.error.response.status} {positionsRequest.error.response.statusText}
                      {positionsRequest.error.response.data ? 
                        `\nData: ${JSON.stringify(positionsRequest.error.response.data, null, 2)}` : ''}
                    </pre>
                  )}
                </div>
              )}
              
              <p style={{ margin: '5px 0 0 0', fontSize: '11px' }}>
                <strong>Current Stage:</strong> {stage} | 
                <strong>Auth:</strong> {isAuthenticated ? '✅' : '❌'} | 
                <strong>Wallets:</strong> {wallets.length}
              </p>
            </div>
          )}
        </div>
        
        {/* Real-time monitoring */}
        {isAuthenticated && positionsRequest.data && positionsRequest.data.positions.length > 0 && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f9f9f9', 
            borderRadius: '8px',
            border: '1px solid #eaeaea',
            marginBottom: '15px' 
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Real-Time Monitoring</h3>
            <p style={{ fontSize: '14px' }}>Your positions are being monitored. You'll receive notifications when they move out of range.</p>
          </div>
        )}
        
        {/* Position Monitor Component (conditionally rendered if authenticated and positions loaded) */}
        {isAuthenticated && positionsRequest.data && positionsRequest.data.positions.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <PositionMonitor 
              positions={positionsRequest.data.positions.map(p => ({
                id: p.id,
                address: p.address,
                appName: p.appName,
                label: p.label,
                value: p.value,
                tokens: p.tokens,
                isInRange: p.isInRange,
                poolAddress: p.address, // Use address as poolAddress since it's required
                priceLower: p.lowerPrice,
                priceUpper: p.upperPrice,
                lastChecked: Date.now(),
              }))} 
            />
          </div>
        )}
        
        {/* Log out button if authenticated */}
        {isAuthenticated && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              onClick={logout}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#6C5CE7',
                border: '1px solid #6C5CE7',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Log Out
            </button>
          </div>
        )}
        
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