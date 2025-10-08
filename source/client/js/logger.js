/**
 * Client-side Logger
 * 
 * Simple logging utility for client-side debugging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = LOG_LEVELS.INFO;

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${level}: ${message} ${JSON.stringify(meta)}`;
}

export function debug(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(formatLog('DEBUG', message, meta));
  }
}

export function info(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', message, meta));
  }
}

export function warn(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, meta));
  }
}

export function error(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, meta));
  }
}
