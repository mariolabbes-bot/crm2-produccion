/**
 * Safely get environment variables in the frontend.
 * This prevents "process is not defined" errors in production.
 */
export const getEnv = (name, fallback = '') => {
    // Check for window._env_ (injected at runtime)
    if (window._env_ && window._env_[name]) {
        return window._env_[name];
    }

    // Clave de API de Google Maps
    if (name === 'REACT_APP_GOOGLE_MAPS_API_KEY') {
        try {
            if (process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
                return process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
            }
        } catch (e) { }
        if (!fallback) return ''; // No fallback hardcodeado por seguridad
    }

    // Smart Fallback for production if variables are missing
    if (name === 'REACT_APP_API_URL') {
        try {
            if (process.env.REACT_APP_API_URL) {
                return process.env.REACT_APP_API_URL;
            }
        } catch (e) { }
        if (fallback === 'http://localhost:3001/api') {
            if (typeof window !== 'undefined' && window.location.hostname === 'crm2-produccion.vercel.app') {
                return 'https://crm2-backend.onrender.com/api';
            }
        }
    }
    // Generic fallback for any other variable trying to be read
    try {
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return process.env[name];
        }
    } catch (e) { }

    return fallback;
};
