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
     * Get all matches (one-time read)
     */
    getAllMatches: async function () {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized');
            return [];
        }
        try {
            const path = APP_CONSTANTS.FIREBASE_REFS.MATCHES;
            const data = await FirebaseService.read(path);
            return data ? Object.values(data) : [];
        } catch (error) {
            Logger.error(`Error reading matches: ${error.message}`);
            return [];
        }
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

            // ...and the set lineups, which would otherwise be orphaned
            const lineupsPath = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_LINEUPS}/${matchId}`;
            await FirebaseService.delete(lineupsPath);
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
            return data ? this.aggregateStats(data) : this.getDefaultStats();
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
     * Atomically adjust a single stat for a player in a match.
     * Uses a server-side increment so concurrent edits from multiple
     * devices don't overwrite each other (avoids lost updates).
     */
    incrementStat: async function (matchId, playerId, statKey, delta, setNumber) {
        if (!FirebaseService.isReady() || !playerId) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const setSeg = setNumber ? `sets/${setNumber}/` : '';
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}/${playerId}/${setSeg}${statKey}`;
            return await FirebaseService.increment(path, delta);
        } catch (error) {
            Logger.error(`Error incrementing ${statKey} for ${matchId}/${playerId}: ${error.message}`);
            return false;
        }
    },

    /**
     * Partially update stats for a player (used for serve streak bookkeeping).
     * ponytail: last-write-wins on serve_streaks; fine for a single scorekeeper,
     * move to a transaction if multiple devices ever edit the same player live.
     */
    updateStats: async function (matchId, playerId, partial, setNumber) {
        if (!FirebaseService.isReady() || !playerId) return false;
        try {
            const setSeg = setNumber ? `/sets/${setNumber}` : '';
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}/${playerId}${setSeg}`;
            return await FirebaseService.update(path, partial);
        } catch (error) {
            Logger.error(`Error updating stats for ${matchId}/${playerId}: ${error.message}`);
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

    /* ===== SET LINEUPS & SUBSTITUTIONS ===== */

    /**
     * Live subscription to every set lineup of a match.
     * Shape: { <setNumber>: { lineup: [6 playerIds], libero, subs: {...} } }
     */
    subscribeToLineups: function (matchId, callback, errorCallback = null) {
        if (!FirebaseService.isReady() || !matchId) {
            Logger.error('Firebase not initialized');
            if (errorCallback) errorCallback(new Error('Firebase non inizializzato'));
            return null;
        }
        const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_LINEUPS}/${matchId}`;
        return FirebaseService.subscribe(
            path,
            (data) => callback(data || {}),
            (error) => {
                Logger.error(`Failed to load lineups for ${matchId}: ${error.message}`);
                if (errorCallback) errorCallback(error);
            }
        );
    },

    /**
     * Write the starting six of a set. Index 0 is P1, by convention the setter.
     * Substitutions already recorded for the set are left untouched.
     */
    saveSetLineup: async function (matchId, setNumber, lineup, libero) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_LINEUPS}/${matchId}/${setNumber}`;
            return await FirebaseService.update(path, {
                lineup: lineup,
                libero: libero || null
            });
        } catch (error) {
            Logger.error(`Error saving lineup ${matchId}/set${setNumber}: ${error.message}`);
            return false;
        }
    },

    /**
     * Append a substitution. The key is the write timestamp, which is also the
     * ordering: replaying subs in key order reconstructs who is on court.
     */
    addSubstitution: async function (matchId, setNumber, sub) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const key = String(Date.now());
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_LINEUPS}/${matchId}/${setNumber}/subs/${key}`;
            return await FirebaseService.write(path, sub);
        } catch (error) {
            Logger.error(`Error adding substitution ${matchId}/set${setNumber}: ${error.message}`);
            return false;
        }
    },

    /**
     * Remove one substitution (undo). Only ever called with the last key.
     */
    removeSubstitution: async function (matchId, setNumber, subKey) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        try {
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_LINEUPS}/${matchId}/${setNumber}/subs/${subKey}`;
            return await FirebaseService.delete(path);
        } catch (error) {
            Logger.error(`Error removing substitution ${subKey}: ${error.message}`);
            return false;
        }
    },

    /**
     * Return default empty statistics object
     */
    getDefaultStats: function () {
        return {
            serve_streak: 0,
            service_out: 0,
            service_net: 0,
            foul: 0,
            error_grave: 0,
            error_block: 0,
            error_receive: 0,
            error_set: 0,
            error_defense: 0,
            point_serve: 0,
            point_spike: 0,
            point_block: 0,
            point_lob: 0,
            point_random: 0
        };
    },

    /**
     * View of a raw player stats node as { setNumber: stats }.
     * Legacy flat counters (pre per-set tracking) count as set 1.
     */
    splitBySets: function (raw) {
        const sets = {};
        Object.entries((raw && raw.sets) || {}).forEach(([n, s]) => {
            if (s) sets[n] = s;
        });
        const legacy = {};
        Object.keys(raw || {}).forEach((k) => {
            if (k !== 'sets') legacy[k] = raw[k];
        });
        if (Object.keys(legacy).length) {
            sets['1'] = sets['1'] ? this.mergeStats(sets['1'], legacy) : legacy;
        }
        return sets;
    },

    /** Sum two stats objects: numbers added, serve_streaks concatenated. */
    mergeStats: function (a, b) {
        const out = this.getDefaultStats();
        out.serve_streaks = [];
        [a, b].forEach((s) => {
            if (!s) return;
            Object.keys(s).forEach((k) => {
                if (k === 'serve_streaks') {
                    const arr = Array.isArray(s[k]) ? s[k] : Object.values(s[k] || {});
                    out.serve_streaks = out.serve_streaks.concat(arr);
                } else if (typeof s[k] === 'number') {
                    out[k] = (out[k] || 0) + s[k];
                }
            });
        });
        return out;
    },

    /** Whole-match totals for a raw player stats node, across all sets. */
    aggregateStats: function (raw) {
        const sets = this.splitBySets(raw);
        return Object.keys(sets)
            .sort((x, y) => x - y)
            .reduce((acc, n) => this.mergeStats(acc, sets[n]), this.getDefaultStats());
    },

    /**
     * One-time move of legacy flat counters under sets/1.
     * ponytail: overwrites sets/1 if legacy and per-set data ever coexist;
     * fine because legacy matches predate per-set tracking.
     */
    migrateStatsToSets: async function (matchId, allStats) {
        for (const [playerId, raw] of Object.entries(allStats || {})) {
            const legacyKeys = Object.keys(raw || {}).filter((k) => k !== 'sets');
            if (!legacyKeys.length) continue;
            const updates = {};
            legacyKeys.forEach((k) => {
                updates[`sets/1/${k}`] = raw[k];
                updates[k] = null;
            });
            const path = `${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${matchId}/${playerId}`;
            await FirebaseService.update(path, updates);
        }
    }
};
