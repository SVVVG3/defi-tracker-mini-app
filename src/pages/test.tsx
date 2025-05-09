import { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import Image from 'next/image';
import { isTestEndpointsEnabled, isDevelopment } from '../utils/feature-flags';
import LoadingState from '../components/LoadingState';
import ApiErrorFallback from '../components/ApiErrorFallback';
import { useApiRequest } from '../hooks/useApiRequest';

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

// This page is only available when test endpoints are enabled
export default function TestPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customAddresses, setCustomAddresses] = useState<string>('');
  const [isDev, setIsDev] = useState(false);
  const [apiStatus, setApiStatus] = useState<{[key: string]: {status: string; time: string}}>({});

  // API request hooks
  const positionsRequest = useApiRequest<{positions: Position[]}>({
    method: 'GET'
  });
  
  const monitorRequest = useApiRequest({
    method: 'GET',
    url: '/api/test/monitor-standalone'
  });

  // Check if we're in a mode where test endpoints are enabled
  useEffect(() => {
    setIsDev(isTestEndpointsEnabled());
  }, []);

  // Check API endpoints
  const checkApiEndpoint = async (endpoint: string) => {
    setApiStatus(prev => ({
      ...prev,
      [endpoint]: { status: 'checking', time: new Date().toISOString() }
    }));
    
    try {
      await axios.get(`/api/${endpoint}`);
      setApiStatus(prev => ({
        ...prev,
        [endpoint]: { status: 'ok', time: new Date().toISOString() }
      }));
    } catch (err: any) {
      setApiStatus(prev => ({
        ...prev,
        [endpoint]: { 
          status: err.response ? `error-${err.response.status}` : 'error', 
          time: new Date().toISOString() 
        }
      }));
    }
  };

  useEffect(() => {
    if (isDev) {
      // Check API endpoints on load
      checkApiEndpoint('test/positions-standalone?addresses=0x123');
      checkApiEndpoint('test/monitor-standalone');
    }
  }, [isDev]);

  // Handle test authentication
  const handleTestAuth = async () => {
    if (!isDev) {
      setError('Test mode is only available in development');
      return;
    }
    
    setError(null);
    
    try {
      console.log('Setting up mock authentication...');
      
      // Create mock user and token
      const mockUser = {
        fid: 12345,
        username: 'testuser',
        displayName: 'Test User',
        pfp: 'https://picsum.photos/200'
      };
      
      // Mock token
      const mockToken = 'dev-token-12345';
      
      console.log('Setting mock user data');
      setUser(mockUser);
      setToken(mockToken);
      setIsAuthenticated(true);
      
      // Set up mock wallet data
      const mockWallets = {
        eth: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
        sol: [],
        custody_address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
      };
      
      console.log('Setting mock wallet data');
      setWallets(mockWallets);
      
      console.log('Auth complete. You can now use the test functions.');
    } catch (err: any) {
      console.error('Test authentication error:', err);
      setError('Failed to set up mock authentication: ' + err.message);
    }
  };

  // Fetch DeFi positions
  const fetchPositions = async (addresses: string[]) => {
    if (!addresses || addresses.length === 0) {
      setError('No addresses provided');
      return;
    }

    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      addresses.forEach(address => queryParams.append('addresses', address));
      
      // Use our API request hook
      const result = await positionsRequest.execute({
        url: `/api/test/positions-standalone?${queryParams.toString()}`,
        onSuccess: (data) => {
          console.log('Positions data received:', data);
          setPositions(data.positions || []);
        }
      });
      
      return result;
    } catch (err: any) {
      console.error('Error fetching positions:', err);
      setError('Failed to fetch position data: ' + (err.response?.data?.error || err.message));
    }
  };

  // Fetch positions for custom addresses
  const fetchCustomPositions = async () => {
    if (!customAddresses) {
      setError('Please enter at least one address');
      return;
    }
    
    const addresses = customAddresses.split(',').map(addr => addr.trim());
    if (!addresses.length) {
      setError('Please enter at least one address');
      return;
    }
    
    await fetchPositions(addresses);
  };

  // Test monitoring endpoint
  const testMonitoring = async () => {
    setError(null);
    
    try {
      // Use our API request hook
      await monitorRequest.execute();
      console.log('Monitoring test completed:', monitorRequest.data);
      setError('Monitoring test completed. Check console for results.');
    } catch (err: any) {
      console.error('Error testing monitoring:', err);
      setError('Failed to test monitoring endpoint: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isDev) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Test Page</h1>
        <p className="text-red-500">This page is only available when test endpoints are enabled.</p>
        <p className="text-sm mt-2">
          Set <code>NEXT_PUBLIC_ENABLE_TEST_ENDPOINTS=true</code> to enable this page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Head>
        <title>DeFi Tracker - Test Page</title>
      </Head>

      <h1 className="text-2xl font-bold mb-4">DeFi Tracker Test Page</h1>
      <p className="mb-4 text-yellow-600">This page is for testing purposes only and is only available in development mode.</p>
      
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono overflow-auto">
        <p className="font-bold">Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
        <p>Next.js Public Base URL: {process.env.NEXT_PUBLIC_BASE_URL || 'Not set'}</p>
        
        <h3 className="font-bold mt-2">API Status:</h3>
        <div>
          {Object.keys(apiStatus).map((endpoint) => (
            <div key={endpoint} className="flex gap-2 mt-1">
              <span className="font-bold">{endpoint}:</span>
              <span className={`${
                apiStatus[endpoint].status === 'ok' ? 'text-green-600' : 
                apiStatus[endpoint].status === 'checking' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {apiStatus[endpoint].status}
              </span>
            </div>
          ))}
          {Object.keys(apiStatus).length === 0 && <p>No API checks run yet</p>}
          <button 
            onClick={() => {
              checkApiEndpoint('test/positions-standalone?addresses=0x123');
              checkApiEndpoint('test/monitor-standalone');
            }}
            className="mt-2 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
          >
            Check API Endpoints
          </button>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="mb-4">
          <button
            onClick={handleTestAuth}
            disabled={positionsRequest.isLoading || isAuthenticated}
            className="btn btn-primary"
          >
            {positionsRequest.isLoading ? (
              <span className="flex items-center">
                <LoadingState size="small" className="mr-2" />
                Authenticating...
              </span>
            ) : (
              'Authenticate with Test Token'
            )}
          </button>
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-4 p-4 bg-gray-100 rounded-lg">
            {user?.pfp && (
              <div className="mr-2 relative w-12 h-12 rounded-full overflow-hidden">
                <Image 
                  src={user.pfp}
                  alt={user.displayName || user.username}
                  width={48}
                  height={48}
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{user?.displayName || user?.username}</h2>
              <p className="text-gray-600">@{user?.username}</p>
              <p className="text-xs text-gray-500">Token: {token?.substring(0, 15)}...</p>
            </div>
          </div>

          {wallets && (
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-bold mb-2">Test Wallets</h3>
              <div className="space-y-1 text-sm">
                {wallets.eth.map((address) => (
                  <div key={address} className="p-2 bg-white rounded">
                    {address}
                  </div>
                ))}
                <div className="p-2 bg-white rounded">
                  {wallets.custody_address} (Custody)
                </div>
              </div>
              
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => fetchPositions(wallets?.eth || [])}
                  disabled={positionsRequest.isLoading || !wallets}
                  className="btn btn-secondary mr-2"
                >
                  {positionsRequest.isLoading ? (
                    <span className="flex items-center">
                      <LoadingState size="small" className="mr-2" />
                      Fetching...
                    </span>
                  ) : (
                    'Fetch Test Positions'
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Test Custom Addresses</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customAddresses}
                onChange={(e) => setCustomAddresses(e.target.value)}
                placeholder="Enter comma-separated addresses"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={fetchCustomPositions}
                disabled={positionsRequest.isLoading || !customAddresses}
                className="btn btn-secondary"
              >
                {positionsRequest.isLoading ? (
                  <span className="flex items-center">
                    <LoadingState size="small" className="mr-2" />
                    Fetching...
                  </span>
                ) : (
                  'Fetch Custom Positions'
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Example: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F,0xdAC17F958D2ee523a2206206994597C13D831ec7</p>
          </div>

          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Test Monitoring</h3>
            <button
              onClick={testMonitoring}
              disabled={monitorRequest.isLoading}
              className="btn btn-secondary"
            >
              {monitorRequest.isLoading ? (
                <span className="flex items-center">
                  <LoadingState size="small" className="mr-2" />
                  Testing monitor...
                </span>
              ) : (
                'Test Monitor Endpoint'
              )}
            </button>
            
            {monitorRequest.error && (
              <div className="mt-3">
                <ApiErrorFallback 
                  error={monitorRequest.error} 
                  onRetry={testMonitoring}
                />
              </div>
            )}
          </div>

          <div className="mb-4 p-4 bg-gray-100 rounded-lg relative">
            <h3 className="text-lg font-bold mb-2">DeFi Positions</h3>
            
            {positionsRequest.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10 rounded">
                <LoadingState text="Loading positions..." />
              </div>
            )}
            
            {positionsRequest.error && (
              <ApiErrorFallback 
                error={positionsRequest.error} 
                onRetry={() => wallets?.eth && fetchPositions(wallets.eth)}
              />
            )}
            
            {!positionsRequest.isLoading && !positionsRequest.error && positions.length === 0 ? (
              <p>No positions found. Fetch positions to see them here.</p>
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

          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
} 