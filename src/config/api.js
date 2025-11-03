// Config for Basketball AI App API endpoints
// Update these values based on your deployment

const API_CONFIG = {
  // Development (local FastAPI server)
  development: {
    API_BASE_URL: 'http://localhost:8000',
    isOfflineMode: false,
    timeout: 600000, // 10 minutes for long-running model processing
  },
  
  // Production (Render deployment - separate backend repository)
  production: {
    API_BASE_URL: 'https://basketballaiappapi.onrender.com',
    isOfflineMode: false,
    timeout: 600000, // 10 minutes for long-running model processing (increased from 30s)
  },
  
  // Offline mode (for testing without backend)
  offline: {
    API_BASE_URL: null,
    isOfflineMode: true,
    timeout: 0,
  }
};

// Set current environment
// Change this to switch between environments
const CURRENT_ENV = 'production'; // 'development' | 'production' | 'offline'

// Export current configuration
export const CONFIG = API_CONFIG[CURRENT_ENV];

// Helper function to get config for specific environment
export const getConfig = (env) => API_CONFIG[env] || API_CONFIG.development;

// Helper to check if using production
export const isProduction = () => CURRENT_ENV === 'production';

// Helper to check if offline
export const isOffline = () => CURRENT_ENV === 'offline';

export default CONFIG;
