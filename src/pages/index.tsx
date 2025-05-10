import { useEffect, useState } from 'react';
// Import the SDK conditionally only on the client side
import Head from 'next/head';
import axios from 'axios';
import Image from 'next/image';

type User = {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
};

type WalletData = {
  eth: string[];
  sol: string[];
  custody_address: string;
};

type Position = {
  id: string;
  appName: string;
  label: string;
  value: number;
  isInRange: boolean;
  tokens: { symbol: string; }[];
};

// Enable developer mode for testing
const DEV_MODE = process.env.NODE_ENV === 'development';

export default function Home() {
  const [isInFrame, setIsInFrame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [frameSdk, setFrameSdk] = useState<any>(null);
  const [devModeEnabled, setDevModeEnabled] = useState(false);

  // Dynamically load the Farcaster Frame SDK on the client side only
  useEffect(() => {
    const loadSDK = async () => {
      try {
        // Dynamic import only on client side
        const { sdk } = await import('@farcaster/frame-sdk');
        setFrameSdk(sdk);
        
        // Check if we're in a frame or development mode
        const inFrame = await sdk.isInMiniApp();
        console.log('Frame SDK loaded, in frame:', inFrame);
        
        if (inFrame) {
          setIsInFrame(true);
          // Call ready() immediately to dismiss splash screen
          try {
            await sdk.actions.ready();
            console.log('Successfully called ready()');
          } catch (readyError) {
            console.error('Error calling ready():', readyError);
          }
        } else {
          console.log('Not running in a Farcaster Frame. SDK context:', sdk.context);
          setIsInFrame(false);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Frame SDK:', err);
        setIsInFrame(false);
        setIsLoading(false);
      }
    };

    loadSDK();
  }, []);

  // Enable developer mode
  const enableDevMode = () => {
    setDevModeEnabled(true);
    // Mock the Frame environment
    setIsInFrame(true);
  };

  // Handle Sign in with Farcaster
  const handleSignIn = async () => {
    if (!frameSdk && !devModeEnabled) {
      setError('Frame SDK not loaded. Please try again.');
      return;
    }
    
    if (!isInFrame && !devModeEnabled) {
      setError('This app must be opened in a Farcaster Frame or client to authenticate.');
      return;
    }
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      // Get nonce from server
      const { data: nonceData } = await axios.post('/api/auth/nonce');
      const { nonce, sessionId } = nonceData;
      
      console.log('Got nonce:', nonce, 'with session:', sessionId);
      
      if (devModeEnabled) {
        // In dev mode, mock the authentication
        console.log('Using dev mode authentication');
        
        // Mock authentication response - using immediate execution instead of setTimeout
        try {
          console.log('Setting up mock authentication data');
          
          const mockUser = {
            fid: 12345,
            username: 'devuser',
            displayName: 'Development User',
            pfp: 'https://picsum.photos/200'
          };
          
          // Mock token
          const mockToken = 'dev-token-12345';
          
          console.log('Setting mock user and token');
          setUser(mockUser);
          setToken(mockToken);
          setIsAuthenticated(true);
          
          // Mock wallet data
          const mockWallets = {
            eth: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
            sol: [],
            custody_address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
          };
          
          console.log('Setting mock wallets');
          setWallets(mockWallets);
          
          // Mock positions data
          const mockPositions = [
            {
              id: 'uniswap-v3-eth-usdc',
              appName: 'Uniswap V3',
              label: 'ETH-USDC',
              value: 1250.75,
              isInRange: true,
              tokens: [{ symbol: 'ETH' }, { symbol: 'USDC' }]
            },
            {
              id: 'aerodrome-weth-usdc',
              appName: 'Aerodrome',
              label: 'WETH-USDC',
              value: 890.25,
              isInRange: false,
              tokens: [{ symbol: 'WETH' }, { symbol: 'USDC' }]
            }
          ];
          
          console.log('Setting mock positions');
          setPositions(mockPositions);
          console.log('Mock authentication complete');
        } catch (mockErr) {
          console.error('Error in mock authentication:', mockErr);
          setError('Error during mock authentication setup');
        } finally {
          setIsAuthenticating(false);
        }
      } else {
        // Normal Farcaster authentication
        try {
          const signInResult = await frameSdk.actions.signIn({ nonce });
          console.log('Sign in result:', signInResult);
          
          // Verify signature with our backend
          const { data: authData } = await axios.post('/api/auth/verify', {
            message: signInResult.message,
            signature: signInResult.signature,
            sessionId
          });
          
          // Save auth token and user data
          setToken(authData.token);
          setUser(authData.user);
          setIsAuthenticated(true);
          
          // Fetch user's wallets
          await fetchWallets(authData.token);
        } catch (signInErr) {
          console.error('Error during SIWF flow:', signInErr);
          setError('Error during Farcaster authentication. Make sure you are using a Farcaster-compatible client.');
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Failed to authenticate. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Fetch user's wallets
  const fetchWallets = async (authToken: string) => {
    try {
      const { data } = await axios.get('/api/user/wallets', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      setWallets(data);
      
      // If we have wallets, fetch positions
      if (data.eth.length > 0) {
        await fetchPositions(authToken, data.eth);
      }
    } catch (err) {
      console.error('Error fetching wallets:', err);
      setError('Failed to fetch wallet data.');
    }
  };

  // Fetch DeFi positions
  const fetchPositions = async (authToken: string, addresses: string[]) => {
    try {
      const queryParams = new URLSearchParams();
      addresses.forEach(address => queryParams.append('addresses', address));
      
      const { data } = await axios.get(`/api/positions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      setPositions(data.positions || []);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to fetch position data.');
    }
  };

  // Generate the frame metadata
  const frameMetadata = {
    version: "next", 
    imageUrl: "https://defi-tracker.vercel.app/og-image.png",
    button: {
      title: "Track DeFi Positions",
      action: {
        type: "launch_frame",
        name: "DeFi Position Tracker",
        url: process.env.NEXT_PUBLIC_BASE_URL || "https://defi-tracker.vercel.app",
        splashImageUrl: "https://defi-tracker.vercel.app/logo.png",
        splashBackgroundColor: "#000000"
      }
    }
  };

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-4">Loading...</div>;
    }

    if (!isInFrame && !devModeEnabled) {
      return (
        <div className="text-center p-4">
          <h2 className="text-xl font-bold mb-2">Farcaster Frame Required</h2>
          <p className="mb-4">This app needs to run inside a Farcaster client.</p>
          <p className="text-sm text-gray-500">If you're testing in development, note that this app can only authenticate when opened from within a Farcaster Frame or client that supports Frames.</p>
          
          {DEV_MODE && (
            <div className="mt-4">
              <button
                onClick={enableDevMode}
                className="btn btn-secondary"
              >
                Enable Developer Testing Mode
              </button>
              <p className="mt-2 text-xs text-gray-500">This will simulate the Farcaster environment for testing purposes.</p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm">
            <p className="font-bold">Development Testing:</p>
            <p>For testing purposes, you can create a mock Farcaster environment or use a Farcaster client that supports Frame testing.</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="text-center p-4">
          <h2 className="text-xl font-bold mb-2">Sign in with Farcaster</h2>
          <p className="mb-4">Connect your Farcaster account to track your DeFi positions.</p>
          <button
            className="btn btn-primary"
            onClick={handleSignIn}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'Connecting...' : 'Sign in with Farcaster'}
          </button>
          {devModeEnabled && (
            <p className="mt-2 text-xs text-gray-500">Using developer testing mode.</p>
          )}
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          {user?.pfp && (
            <div className="mr-2 relative w-12 h-12 rounded-full overflow-hidden">
              <Image 
                src={user.pfp}
                alt={user.displayName || user.username}
                fill
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{user?.displayName || user?.username}</h2>
            <p className="text-gray-600">@{user?.username}</p>
          </div>
        </div>

        {wallets && (
          <div className="mb-4">
            <h3 className="text-lg font-bold mb-2">Connected Wallets</h3>
            <div className="space-y-1 text-sm">
              {wallets.eth.map((address) => (
                <div key={address} className="address">{address}</div>
              ))}
              <div className="address">{wallets.custody_address} (Custody)</div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold mb-2">DeFi Positions on Base</h3>
          {positions.length === 0 ? (
            <p>No positions found.</p>
          ) : (
            <div className="space-y-2">
              {positions.map((position) => (
                <div key={position.id} className={`position-card ${position.isInRange ? 'position-card-in-range' : 'position-card-out-range'}`}>
                  <div className="position-card-header">
                    <span className="position-card-title">{position.label}</span>
                    <span className="position-card-value">${position.value.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>{position.appName}</div>
                    <div className={`badge ${position.isInRange ? 'badge-success' : 'badge-error'}`}>
                      {position.isInRange ? 'In Range' : 'Out of Range'}
                    </div>
                  </div>
                  <div className="position-card-tokens mt-2">
                    {position.tokens.map((token, i) => (
                      <span key={i} className="token-tag">{token.symbol}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>DeFi Position Tracker | Farcaster Mini App</title>
        <meta name="description" content="Track your DeFi positions on Base chain and get alerts when your LPs go out of range" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="fc:frame" content={JSON.stringify(frameMetadata)} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container mx-auto max-w-2xl min-h-screen">
        {renderContent()}
      </main>
    </>
  );
} 