import fs from 'fs-extra';
import logger from './logger.js';

/**
 * Read lines from a file
 * @param {string} filePath - Path to file
 * @returns {Promise<string[]>} - Array of lines
 */
export const readLines = async (filePath) => {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      logger.warn(`File not found: ${filePath}`);
      return [];
    }
    
    // Read file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Split by newline and filter empty lines
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
  } catch (error) {
    logger.error(`Error reading file ${filePath}: ${error.message}`);
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
};

/**
 * Read private keys from file
 * @param {string} filePath - Path to file
 * @returns {Promise<string[]>} - Array of private keys
 */
export const readPrivateKeys = async (filePath = 'pk.txt') => {
  try {
    const keys = await readLines(filePath);
    logger.info(`Loaded ${keys.length} private keys`);
    return keys;
  } catch (error) {
    logger.error(`Failed to load private keys: ${error.message}`);
    throw new Error(`Failed to load private keys: ${error.message}`);
  }
};

/**
 * Read proxies from file
 * @param {string} filePath - Path to file
 * @returns {Promise<string[]>} - Array of proxies
 */
export const readProxies = async (filePath = 'proxy.txt') => {
  try {
    const proxies = await readLines(filePath);
    logger.info(`Loaded ${proxies.length} proxies`);
    return proxies;
  } catch (error) {
    logger.error(`Failed to load proxies: ${error.message}`);
    return [];
  }
};

/**
 * Read configuration from file
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} - Configuration object
 */
export const readConfig = async (filePath = 'config.json') => {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      logger.error(`Configuration file not found: ${filePath}`);
      throw new Error(`Configuration file not found: ${filePath}`);
    }
    
    // Read file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse JSON
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Error reading configuration: ${error.message}`);
    throw new Error(`Failed to read configuration: ${error.message}`);
  }
};

/**
 * Save results to file
 * @param {Object[]} results - Results to save
 * @returns {Promise<void>}
 */
export const saveResults = async (results) => {
  try {
    // Create result folder if it doesn't exist
    await fs.ensureDir('result');
    
    // Filter eligible and non-eligible wallets and format with amount for eligible ones
    const eligibleWallets = results
      .filter(r => r.eligible)
      .map(r => `${r.privateKey}:${r.publicKey}:${r.amount}`);
      
    const notEligibleWallets = results
      .filter(r => !r.eligible)
      .map(r => `${r.privateKey}:${r.publicKey}`);
    
    // Save eligible wallets to eligible.txt
    if (eligibleWallets.length > 0) {
      await fs.writeFile('result/eligible.txt', eligibleWallets.join('\n'));
      logger.success(`${eligibleWallets.length} eligible wallets (pk:address:amount format) saved to result/eligible.txt`);
    } else {
      await fs.writeFile('result/eligible.txt', '');
      logger.info('No eligible wallets found');
    }
    
    // Save non-eligible wallets to noteligible.txt
    if (notEligibleWallets.length > 0) {
      await fs.writeFile('result/noteligible.txt', notEligibleWallets.join('\n'));
      logger.info(`${notEligibleWallets.length} non-eligible wallets (pk:address format) saved to result/noteligible.txt`);
    } else {
      await fs.writeFile('result/noteligible.txt', '');
      logger.info('No non-eligible wallets found');
    }
  } catch (error) {
    logger.error(`Failed to save results: ${error.message}`);
  }
};