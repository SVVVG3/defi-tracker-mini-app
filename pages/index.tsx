import { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import farcasterSDK from '../src/utils/farcaster-sdk';

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
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PositionsResponse['summary'] | null>(null);

  // Debug log
  useEffect(() => {
    console.log('App State:', {
      sdkLoaded,
      readyCalled,
      isInFrame,
      error,
      userPresent: !!user,
      walletCount: wallets.length,
      positionCount: positions.length,
      loading
    });
  }, [sdkLoaded, readyCalled, isInFrame, error, user, wallets, positions, loading]);

  // Initialize app with the SDK manager
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Always load positions with test wallet as fallback
        const testWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
        
        // Try to get from SDK, otherwise use mock
        try {
          // Get SDK from our manager (it handles polling internally)
          const sdk = await farcasterSDK.initialize();
          
          if (sdk) {
            console.log('SDK initialized via manager:', sdk);
            setSdkLoaded(true);
            
            // Send ready signal
            const readySent = await farcasterSDK.sendReady();
            setReadyCalled(readySent);
            
            if (readySent) {
              console.log('Ready signal sent to Farcaster');
            }
            
            // Check if in frame
            const inFrame = await farcasterSDK.isInFrame();
            setIsInFrame(inFrame);
            console.log('Is in Farcaster frame:', inFrame);
            
            // Get user information
            const user = await farcasterSDK.getUser();
            if (user) {
              console.log('Found user data in SDK:', user);
              setUser(user);
              
              // Extract wallet addresses from user data
              const addresses = extractWalletAddresses(user);
              if (addresses.length > 0) {
                setWallets(addresses);
                console.log('Using wallets from Farcaster user:', addresses);
                await loadPositions(addresses);
                return;
              }
            }
          }
        } catch (error) {
          console.error('SDK initialization error:', error);
        }
        
        // Failed to get SDK or valid user data, use mock mode
        console.log('Using mock data with test wallet');
        setWallets(testWallets);
        await loadPositions(testWallets);
      } catch (e) {
        console.error('Overall initialization error:', e);
        setError(`App initialization failed: ${e instanceof Error ? e.message : String(e)}`);
        
        // Ensure we always load something, even on error
        loadPositions(['0x71C7656EC7ab88b098defB751B7401B5f6d8976F']);
      }
    };
    
    initializeApp();
  }, []);
  
  // Helper to extract wallet addresses from Farcaster user object
  const extractWalletAddresses = (userData: FarcasterUser): string[] => {
    const addresses: string[] = [];
    
    if (!userData) {
      console.log('No user data provided to extract addresses');
      return addresses;
    }
    
    // Add custody address if available
    if (userData.custody_address) {
      addresses.push(userData.custody_address);
      console.log('Added custody address:', userData.custody_address);
    }
    
    // Add verified addresses if available
    if (userData.verified_addresses && userData.verified_addresses.length > 0) {
      for (const addr of userData.verified_addresses) {
        if (!addresses.includes(addr)) {
          addresses.push(addr);
          console.log('Added verified address:', addr);
        }
      }
    }
    
    // Add ETH addresses if available
    if (userData.eth_addresses && userData.eth_addresses.length > 0) {
      for (const addr of userData.eth_addresses) {
        if (!addresses.includes(addr)) {
          addresses.push(addr);
          console.log('Added ETH address:', addr);
        }
      }
    }
    
    // Log results
    if (addresses.length === 0) {
      console.log('No addresses found in user data');
    } else {
      console.log(`Found ${addresses.length} unique addresses in user data`);
    }
    
    return addresses;
  };
  
  // Function to load positions - revised with better error handling
  const loadPositions = async (addressList: string[] = wallets) => {
    if (!addressList || addressList.length === 0) {
      setError('No wallet addresses provided to load positions');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading positions for wallets:', addressList);
      
      // Always use absolute URL for API calls
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const apiUrl = `${baseUrl}/api/mini-app-positions`;
      console.log('Calling API endpoint:', apiUrl);
      
      // Call the API with the addresses
      const response = await axios.get(apiUrl, {
        params: { addresses: addressList.join(',') },
        timeout: 15000 // Increased timeout to 15 seconds for Zapper API calls
      });
      
      console.log('API response status:', response.status);
      console.log('API response summary:', {
        positionsCount: response.data?.positions?.length || 0,
        totalValue: response.data?.summary?.totalValue || 0,
        hasMockData: response.data?.isMockData || false
      });
      
      if (response.data && response.data.positions) {
        setPositions(response.data.positions);
        setSummary(response.data.summary);
        setError(null);
        console.log(`Loaded ${response.data.positions.length} positions successfully`);
        
        // Alert if we're using mock data
        if (response.data.isMockData) {
          console.warn('Using mock position data - API key might be missing or invalid');
        }
      } else {
        console.error('Invalid API response format:', response.data);
        setError('Invalid data received from API. Please try again.');
      }
    } catch (e) {
      console.error('Failed to load positions:', e);
      
      // Extract detailed error information from Axios errors
      if (axios.isAxiosError(e)) {
        const statusCode = e.response?.status;
        const errorMessage = e.response?.data?.error || e.message;
        
        // Log error details for debugging
        console.error('API error details:', {
          status: statusCode,
          statusText: e.response?.statusText,
          data: e.response?.data,
          url: e.config?.url,
          method: e.config?.method
        });
        
        setError(`API error (${statusCode}): ${errorMessage}`);
      } else {
        setError(`Failed to load positions: ${e instanceof Error ? e.message : String(e)}`);
      }
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
        
        {/* Frame metadata - exact Farcaster Frame specification */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://defi-tracker.vercel.app/og-image.png" />
        <meta property="fc:frame:button:1" content="Track My DeFi Positions" />
        <meta property="fc:frame:post_url" content="https://defi-tracker.vercel.app/api/frame-action" />
        
        {/* Additional meta tags */}
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
        
        {/* Debug info */}
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
            <strong>Mode:</strong> {process.env.NODE_ENV} |
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
              <p>Ready to track your DeFi positions</p>
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