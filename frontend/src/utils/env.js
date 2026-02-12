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

    return fallback;
};
