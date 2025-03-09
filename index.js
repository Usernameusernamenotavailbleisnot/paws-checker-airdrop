import figlet from 'figlet';
import chalk from 'chalk';
import pLimit from 'p-limit';
import logger from './utils/logger.js';
import { readConfig, readPrivateKeys, readProxies, saveResults } from './utils/files.js';
import { createKeypairFromPrivateKey, signMessage, withRetry } from './utils/solana.js';
import { checkEligibilityWithRetry } from './utils/api.js';

/**
 * Display ASCII art header
 */
const displayHeader = () => {
  console.log(chalk.magenta(figlet.textSync('Paws', { font: 'ANSI Shadow', horizontalLayout: 'default' })));
  console.log(chalk.blue('======================================================'));
  console.log(chalk.green('  Paws OG Eligibility Checker Bot'));
  console.log(chalk.green(`  ${new Date().toLocaleString()}`));
  console.log(chalk.blue('======================================================'));
  console.log('');
};

/**
 * Random sleep function
 * @param {number} min - Minimum sleep time in ms
 * @param {number} max - Maximum sleep time in ms
 * @returns {Promise<void>}
 */
const randomSleep = async (min, max) => {
  const sleepTime = Math.floor(Math.random() * (max - min + 1) + min);
  logger.debug(`Sleeping for ${sleepTime}ms`);
  await new Promise(resolve => setTimeout(resolve, sleepTime));
};

/**
 * Check eligibility for a wallet
 * @param {string} privateKey - Private key
 * @param {string|null} proxy - Proxy URL or null
 * @param {Object} config - Configuration
 * @returns {Promise<Object>} - Check result
 */
const checkWalletEligibility = async (privateKey, proxy, config) => {
  try {
    // Create keypair from private key
    const keypair = await withRetry(
      () => createKeypairFromPrivateKey(privateKey),
      config.retryOptions
    );
    
    if (!keypair) {
      return {
        publicKey: 'unknown',
        eligible: false,
        error: 'Failed to create keypair'
      };
    }
    
    const publicKey = keypair.publicKey.toBase58();
    
    // Sign message
    const signedData = await withRetry(
      () => signMessage(keypair, config.signatureMessage),
      config.retryOptions
    );
    
    if (!signedData) {
      return {
        publicKey,
        eligible: false,
        error: 'Failed to sign message'
      };
    }
    
    // Check eligibility
    const eligibilityResult = await checkEligibilityWithRetry(
      signedData,
      publicKey,
      proxy,
      config,
      config.retryOptions
    );
    
    // Log result
    if (eligibilityResult.eligible) {
      logger.success(`Eligible for ${eligibilityResult.amount} tokens`, publicKey);
    } else {
      logger.warn(`Not eligible: ${eligibilityResult.error || 'Unknown reason'}`, publicKey);
    }
    
    return {
      publicKey,
      eligible: eligibilityResult.eligible,
      amount: eligibilityResult.amount,
      error: eligibilityResult.error
    };
  } catch (error) {
    logger.error(`Failed to check eligibility: ${error.message}`);
    return {
      publicKey: privateKey ? privateKey.substring(0, 4) + '...' : 'unknown',
      eligible: false,
      error: error.message
    };
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    displayHeader();
    
    // Read configuration
    const config = await readConfig();
    logger.info('Configuration loaded');
    
    // Read private keys
    const privateKeys = await readPrivateKeys();
    if (privateKeys.length === 0) {
      logger.error('No private keys found in pk.txt');
      return;
    }
    
    // Read proxies if enabled
    let proxies = [];
    if (config.enableProxy) {
      proxies = await readProxies();
      if (proxies.length === 0) {
        logger.warn('Proxy is enabled but no proxies found in proxy.txt, running without proxies');
      } else if (proxies.length < privateKeys.length) {
        logger.warn(`Only ${proxies.length} proxies for ${privateKeys.length} wallets, some wallets will share proxies`);
      }
    }
    
    // Limit concurrency
    const limit = pLimit(config.concurrency);
    
    // Process wallets
    logger.info(`Starting to process ${privateKeys.length} wallets`);
    
    const results = [];
    const tasks = privateKeys.map((privateKey, index) => {
      return limit(async () => {
        // Get proxy for this wallet or null if not using proxies
        const proxy = config.enableProxy && proxies.length > 0
          ? proxies[index % proxies.length]
          : null;
        
        // Check eligibility
        const result = await checkWalletEligibility(privateKey, proxy, config);
        
        // Add original private key to result for filtering later
        result.privateKey = privateKey;
        
        results.push(result);
        
        // Random delay between accounts
        if (index < privateKeys.length - 1) {
          await randomSleep(config.delayBetweenAccounts.min, config.delayBetweenAccounts.max);
        }
        
        return result;
      });
    });
    
    // Wait for all tasks to complete
    await Promise.all(tasks);
    
    // Save results
    await saveResults(results);
    
    // Calculate stats
    const eligibleCount = results.filter(r => r.eligible).length;
    const totalAmount = results.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    logger.info('===================== Summary =====================');
    logger.info(`Total wallets: ${results.length}`);
    logger.info(`Eligible wallets: ${eligibleCount}`);
    logger.info(`Not eligible: ${results.length - eligibleCount}`);
    logger.info(`Total tokens: ${totalAmount}`);
    logger.info('==================================================');
    
    // All done
    logger.success(`All wallets processed successfully. Bot execution completed.`);
    
  } catch (error) {
    logger.error(`Main process error: ${error.message}`);
    logger.error(error.stack);
  }
};

// Start the bot
main();