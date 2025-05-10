import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [status, setStatus] = useState('Loading...');
  const [frameSdk, setFrameSdk] = useState<any>(null);

  // Extremely minimal implementation
  useEffect(() => {
    async function init() {
      try {
        // Display something immediately
        setStatus('Initializing...');
        
        // Load SDK
        const { sdk } = await import('@farcaster/frame-sdk');
        setFrameSdk(sdk);
        setStatus('SDK loaded');
        
        // Call ready immediately to dismiss splash screen
        try {
          await sdk.actions.ready({ disableNativeGestures: true });
          setStatus('App ready');
        } catch (e) {
          setStatus('Ready call failed: ' + (e instanceof Error ? e.message : String(e)));
        }
      } catch (e) {
        setStatus('Error: ' + (e instanceof Error ? e.message : String(e)));
      }
    }
    
    init();
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
      
      <main className="container mx-auto p-4 max-w-2xl min-h-screen bg-white text-black">
        <div className="text-center p-8 border-2 border-black rounded-lg my-20 bg-yellow-100">
          <h1 className="text-2xl font-bold mb-4">DeFi Position Tracker</h1>
          <div className="text-xl mb-4">Status: {status}</div>
          
          <div className="grid grid-cols-1 gap-4 mt-8">
            <div className="p-4 border border-gray-300 rounded-lg bg-white">
              <p className="text-lg font-bold">This is a test card</p>
              <p>If you can see this, the app is rendering correctly.</p>
            </div>
            
            <div className="p-4 border border-gray-300 rounded-lg bg-white">
              <p className="text-lg font-bold">Frame SDK Status</p>
              <p>{frameSdk ? 'SDK Loaded' : 'SDK Not Loaded'}</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 