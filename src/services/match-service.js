/**
 * Match Service
 * Manage match data and statistics in Firebase (dynamicized matches list & stats by player)
 */

const MatchService = {
    matches: [],

    /**
     * Subscribe to matches updates
     */
    subscribeToMatches: function (callback) {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized');
            return null;
        }
        const path = APP_CONSTANTS.FIREBASE_REFS.MATCHES;
        return FirebaseService.subscribe(
            path,
            (data) => {
                this.matches = data ? Object.values(data) : [];
                // Sort matches by date descending
                this.matches.sort((a, b) => new Date(b.date) - new Date(a.date));
                callback(this.matches);
            },
            (error) => {
                Logger.error(`Failed to load matches: ${error.message}`);
            }
        );
    },

    /**
     * Add or update a match
     */
    saveMatch: async function (match) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const matchId = match.id || 'match_' + Date.now();
            const matchData = {
                ...match,
                id: matchId
            };
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCHES}/${matchId}`;
            return await FirebaseService.write(path, matchData);
        } catch (error) {
            Logger.error(`Error saving match: ${error.message}`);
            return false;
        }
    },

    /**
     * Delete a match
     */
    deleteMatch: async function (matchId) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            // Delete match details
            const matchPath = `${APP_CONSTANTS.FIREBASE_REFS.MATCHES}/${matchId}`;
            await FirebaseService.delete(matchPath);

            // Clean up related match statistics as well
            const statsPath = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}`;
            await FirebaseService.delete(statsPath);
            return true;
        } catch (error) {
            Logger.error(`Error deleting match ${matchId}: ${error.message}`);
            return false;
        }
    },

    /**
     * Get statistics for a specific player in a match (one-time read)
     */
    getMatchStats: async function (matchId, playerId) {
        if (!FirebaseService.isReady() || !playerId) {
            return this.getDefaultStats();
        }
        try {
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}/${playerId}`;
            const data = await FirebaseService.read(path);
            return data || this.getDefaultStats();
        } catch (error) {
            Logger.error(`Error reading match stats for ${matchId}/${playerId}: ${error.message}`);
            return this.getDefaultStats();
        }
    },

    /**
     * Save statistics for a specific player in a match
     */
    saveMatchStats: async function (matchId, playerId, stats) {
        if (!FirebaseService.isReady() || !playerId) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}/${playerId}`;
            return await FirebaseService.write(path, stats);
        } catch (error) {
            Logger.error(`Error saving match stats for ${matchId}/${playerId}: ${error.message}`);
            return false;
        }
    },

    /**
     * Subscribe to real-time statistics changes for a specific player in a match
     */
    subscribeToMatchStats: function (matchId, playerId, callback) {
        if (!FirebaseService.isReady() || !playerId) {
            Logger.error('Firebase or Player ID not initialized for stats');
            return null;
        }
        const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}/${playerId}`;
        return FirebaseService.subscribe(
            path,
            (data) => {
                callback(data || this.getDefaultStats());
            },
            (error) => {
                Logger.error(`Failed to load stats for match ${matchId}, player ${playerId}: ${error.message}`);
            }
        );
    },

    /**
     * Subscribe to real-time statistics changes for all players in a match
     */
    subscribeToAllMatchStats: function (matchId, callback) {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized for stats');
            return null;
        }
        const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}`;
        return FirebaseService.subscribe(
            path,
            (data) => {
                callback(data || {});
            },
            (error) => {
                Logger.error(`Failed to load all stats for match ${matchId}: ${error.message}`);
            }
        );
    },

    /**
     * Return default empty statistics object
     */
    getDefaultStats: function () {
        return {
            service_out: 0,
            service_net: 0,
            foul: 0,
            error_grave: 0,
            error_block: 0,
            error_receive: 0,
            error_defense: 0,
            point_serve: 0,
            point_spike: 0,
            point_block: 0,
            point_lob: 0,
            point_random: 0
        };
    }
};
