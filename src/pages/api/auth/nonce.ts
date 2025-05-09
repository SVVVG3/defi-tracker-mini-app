import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// In-memory store for nonces (will be replaced with proper DB in production)
type NonceEntry = {
  nonce: string;
  createdAt: number;
};

const nonceStore: Record<string, NonceEntry> = {};
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired nonces
const cleanupExpiredNonces = () => {
  const now = Date.now();
  Object.keys(nonceStore).forEach(key => {
    if (now - nonceStore[key].createdAt > NONCE_EXPIRY_MS) {
      delete nonceStore[key];
    }
  });
};

// Function to retrieve and remove a nonce by sessionId
export const getNonceAndRemove = (sessionId: string): string | null => {
  cleanupExpiredNonces();
  
  const nonceEntry = nonceStore[sessionId];
  if (!nonceEntry) return null;
  
  const { nonce } = nonceEntry;
  delete nonceStore[sessionId];
  
  return nonce;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clean up expired nonces
    cleanupExpiredNonces();

    // Generate a sessionId
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Generate a random nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Store the nonce with the current timestamp
    nonceStore[sessionId] = {
      nonce,
      createdAt: Date.now()
    };
    
    // Return the nonce and sessionId to the client
    return res.status(200).json({ 
      nonce,
      sessionId
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 