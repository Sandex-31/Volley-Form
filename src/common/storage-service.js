/**
 * Storage Service
 * Manage local storage operations
 */

const StorageService = {
    /**
     * Get item from localStorage
     */
    getItem: function(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            Logger.error(`Failed to get item ${key}: ${error.message}`);
            return null;
        }
    },

    /**
     * Set item in localStorage
     */
    setItem: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            Logger.error(`Failed to set item ${key}: ${error.message}`);
            return false;
        }
    },

    /**
     * Remove item from localStorage
     */
    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            Logger.error(`Failed to remove item ${key}: ${error.message}`);
            return false;
        }
    },

    /**
     * Clear all localStorage
     */
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            Logger.error(`Failed to clear localStorage: ${error.message}`);
            return false;
        }
    },

    /**
     * Check if key exists
     */
    hasItem: function(key) {
        return localStorage.getItem(key) !== null;
    }
};
