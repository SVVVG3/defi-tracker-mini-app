import { useEffect } from 'react';
import Head from 'next/head';

// This is a static page that will load quickly before any JavaScript
export default function Home() {
  // Mount effect for client-side initialization
  useEffect(() => {
    // Try to initialize SDK in a non-blocking way
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/frame-sdk');
        
        // Call ready immediately - the KEY is to call it as early as possible
        // Not waiting for any state changes or checks
        try {
          await sdk.actions.ready({ disableNativeGestures: true });
          console.log('Ready called');
        } catch (e) {
          console.error('Ready call failed:', e);
        }
      } catch (e) {
        console.error('Failed to load SDK:', e);
      }
    };

    // Start initializing without blocking rendering
    initSDK();
  }, []);

  return (
    <>
      <Head>
        <title>DeFi Position Tracker</title>
        <meta name="description" content="Track your DeFi positions on Base chain" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="fc:frame" content={JSON.stringify({
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
      </Head>
      
      {/* Pre-rendered HTML structure - this will be visible before any JS loads */}
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
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '20px' 
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Welcome</h2>
          <p>Track your DeFi positions across multiple protocols.</p>
          <button style={{
            marginTop: '15px',
            padding: '10px 15px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Sign in with Farcaster
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '15px' 
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>App Status</h3>
          <p>Ready to use</p>
        </div>
      </div>
    </>
  );
} 