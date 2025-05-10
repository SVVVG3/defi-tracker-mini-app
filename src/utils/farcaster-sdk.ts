// Farcaster SDK initialization utility
// This handles polling for SDK availability and provides a consistent interface

/**
 * A class that manages access to the Farcaster SDK
 * It handles polling for SDK availability and provides utility methods
 */
export class FarcasterSDKManager {
  private static instance: FarcasterSDKManager;
  private sdk: any | null = null;
  private isInitialized = false;
  private initPromise: Promise<any> | null = null;
  private initAttempts = 0;
  private maxInitAttempts = 10;
  private pollingIntervalMs = 500;
  
  // Singleton pattern
  public static getInstance(): FarcasterSDKManager {
    if (!FarcasterSDKManager.instance) {
      FarcasterSDKManager.instance = new FarcasterSDKManager();
    }
    return FarcasterSDKManager.instance;
  }
  
  private constructor() {
    // Private constructor to enforce singleton
    if (typeof window !== 'undefined') {
      this.sdk = (window as any).sdk || null;
      this.isInitialized = !!this.sdk;
    }
  }
  
  /**
   * Initializes the SDK, polling for it if necessary
   */
  public initialize(): Promise<any> {
    if (this.isInitialized && this.sdk) {
      return Promise.resolve(this.sdk);
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = new Promise((resolve, reject) => {
      // Check if SDK is already available
      if (typeof window !== 'undefined' && (window as any).sdk) {
        this.sdk = (window as any).sdk;
        this.isInitialized = true;
        console.log('Farcaster SDK found immediately');
        resolve(this.sdk);
        return;
      }
      
      console.log('SDK not immediately available, polling for it...');
      
      // Start polling for SDK
      const intervalId = setInterval(() => {
        this.initAttempts++;
        console.log(`Polling for Farcaster SDK (attempt ${this.initAttempts}/${this.maxInitAttempts})`);
        
        if (typeof window !== 'undefined' && (window as any).sdk) {
          clearInterval(intervalId);
          this.sdk = (window as any).sdk;
          this.isInitialized = true;
          console.log('Farcaster SDK found after polling!');
          resolve(this.sdk);
        } else if (this.initAttempts >= this.maxInitAttempts) {
          clearInterval(intervalId);
          const error = new Error('Failed to load Farcaster SDK after maximum attempts');
          console.error(error);
          reject(error);
        }
      }, this.pollingIntervalMs);
    });
    
    return this.initPromise;
  }
  
  /**
   * Gets the SDK instance
   */
  public async getSDK(): Promise<any> {
    if (this.isInitialized && this.sdk) {
      return this.sdk;
    }
    
    return this.initialize();
  }
  
  /**
   * Sends the ready signal to Farcaster app
   */
  public async sendReady(): Promise<boolean> {
    try {
      const sdk = await this.getSDK();
      if (sdk && sdk.actions && sdk.actions.ready) {
        await sdk.actions.ready();
        console.log('Ready signal sent to Farcaster');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending ready signal:', error);
      return false;
    }
  }
  
  /**
   * Gets the current user from the SDK
   */
  public async getUser(): Promise<any> {
    try {
      const sdk = await this.getSDK();
      return sdk?.user || null;
    } catch (error) {
      console.error('Error getting user from SDK:', error);
      return null;
    }
  }
  
  /**
   * Checks if we're running in a Farcaster frame
   */
  public async isInFrame(): Promise<boolean> {
    try {
      const sdk = await this.getSDK();
      return !!sdk && (typeof sdk.isInMiniApp === 'function' ? await sdk.isInMiniApp() : true);
    } catch (error) {
      console.error('Error checking if in frame:', error);
      return false;
    }
  }
}

// Export a default instance for convenience
export default FarcasterSDKManager.getInstance(); 