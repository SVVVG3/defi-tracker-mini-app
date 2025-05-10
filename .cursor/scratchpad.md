# Farcaster Mini App: DeFi Position Tracker

## Background and Motivation
This project aims to build a Farcaster mini app that allows users to:
1. Sign in with Farcaster authentication
2. View all their DeFi positions on Base chain across all connected wallets
3. Receive notifications in Farcaster when concentrated volatile LP positions move out of range

The application will provide users with a convenient way to monitor their investments and receive timely alerts to take action when necessary, all within the Farcaster ecosystem.

## Key Challenges and Analysis

### Current Issues Assessment (June 2024)
After reviewing our application code, user feedback, and documentation for Farcaster Mini Apps, we've identified several fundamental issues:

1. **Farcaster Mini App SDK Integration**: 
   - Our current approach to Farcaster SDK integration is incorrect for the Mini App environment
   - The SDK reference shows `window.sdk` is undefined, despite us being in a Farcaster Frame
   - According to the documentation, we should be using the injected Farcaster SDK differently

2. **Authentication Flow**:
   - We're attempting to implement a complex authentication flow that's unnecessary for Mini Apps
   - In Mini Apps, user context (including connected wallets) is provided directly by the Farcaster SDK
   - We're not correctly accessing the user context from the SDK

3. **API Endpoint Structure**:
   - Our API endpoints are designed for a traditional web app, not a Mini App
   - They're requiring authentication when Mini Apps have a simplified auth model

4. **Environment Variable Access**:
   - The Zapper API key is configured but may not be correctly accessed in the serverless environment
   - Logging shows the environment variable exists but may not be properly formatted

### Documentation Insights
From the provided documentation:

1. **Farcaster Mini Apps** should:
   - Use the injected SDK directly without requiring additional sign-in
   - Access user information from `sdk.user`
   - Use absolute URLs for API calls to avoid CORS issues

2. **User Wallet Discovery**:
   - User wallets should be accessed directly from the SDK context
   - Wallet addresses can be found in `custody_address`, `verified_addresses`, and `eth_addresses` properties

3. **API Integration**:
   - Zapper API integration is correctly implemented but may need debugging
   - Environment variables should be verified in the production environment

## Technical Architecture Revision
Based on our analysis, we need to revise our approach:

1. **Farcaster SDK Integration**:
   - Properly detect and use the injected SDK in the Mini App environment
   - Use the user context provided by the SDK without additional authentication
   - Implement proper error handling for SDK availability

2. **API Endpoints**:
   - Create dedicated Mini App endpoints that don't require authentication
   - Use the Farcaster user context to authenticate requests
   - Implement proper CORS headers for Mini App environment

3. **Environment Configuration**:
   - Verify environment variables in production
   - Add more comprehensive error logging for API key issues
   - Implement fallbacks for error conditions

## Detailed Action Plan

### Phase 1: Fix Farcaster SDK Integration

The primary issue is with our SDK integration. According to the Farcaster Mini App documentation and frame examples, here's what needs to be fixed:

1. **Update SDK initialization and detection**:
   - In `pages/index.tsx`, update the SDK initialization to properly detect when running in a Mini App
   - Remove any authentication flow that's unnecessary for Mini Apps
   - Add better error handling for SDK initialization
   - Follow the pattern from the Farcaster documentation for calling `sdk.actions.ready()`

2. **Simplify user context access**:
   - Access user information directly from the SDK context
   - Extract wallet addresses from the user context
   - Use the proper debugging information to verify SDK context

### Implementation details:

Update the SDK initialization in `pages/index.tsx`:

```typescript
// Initialize SDK and user data
useEffect(() => {
  const initializeApp = async () => {
    try {
      console.log('Initializing app...');
      
      // Check for window.sdk (injected by Farcaster in Mini App environment)
      if (typeof window !== 'undefined' && window.sdk) {
        console.log('Using Farcaster injected SDK');
        const sdk = window.sdk;
        setSdkLoaded(true);
        
        try {
          // Call ready to hide the splash screen
          await sdk.actions.ready();
          setReadyCalled(true);
          console.log('Ready called successfully');
          
          // Check if in Mini App
          const inMiniApp = await sdk.isInMiniApp();
          setIsInFrame(inMiniApp);
          console.log('In Mini App context:', inMiniApp);
          
          // Get user data from SDK context
          if (inMiniApp && sdk.user) {
            console.log('User context from SDK:', sdk.user);
            setUser(sdk.user);
            
            // Extract wallet addresses
            const addresses = extractWalletAddresses(sdk.user);
            setWallets(addresses);
            
            // Load positions for the discovered wallets
            await loadPositions(addresses);
          } else {
            console.log('Not in Mini App or no user context available');
            // Use a fallback wallet for testing
            const defaultWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
            setWallets(defaultWallets);
            await loadPositions(defaultWallets);
          }
        } catch (e) {
          console.error('Error in SDK operations:', e);
          handleSdkError(e);
        }
      } else {
        console.log('Farcaster SDK not found, using fallback');
        // Fallback for development environment or when not in a Farcaster client
        handleSdkNotFound();
      }
    } catch (e) {
      console.error('App initialization error:', e);
      setError(`Initialization error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  
  initializeApp();
}, []);

// Helper to extract wallet addresses from user context
const extractWalletAddresses = (user) => {
  const addresses = [];
  
  // Add custody address if present
  if (user.custody_address) {
    addresses.push(user.custody_address);
    console.log('Added custody address:', user.custody_address);
  }
  
  // Add verified addresses if present
  if (user.verified_addresses && user.verified_addresses.length > 0) {
    addresses.push(...user.verified_addresses);
    console.log('Added verified addresses:', user.verified_addresses);
  }
  
  // Add eth addresses if present
  if (user.eth_addresses && user.eth_addresses.length > 0) {
    addresses.push(...user.eth_addresses);
    console.log('Added eth addresses:', user.eth_addresses);
  }
  
  // If no addresses found, add a default test address
  if (addresses.length === 0) {
    const testAddr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    addresses.push(testAddr);
    console.log('No user addresses found, using test address:', testAddr);
  }
  
  return addresses;
};
```

### Phase 2: Create Dedicated Mini App API Endpoint

Our current API endpoint has too much complexity. We need to simplify it for the Mini App environment:

1. **Update the mini-app-positions.ts API endpoint**:
   - Simplify the error handling
   - Add more logging for debugging
   - Focus on processing the addresses provided in the request
   - Verify the Zapper API key before making requests

2. **Improve API response format**:
   - Ensure consistent response format
   - Add more debugging information in development
   - Implement fallback to mock data when API requests fail

### Implementation details:

Verify the Zapper API key at the start of the request handler:

```typescript
// Debug info - log environment details for API key verification
console.log('API Environment:', {
  nodeEnv: process.env.NODE_ENV,
  zapperKeyExists: !!ZAPPER_API_KEY,
  zapperKeyLength: ZAPPER_API_KEY ? ZAPPER_API_KEY.length : 0,
  // Add partial key info for debugging (first 4 chars)
  zapperKeyPrefix: ZAPPER_API_KEY ? ZAPPER_API_KEY.substring(0, 4) : 'none',
});

// If we don't have a valid Zapper API key, return mock data immediately
if (!ZAPPER_API_KEY || ZAPPER_API_KEY.length < 10) {
  console.warn('Invalid or missing Zapper API key, returning mock data');
  return returnMockData(res);
}
```

### Phase 3: Update Frame Metadata

Ensure our frame metadata follows the latest Farcaster standards:

1. **Update the frame metadata in `pages/index.tsx`**:
   - Use the proper frame metadata format for vNext
   - Add the required frame tags
   - Make sure the image has the correct format

2. **Verify frame metadata rendering**:
   - Check that all metadata tags are properly rendered
   - Use the Farcaster frame validator for testing

### Implementation details:

Update the frame metadata in the `<Head>` section:

```tsx
{/* Frame metadata */}
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://defi-tracker.vercel.app/og-image.png" />
<meta property="fc:frame:button:1" content="Track My DeFi Positions" />
<meta property="fc:frame:post_url" content="https://defi-tracker.vercel.app" />
```

### Phase 4: Improve Error Handling and UI

Enhance the user experience with better error handling and UI feedback:

1. **Add comprehensive error handling**:
   - Add more detailed error messages in the UI
   - Implement error boundaries for critical components
   - Log errors with contextual information

2. **Enhance UI loading states**:
   - Add better loading indicators
   - Show progress information during data loading
   - Implement skeleton loading states

### Implementation details:

Add improved error handling in the position loading function:

```typescript
const loadPositions = async (addressList: string[] = wallets) => {
  if (!addressList.length) {
    setError('No wallet addresses to load positions for');
    return;
  }
  
  try {
    setLoading(true);
    console.log('Loading positions for wallets:', addressList);
    
    // Use absolute URL for API calls in Mini App context
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const apiUrl = `${baseUrl}/api/mini-app-positions`;
    console.log('Calling API endpoint:', apiUrl);
    
    // Call the API with the addresses
    const response = await axios.get(apiUrl, {
      params: { addresses: addressList }
    });
    
    console.log('API response status:', response.status);
    
    if (response.data && response.data.positions) {
      setPositions(response.data.positions);
      setSummary(response.data.summary);
      setError(null);
      console.log(`Loaded ${response.data.positions.length} positions`);
    } else {
      console.error('Invalid response format:', response.data);
      setError('Invalid data format received from API');
    }
  } catch (e) {
    console.error('Failed to load positions:', e);
    // Extract axios error details if available
    if (axios.isAxiosError(e)) {
      const statusCode = e.response?.status;
      const errorMessage = e.response?.data?.error || e.message;
      setError(`API error (${statusCode}): ${errorMessage}`);
      console.error('API error details:', {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message
      });
    } else {
      setError(`Failed to load positions: ${e instanceof Error ? e.message : String(e)}`);
    }
  } finally {
    setLoading(false);
  }
};
```

## Project Status Board
- [x] Set up the project foundation with Next.js and TypeScript
- [x] Implement basic Farcaster SDK integration
- [x] Create initial position display UI
- [x] Implement Zapper API integration
- [ ] Fix Farcaster SDK integration for Mini Apps
- [ ] Create dedicated Mini App API endpoints
- [ ] Fix environment variable access in production
- [ ] Implement UI improvements
- [ ] Test end-to-end in the Farcaster environment
- [ ] Deploy fixed version to production

## Current Status / Progress Tracking

The DeFi Position Tracker application is partially functional but has critical issues that prevent it from working correctly in the Farcaster Mini App environment:

1. **SDK Integration**: The application is not correctly detecting or using the Farcaster SDK in the Mini App environment.
2. **API Endpoints**: The API endpoints require authentication that doesn't work in the Mini App flow.
3. **Environment Variables**: The Zapper API key may not be correctly formatted or accessed.

Based on screenshots and logs, the app loads in the Farcaster environment, but stops at the basic loading screen without displaying positions.

## Executor's Feedback or Assistance Requests

The executor should focus on implementing the detailed action plan, starting with fixing the Farcaster SDK integration. The key issue appears to be how we're accessing the Farcaster SDK and user context in the Mini App environment.

For implementation, focus on these core tasks first:
1. Update the SDK initialization in `pages/index.tsx` to correctly detect and use the Farcaster SDK in the Mini App environment
2. Simplify the API endpoint in `src/pages/api/mini-app-positions.ts` to work better with the Mini App flow
3. Test the integration in the Farcaster Mini App environment

## Lessons
- Include info useful for debugging in the program output
- Read the file before you try to edit it
- If there are vulnerabilities that appear in the terminal, run npm audit before proceeding
- Always ask before using the -force git command
- Vercel cron jobs aren't suitable for real-time monitoring; use a dedicated WebSocket server instead
- Proper authentication is crucial for WebSocket connections to prevent unauthorized access
- Testing real-time functionality requires specialized approaches like mock events and timeouts
- **Mini Apps have a different authentication model** than traditional web apps
- **The Farcaster SDK provides user context directly** in Mini Apps
- **API endpoints for Mini Apps should not require additional authentication**
- **Always use absolute URLs for API calls in Mini Apps** to avoid CORS issues
- **Farcaster injects the SDK directly into the window object** in the Mini App environment
- **The SDK user context contains all the connected wallet addresses** needed for our app
