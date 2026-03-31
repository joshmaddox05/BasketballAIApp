// api.js - AI backend endpoint configuration
// Environment is driven by env.js (APP_ENV from EAS / build config).
// To switch environments, set APP_ENV in eas.json or your .env, not here.

import { IS_DEVELOPMENT, IS_PRODUCTION } from './env';

const API_CONFIG = {
  development: {
    API_BASE_URL: 'https://basketballaiappapi.onrender.com',
    isOfflineMode: false,
    timeout: 120000,
  },
  staging: {
    API_BASE_URL: 'https://basketballaiappapi.onrender.com',
    isOfflineMode: false,
    timeout: 120000,
  },
  production: {
    API_BASE_URL: 'https://basketballaiappapi.onrender.com',
    isOfflineMode: false,
    timeout: 120000,
  },
  offline: {
    API_BASE_URL: null,
    isOfflineMode: true,
    timeout: 0,
  },
};

// Resolve environment from build config — never hard-code this here.
const resolveEnv = () => {
  if (IS_PRODUCTION) return 'production';
  if (IS_DEVELOPMENT) return 'development';
  return 'staging'; // preview / TestFlight builds use staging backend
};

const CURRENT_ENV = resolveEnv();

export const CONFIG = API_CONFIG[CURRENT_ENV];

export const getConfig = (env) => API_CONFIG[env] || API_CONFIG.development;

export const isProduction = () => CURRENT_ENV === 'production';

export const isOffline = () => CURRENT_ENV === 'offline';

export const currentEnv = CURRENT_ENV;

export default CONFIG;
