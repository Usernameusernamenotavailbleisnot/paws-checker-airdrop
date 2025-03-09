import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import logger from './logger.js';

/**
 * Creates a Solana keypair from a private key
 * @param {string} privateKeyBase58 - Base58 encoded private key
 * @returns {Keypair|null} - Solana keypair or null if error
 */
export const createKeypairFromPrivateKey = (privateKeyBase58) => {
  try {
    // Decode base58 private key
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    
    // Create keypair
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    
    return keypair;
  } catch (error) {
    logger.error(`Failed to create keypair: ${error.message}`);
    return null;
  }
};

/**
 * Sign a message with a Solana keypair
 * @param {Keypair} keypair - Solana keypair
 * @param {string} message - Message to sign
 * @returns {Object|null} - Object with signature and public key or null if error
 */
export const signMessage = (keypair, message) => {
  try {
    // Convert message to Uint8Array
    const messageBytes = new TextEncoder().encode(message);
    
    // Sign message
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    
    // Convert signature to base58
    const signatureBase58 = bs58.encode(signature);
    
    // Get public key
    const publicKey = keypair.publicKey.toBase58();
    
    return {
      signature: signatureBase58,
      publicKey
    };
  } catch (error) {
    logger.error(`Failed to sign message: ${error.message}`);
    return null;
  }
};

/**
 * Helper function to retry a Solana operation with exponential backoff
 * @param {Function} operation - Function to retry
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<any>} - Result of the operation
 */
export const withRetry = async (operation, retryOptions = { retries: 3, minTimeout: 1000, maxTimeout: 5000 }) => {
  let lastError;
  let retryCount = 0;
  
  while (retryCount <= retryOptions.retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      retryCount++;
      
      if (retryCount > retryOptions.retries) {
        throw lastError;
      }
      
      // Calculate backoff delay
      const backoffTime = Math.min(
        Math.round(Math.random() * Math.pow(2, retryCount) * retryOptions.minTimeout),
        retryOptions.maxTimeout
      );
      
      logger.warn(`Retrying operation in ${backoffTime}ms (attempt ${retryCount}/${retryOptions.retries})`);
      
      // Wait for backoff period
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  throw lastError;
};