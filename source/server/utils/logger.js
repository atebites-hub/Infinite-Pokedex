/**
 * Structured Logger
 *
 * Provides structured logging with different levels and formatting
 * for the Infinite Pokédex server components.
 *
 * @fileoverview Structured logging utility
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * Current log level (can be set via environment variable)
 */
const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr =
    Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 */
export function error(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, meta));
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
export function warn(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, meta));
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
export function info(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', message, meta));
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
export function debug(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    console.log(formatLog('DEBUG', message, meta));
  }
}

/**
 * Create a logger instance with context
 * @param {string} context - Logger context
 * @returns {Object} Logger instance
 */
export function createLogger(context) {
  return {
    error: (message, meta = {}) => error(`[${context}] ${message}`, meta),
    warn: (message, meta = {}) => warn(`[${context}] ${message}`, meta),
    info: (message, meta = {}) => info(`[${context}] ${message}`, meta),
    debug: (message, meta = {}) => debug(`[${context}] ${message}`, meta),
  };
}

/**
 * Logger object with all methods
 */
export const logger = {
  error,
  warn,
  info,
  debug,
  createLogger,
};
