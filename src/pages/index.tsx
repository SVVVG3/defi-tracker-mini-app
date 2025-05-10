import { useEffect, useState } from 'react';
import Head from 'next/head';

// This is a static page that will load quickly before any JavaScript
export default function Home() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Static frame metadata - this is critical
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

  // Mount effect for client-side initialization
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
            if (isMounted) setError('window.sdk not found, using dynamic import (dev mode)');
          } catch (e) {
            if (isMounted) setError('Farcaster SDK not found in window or via import');
            return;
          }
        }
        if (!isMounted) return;
        
        setSdkLoaded(true);
        
        // CRITICAL CHANGE: Call ready() immediately without checking for frame
        try {
          await sdk.actions.ready({ disableNativeGestures: true });
          if (isMounted) setReadyCalled(true);
          
          // Check if we're in a frame environment AFTER calling ready()
          try {
            const inFrame = await sdk.isInMiniApp();
            if (isMounted) setIsInFrame(inFrame);
          } catch (e) {
            if (isMounted) setError(`Frame detection error: ${e instanceof Error ? e.message : String(e)}`);
          }
        } catch (e) {
          if (isMounted) setError(`Ready error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } catch (e) {
        if (isMounted) setError(`SDK loading error: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    // Start initializing without blocking rendering
    initSDK();

    return () => {
      isMounted = false;
    };
  }, []);

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
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Status Information</h2>
          <p><strong>SDK Loaded:</strong> {sdkLoaded ? '✅' : '❌'}</p>
          <p><strong>Ready Called:</strong> {readyCalled ? '✅' : '❌'}</p>
          <p><strong>In Frame (checked after ready):</strong> {isInFrame ? '✅' : '❌'}</p>
          {error && (
            <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>
          )}
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '1px solid #eaeaea',
          marginBottom: '15px' 
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>App Status</h3>
          <p>App loaded and ready</p>
        </div>
      </div>
    </>
  );
} 