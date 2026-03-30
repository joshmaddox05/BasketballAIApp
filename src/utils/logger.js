// logger.js - Centralized logging utility
// Only outputs debug/info logs in development; warn/error always output.

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

const logger = {
  debug: (message, ...args) => {
    if (isDev) console.log(`[DEBUG] ${message}`, ...args);
  },
  info: (message, ...args) => {
    if (isDev) console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};

export default logger;
