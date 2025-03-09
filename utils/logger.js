import winston from 'winston';
import 'winston-daily-rotate-file';
import chalk from 'chalk';
import moment from 'moment';
import { MESSAGE } from 'triple-beam';
import fs from 'fs-extra';
import path from 'path';

// Ensure logs directory exists
fs.ensureDirSync('logs');

// Custom format for console and file
const customFormat = winston.format((info) => {
  const timestamp = moment().format('DD/MM/YYYY - HH:mm:ss');
  
  // Extract wallet address if present
  let walletPart = '';
  if (info.wallet) {
    // Mask wallet address - show only first 4 and last 4 characters
    const wallet = info.wallet;
    if (wallet.length > 8) {
      walletPart = wallet.substring(0, 4) + '...' + wallet.substring(wallet.length - 4);
    } else {
      walletPart = wallet;
    }
    walletPart = ` - ${walletPart}`;
  }
  
  info.formattedMessage = `[${timestamp}${walletPart}] ${info.message}`;
  return info;
});

// Console transport with colors
const consoleFormat = winston.format.combine(
  customFormat(),
  winston.format.printf((info) => {
    const { level, formattedMessage } = info;
    
    // Color based on log level
    switch (level) {
      case 'error':
        return chalk.red(formattedMessage);
      case 'warn':
        return chalk.yellow(formattedMessage);
      case 'info':
        return chalk.green(formattedMessage);
      case 'debug':
        return chalk.blue(formattedMessage);
      case 'success':
        return chalk.greenBright(formattedMessage);
      default:
        return chalk.white(formattedMessage);
    }
  })
);

// File transport without colors
const fileFormat = winston.format.combine(
  customFormat(),
  winston.format.printf((info) => {
    return info.formattedMessage;
  })
);

// Create transports
const transports = [];

// Console transport
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: 'silly'
  })
);

// File transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/paws-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  format: fileFormat,
  level: 'debug'
});

transports.push(fileRotateTransport);

// Add success level
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    debug: 4,
    silly: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    success: 'green',
    info: 'green',
    debug: 'blue',
    silly: 'gray'
  }
};

// Create logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  transports
});

// Custom functions
const logSuccess = (message, wallet = '') => {
  logger.log('success', message, { wallet });
};

const logInfo = (message, wallet = '') => {
  logger.info(message, { wallet });
};

const logError = (message, wallet = '') => {
  logger.error(message, { wallet });
};

const logWarn = (message, wallet = '') => {
  logger.warn(message, { wallet });
};

const logDebug = (message, wallet = '') => {
  logger.debug(message, { wallet });
};

export default {
  success: logSuccess,
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug
};