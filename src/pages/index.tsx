import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [sdkStatus, setSdkStatus] = useState('Not yet loaded');
  
  // Initialize SDK after content is visible
  useEffect(() => {
    // Add a delay to ensure content renders first
    const timer = setTimeout(async () => {
      try {
        // Load SDK only after content is visible
        const { sdk } = await import('@farcaster/frame-sdk');
        setSdkStatus('SDK loaded, calling ready()');
        
        // Call ready
        try {
          await sdk.actions.ready({ disableNativeGestures: true });
          setSdkStatus('Ready called successfully');
        } catch (e) {
          setSdkStatus('Ready call failed: ' + (e instanceof Error ? e.message : String(e)));
        }
      } catch (e) {
        setSdkStatus('Failed to load SDK: ' + (e instanceof Error ? e.message : String(e)));
      }
    }, 1000); // 1 second delay
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>DeFi Position Tracker | Farcaster Mini App</title>
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
      
      {/* Ultra simple content with inline styles */}
      <div style={{ 
        padding: '20px',
        backgroundColor: '#FF0000', 
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        minHeight: '100vh',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ marginBottom: '20px' }}>
          DEFI TRACKER APP
        </div>
        
        <div style={{
          backgroundColor: '#FFFF00',
          color: '#000000',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          THIS IS A TEST CARD
        </div>
        
        <div style={{
          backgroundColor: '#FFFFFF',
          color: '#000000',
          padding: '20px',
          borderRadius: '10px'
        }}>
          SDK Status: {sdkStatus}
        </div>
      </div>
    </>
  );
} 