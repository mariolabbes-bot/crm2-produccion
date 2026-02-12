/**
 * Safely get environment variables in the frontend.
 * This prevents "process is not defined" errors in production.
 */
export const getEnv = (name, fallback = '') => {
    // Check for window._env_ (injected at runtime)
    if (window._env_ && window._env_[name]) {
        return window._env_[name];
    }

    // Check for process.env (available during build/dev)
    try {
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return process.env[name];
        }
    } catch (e) {
        // process might be a restricted object in some environments
    }

    // Clave de API de Google Maps real (Fallback para PoC)
    if (name === 'REACT_APP_GOOGLE_MAPS_API_KEY' && !fallback) {
        return 'AIzaSyCwYFrggx0KRvpVpA2mJHjXnqtrX5o3Zj8';
    }

    // Smart Fallback for production if variables are missing
    if (name === 'REACT_APP_API_URL' && fallback === 'http://localhost:3001/api') {
        if (typeof window !== 'undefined' && window.location.hostname === 'crm2-produccion.vercel.app') {
            return 'https://crm2-backend.onrender.com/api';
        }
    }

    return fallback;
};
