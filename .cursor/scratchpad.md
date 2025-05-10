# Farcaster Mini App: DeFi Position Tracker

## Background and Motivation
This project aims to build a Farcaster mini app that allows users to:
1. Sign in with Farcaster authentication
2. View all their DeFi positions on Base chain across all connected wallets
3. Receive notifications in Farcaster when concentrated volatile LP positions move out of range

The application will provide users with a convenient way to monitor their investments and receive timely alerts to take action when necessary, all within the Farcaster ecosystem.

## Key Challenges and Analysis

### Critical Issue Analysis (June 2024)
After reviewing the logs and our implementation, we've identified that our application is fundamentally broken in the Farcaster Mini App environment. The current error message "Error: window.sdk not found, using dynamic import (dev mode)" indicates that our code is still not able to access the Farcaster SDK properly in the Mini App environment.

Let's perform a deeper analysis of what's going wrong:

1. **Environment Understanding Error**: 
   - We've fundamentally misunderstood how Farcaster Mini Apps are hosted and run
   - The error message indicates our JavaScript is looking for `window.sdk` but not finding it
   - This suggests our application is not being properly loaded in the Farcaster Mini App context

2. **Deployment and Build Issues**:
   - Our local development environment is not equivalent to how the app runs in Farcaster
   - The SDK is only injected in the actual Farcaster Mini App environment, not in local dev
   - We haven't properly configured how our app is built and deployed for Farcaster Mini App use

3. **Mini App Architecture Misunderstanding**:
   - Farcaster Mini Apps are fundamentally different from traditional web apps
   - They run in an iframe within the Farcaster client, with specific constraints and features
   - We need to understand the correct lifecycle and initialization process

4. **API Authentication Issues**:
   - The Zapper API is returning 401 Unauthorized errors (visible in logs)
   - Our API key appears incorrectly formatted or invalid
   - We're seeing "YOUR_ZAPPER_API_KEY_HERE" in the request URL, suggesting placeholder text

### Root Cause Analysis
Based on terminal logs and our code, we can identify several root causes:

1. **Improper Farcaster SDK Detection**: 
   - Our app is failing to detect the SDK because we're not understanding when/how it's available
   - The line in our request logs showing "YOUR_ZAPPER_API_KEY_HERE" indicates our environment variables aren't being properly passed

2. **Environment Configuration**:
   - The Zapper API key is misconfigured - we're seeing the literal string "YOUR_ZAPPER_API_KEY_HERE" in API requests
   - Environment variables don't appear to be properly set up in the deployment environment

3. **Build and Deployment Process**:
   - We haven't properly set up our Mini App for the Farcaster environment
   - We may be missing critical deployment steps or configurations

### Documentation Insights Re-examined
From the documentation:

1. **Farcaster Mini Apps** require:
   - Specific meta tags for frames
   - A proper build and deployment process
   - Understanding that local development is fundamentally different from the Mini App environment

2. **User Wallet Discovery**:
   - Only works in the actual Farcaster environment, not in local development

3. **API Integration**:
   - API keys must be properly configured in the deployment environment
   - API requests must handle the transition between development and production

## Revised Technical Architecture
We need a complete revision of our approach:

1. **Proper Farcaster Mini App Setup**:
   - Follow the exact Frame specification for meta tags
   - Understand that window.sdk is ONLY available in the actual Farcaster environment
   - Create a proper development experience with fallbacks

2. **Environment Variable Management**:
   - Properly configure the Zapper API key in the deployment environment (Vercel)
   - Ensure the API key is correctly accessed and formatted in API requests
   - Implement proper validation and error handling

3. **Clear Separation Between Development and Production**:
   - Create a distinct development mode that uses mock data
   - Ensure production uses the proper Farcaster SDK and API integrations

## Detailed Action Plan

### Phase 1: Fix Mini App Frame Metadata ✅

The Farcaster Frame specification has specific requirements for meta tags that must be followed precisely:

1. **Update the frame metadata in `pages/index.tsx` to exactly match the Frame specification** ✅:
   - Ensure all meta tags follow the exact format specified by Farcaster
   - Remove any custom or unnecessary meta tags that could confuse the Frame parser
   - Test the Frame metadata with the Farcaster Frame validator

2. **Implementation details** ✅:

```tsx
{/* Frame metadata - exact Farcaster Frame specification */}
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://defi-tracker.vercel.app/og-image.png" />
<meta property="fc:frame:button:1" content="Track My DeFi Positions" />
<meta property="fc:frame:post_url" content="https://defi-tracker.vercel.app/api/frame-action" />
```

3. **Create a frame action handler endpoint** ✅:
   - Add a new API endpoint at `/api/frame-action` to handle button clicks
   - This endpoint must follow the Farcaster Frame Action specification

### Phase 2: Fix SDK Detection and Environment Handling ✅

1. **Completely revise the SDK detection logic** ✅:
   - Implement proper detection of the Farcaster environment
   - Create clear development vs. production modes
   - Implement detailed logging to understand the execution context

2. **Implementation details** ✅:

```typescript
// At the very beginning of the component, before any other logic
useEffect(() => {
  // Log the environment for debugging
  console.log('Environment info:', {
    nodeEnv: process.env.NODE_ENV,
    isBrowser: typeof window !== 'undefined',
    hasFarcasterSDK: typeof window !== 'undefined' && !!(window as any).sdk,
    windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('sdk')).join(', ') : 'none'
  });
  
  const initializeApp = async () => {
    try {
      // DEVELOPMENT ENVIRONMENT:
      // If we're in development or the SDK is unavailable, use mock data
      if (process.env.NODE_ENV === 'development' || typeof window === 'undefined' || !(window as any).sdk) {
        console.log('Using development mode with mock data');
        setSdkLoaded(false);
        setReadyCalled(false);
        setIsInFrame(false);
        
        // Use a test wallet for development
        const testWallets = ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
        setWallets(testWallets);
        await loadPositions(testWallets);
        return;
      }
      
      // PRODUCTION ENVIRONMENT:
      // We should only reach here if we're in the Farcaster environment
      console.log('Detected Farcaster SDK, using production mode');
      const sdk = (window as any).sdk;
      setSdkLoaded(true);
      
      try {
        // Signal the app is ready to Farcaster
        await sdk.actions.ready();
        setReadyCalled(true);
        console.log('Ready signal sent to Farcaster');
        
        // Get user data
        if (sdk.user) {
          console.log('Found user data in SDK:', sdk.user);
          setUser(sdk.user);
          
          // Extract wallet addresses
          const addresses = extractWalletAddresses(sdk.user);
          if (addresses.length > 0) {
            setWallets(addresses);
            
            // Load positions for these wallets
            await loadPositions(addresses);
          } else {
            setError('No wallet addresses available. Please connect a wallet to your Farcaster account.');
          }
        } else {
          console.log('No user data found in Farcaster SDK');
          setError('Unable to retrieve user data from Farcaster');
        }
      } catch (error) {
        console.error('Error in Farcaster SDK operations:', error);
        setError(`Farcaster SDK error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setError(`App initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  initializeApp();
}, []);
```

### Phase 3: Fix API Key Configuration ✅

1. **Fix the Zapper API key configuration** ✅:
   - Properly configure the API key in the Vercel environment
   - Update the API endpoint to handle the key correctly
   - Add validation to ensure the key is not a placeholder

2. **Implementation details** ✅:

```typescript
// In src/pages/api/mini-app-positions.ts
// Add proper validation for the API key
const ZAPPER_API_KEY = process.env.ZAPPER_API_KEY || '';

// Validate the API key format
if (!ZAPPER_API_KEY || ZAPPER_API_KEY.includes('YOUR_') || ZAPPER_API_KEY.length < 10) {
  console.error('Invalid Zapper API key format:', {
    keyExists: !!ZAPPER_API_KEY,
    keyLength: ZAPPER_API_KEY.length,
    isPlaceholder: ZAPPER_API_KEY.includes('YOUR_')
  });
  
  // Return a more specific error message to help with debugging
  if (ZAPPER_API_KEY.includes('YOUR_')) {
    console.error('Error: Zapper API key contains placeholder text "YOUR_"');
    return res.status(500).json({ 
      error: 'API Configuration Error', 
      message: 'The Zapper API key appears to be a placeholder. Please set a valid API key in environment variables.' 
    });
  }
  
  // In development, we can fall back to mock data
  if (process.env.NODE_ENV === 'development') {
    console.log('Development environment detected - returning mock data despite invalid API key');
    return returnMockData(res);
  }
  
  return res.status(500).json({ 
    error: 'API Configuration Error',
    message: 'The Zapper API key is invalid or missing. Please check your environment variables.'
  });
}
```

### Phase 4: Improve Deployment Process

1. **Configure Vercel environment properly**:
   - Ensure all required environment variables are set in Vercel
   - Set up a proper production deployment pipeline
   - Create separate development and production environments

2. **Implementation details**:
   - Set `ZAPPER_API_KEY` in Vercel environment variables (NOT as a placeholder)
   - Create a proper build process that handles environment differences
   - Implement a proper error reporting mechanism in production

### Phase 5: Testing and Validation

1. **Implement proper testing for the Mini App environment**:
   - Create a test suite for the Frame metadata
   - Test the app in the Farcaster Frame validator
   - Verify API endpoints with mock data

2. **Implementation details**:
   - Use the Farcaster Frame validator to test frame metadata
   - Create a test endpoint to verify environment variables
   - Test API endpoints with curl or Postman

## Project Status Board
- [x] Set up the project foundation with Next.js and TypeScript
- [x] Implement basic Farcaster SDK integration
- [x] Create initial position display UI
- [x] Implement Zapper API integration
- [x] Fix Frame metadata to exactly match Farcaster specification
- [x] Create frame action handler endpoint
- [x] Fix SDK detection for different environments
- [x] Fix Zapper API key configuration
- [ ] Configure Vercel environment variables correctly
- [ ] Test in Farcaster Frame validator
- [ ] Deploy fixed version to production

## Current Status / Progress Tracking

We've implemented significant improvements to our DeFi Position Tracker mini app to address the root causes of our issues:

1. **Frame Metadata**: We've updated the frame metadata to exactly match the Farcaster specification. This includes:
   - Setting proper `fc:frame` meta tags
   - Adding a specific `post_url` for button actions
   - Creating a frame action handler endpoint to process button clicks

2. **SDK Detection**: We've completely revised the SDK detection logic to handle both development and production environments:
   - In development: Uses mock data and doesn't rely on window.sdk
   - In production: Properly detects the SDK injected by Farcaster
   - Clear logging of environment details to help with debugging

3. **API Endpoint**: We've improved the API endpoint with better validation and error handling:
   - Validates the Zapper API key format before making requests
   - Returns specific error messages for different failure cases
   - Properly handles address lists for multiple wallets
   - Deployed the endpoint in the correct location (`pages/api`)

4. **Better Error Reporting**: We've added comprehensive error logging throughout to help debug issues:
   - Detailed console logs for each step of initialization
   - Clear error messages displayed to users
   - Environment information logged to help with debugging

## Next Steps

To completely resolve our issues and get the mini app working properly, we need to:

1. **Configure Vercel Environment Variables**:
   - Set a valid `ZAPPER_API_KEY` in the Vercel environment (not a placeholder)
   - Verify all other environment variables are properly set

2. **Test in the Farcaster Frame Environment**:
   - Use the Farcaster Frame validator to test our frame metadata
   - Test the deployed app in Warpcast or another Farcaster client
   - Verify that all components work together as expected

3. **Deploy a Fixed Version**:
   - Deploy the updated code to production
   - Verify everything works in the production environment
   - Monitor for any remaining issues

## Executor's Feedback or Assistance Requests

We've made significant progress in addressing the fundamental issues with our DeFi Position Tracker mini app. The key improvements include:

1. Properly formatted frame metadata according to the Farcaster specification
2. A complete rewrite of the SDK detection logic with clear separation between development and production environments
3. Better API key validation that reports specific errors
4. A new frame action handler endpoint to properly process button clicks

Before we can consider this fully resolved, we need to:

1. Ensure the Zapper API key is correctly configured in the Vercel environment
2. Test the app in the actual Farcaster frame environment
3. Deploy the fixed version to production

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
- **Next.js may have dual page structures** with both `src/pages` and `pages` directories
- **The Farcaster Mini App environment is fundamentally different from local development**
- **Environment variables must be properly configured in the deployment environment**
- **API keys should be validated to ensure they're not placeholders**
- **Frame metadata must exactly match the Farcaster specification**
- **Frame action handlers are required for handling button clicks in Farcaster Frames**
- **Clear separation between development and production modes is essential for Mini Apps**
