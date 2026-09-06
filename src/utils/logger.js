// logger.js - Centralized logging utility
// Only outputs debug/info logs in development; warn/error always output.

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

// Remote sink. services/analytics.js registers one at startup so warn/error
// also land in Sentry Logs. Nothing here imports Sentry: that keeps analytics.js
// the app's only telemetry seam, and it avoids an import cycle, since
// analytics.js logs its own failures through this module.
let remoteSink = null;

/**
 * @param {(level: string, message: string, args: any[]) => void} sink
 */
export const setRemoteSink = (sink) => {
  remoteSink = sink;
};

// Only warn/error forward. debug/info are dev-only above, and telemetry is
// disabled in dev builds by design, so forwarding them would be dead code —
// business milestones worth keeping belong at an explicit `log.info()` call
// site in services/analytics.js instead.
const forward = (level, message, args) => {
  if (!remoteSink) return;
  try {
    remoteSink(level, message, args);
  } catch {
    // A failure inside logging must never be logged. That is the loop.
  }
};

const logger = {
  debug: (message, ...args) => {
    if (isDev) console.log(`[DEBUG] ${message}`, ...args);
  },
  info: (message, ...args) => {
    if (isDev) console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
    forward('warn', message, args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
    forward('error', message, args);
  },
};

export default logger;
