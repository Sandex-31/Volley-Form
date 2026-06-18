/**
 * Match Service
 * Manage match data and statistics in Firebase
 */

const MatchService = {
    /**
     * Get statistics for a specific match (one-time read)
     */
    getMatchStats: async function(matchId) {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized');
            return this.getDefaultStats();
        }
        try {
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}`;
            const data = await FirebaseService.read(path);
            return data || this.getDefaultStats();
        } catch (error) {
            Logger.error(`Error reading match stats for ${matchId}: ${error.message}`);
            return this.getDefaultStats();
        }
    },

    /**
     * Save statistics for a specific match
     */
    saveMatchStats: async function(matchId, stats) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}`;
            return await FirebaseService.write(path, stats);
        } catch (error) {
            Logger.error(`Error saving match stats for ${matchId}: ${error.message}`);
            return false;
        }
    },

    /**
     * Subscribe to real-time statistics changes for a match
     */
    subscribeToMatchStats: function(matchId, callback) {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized');
            return null;
        }
        const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}`;
        return FirebaseService.subscribe(
            path,
            (data) => {
                callback(data || this.getDefaultStats());
            },
            (error) => {
                Logger.error(`Failed to load stats for match ${matchId}: ${error.message}`);
            }
        );
    },

    /**
     * Return default empty statistics object
     */
    getDefaultStats: function() {
        return {
            service_under_net: 0,
            service_out: 0,
            service_net: 0,
            foul: 0,
            point_spike: 0,
            point_random: 0,
            point_block: 0,
            point_lob: 0
        };
    }
};
