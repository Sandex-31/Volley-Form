/**
 * Supabase Configuration
 * Initialize and manage Supabase client for file uploads and storage
 */

const SUPABASE_CONFIG = {
    URL: "https://ghugjdhjlbextgzxjgdn.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodWdqZGhqbGJleHRnenhqZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjU1MTIsImV4cCI6MjA5NTMwMTUxMn0.g9c9auwZ-PEqU3bmdyw4ztvqImwVcautnZZdZ1wS0Mg"
};

// Module namespace for Supabase operations
const SupabaseModule = {
    client: null,
    isReady: false,

    /**
     * Initialize Supabase
     */
    init: function() {
        try {
            if (!SUPABASE_CONFIG.URL.includes('supabase') || !SUPABASE_CONFIG.ANON_KEY) {
                Logger.warn('⚠️ Supabase credentials not properly configured');
                this.isReady = false;
                return false;
            }

            if (typeof window.supabase === 'undefined') {
                Logger.warn('⚠️ Supabase SDK not loaded. Check CDN availability.');
                return false;
            }

            if (!this.client) {
                this.client = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
            }

            this.isReady = true;
            Logger.log('✅ Supabase initialized successfully', 'success');
            return true;
        } catch (error) {
            Logger.log('❌ Supabase initialization failed: ' + error.message, 'error');
            this.isReady = false;
            return false;
        }
    },

    /**
     * Get Supabase client
     */
    getClient: function() {
        return this.client;
    },

    /**
     * Check if Supabase is ready
     */
    isInitialized: function() {
        return this.isReady;
    },

    /**
     * Wait for Supabase SDK to load
     */
    waitForSDK: function() {
        if (typeof window.supabase !== 'undefined') {
            this.init();
        } else {
            setTimeout(() => this.waitForSDK(), 500);
        }
    }
};

// Auto-initialize when SDK loads
setTimeout(() => {
    if (typeof window.supabase !== 'undefined') {
        SupabaseModule.init();
    } else {
        SupabaseModule.waitForSDK();
    }
}, 1000);
