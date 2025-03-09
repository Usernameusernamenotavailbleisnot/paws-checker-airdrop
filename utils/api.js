import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import logger from './logger.js';
import moment from 'moment';

/**
 * Create axios client with optional proxy
 * @param {string|null} proxy - Proxy URL or null
 * @param {Object} config - Configuration
 * @returns {axios} - Axios instance
 */
export const createApiClient = (proxy = null, config) => {
  // Base axios configuration
  const axiosConfig = {
    headers: {
      'accept': 'application/json',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.7',
      'content-type': 'application/json',
      'local-date': moment().utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
      'origin': 'https://paws.community',
      'priority': 'u=1, i',
      'referer': 'https://paws.community/',
      'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Brave";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'sec-gpc': '1',
      'secure-check': 'paws',
      'user-agent': config.userAgent
    },
    timeout: 30000 // 30 seconds timeout
  };
  
  // Add proxy if provided
  if (proxy) {
    logger.debug(`Using proxy: ${proxy}`);
    const proxyAgent = new HttpsProxyAgent(proxy);
    axiosConfig.httpsAgent = proxyAgent;
    axiosConfig.proxy = false; // Important: Don't use the default proxy settings
  }
  
  return axios.create(axiosConfig);
};

/**
 * Check OG eligibility for Paws
 * @param {Object} signedData - Signature data
 * @param {string} publicKey - Wallet public key
 * @param {string|null} proxy - Proxy URL or null
 * @param {Object} config - Configuration
 * @returns {Promise<Object>} - Eligibility check result
 */
export const checkPawsEligibility = async (signedData, publicKey, proxy = null, config) => {
  const client = createApiClient(proxy, config);
  
  try {
    const payload = {
      signature: signedData.signature,
      publicKey: signedData.publicKey,
      token: config.signatureMessage,
      authToken: ""
    };
    
    logger.debug(`Checking eligibility...`, publicKey);
    
    const response = await client.post(config.apiEndpoint, payload);
    
    // Check if response is successful
    if (response.data.success) {
      return {
        eligible: true,
        amount: response.data.data,
        error: null
      };
    } else {
      return {
        eligible: false,
        amount: 0,
        error: response.data.error || 'Unknown error'
      };
    }
  } catch (error) {
    // Handle different types of errors
    if (error.response) {
      // Check if it's a "No OG drop" response (common case, not a true error)
      if (error.response.status === 400 && 
          error.response.data?.error === "No OG drop") {
        // This is not an error, just not eligible
        return {
          eligible: false,
          amount: 0,
          error: "No OG drop"
        };
      }
      
      // Other API errors
      logger.error(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`, publicKey);
      return {
        eligible: false,
        amount: 0,
        error: error.response.data?.error || `HTTP error ${error.response.status}`
      };
    } else if (error.request) {
      // No response received
      logger.error(`No response from API: ${error.message}`, publicKey);
      throw new Error(`No response from API: ${error.message}`);
    } else {
      // Request setup error
      logger.error(`Request error: ${error.message}`, publicKey);
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Check eligibility with retry mechanism
 * @param {Object} signedData - Signature data
 * @param {string} publicKey - Wallet public key
 * @param {string|null} proxy - Proxy URL or null
 * @param {Object} config - Configuration
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Object>} - Eligibility check result
 */
export const checkEligibilityWithRetry = async (signedData, publicKey, proxy = null, config, retryOptions) => {
  let lastError;
  let retryCount = 0;
  
  while (retryCount <= retryOptions.retries) {
    try {
      return await checkPawsEligibility(signedData, publicKey, proxy, config);
    } catch (error) {
      lastError = error;
      retryCount++;
      
      if (retryCount > retryOptions.retries) {
        logger.error(`Failed after ${retryCount} attempts: ${error.message}`, publicKey);
        throw lastError;
      }
      
      // Calculate backoff delay
      const backoffTime = Math.min(
        Math.round(Math.random() * Math.pow(2, retryCount) * retryOptions.minTimeout),
        retryOptions.maxTimeout
      );
      
      logger.warn(`Retrying API request in ${backoffTime}ms (attempt ${retryCount}/${retryOptions.retries})`, publicKey);
      
      // Wait for backoff period
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  throw lastError;
};