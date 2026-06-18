/**
 * Player Service
 * Manage player roster data and operations in Firebase
 */

const PlayerService = {
    players: [],

    /**
     * Subscribe to player updates
     */
    subscribeToPlayers: function(callback) {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized');
            return null;
        }
        const path = APP_CONSTANTS.FIREBASE_REFS.PLAYERS;
        return FirebaseService.subscribe(
            path,
            (data) => {
                // Parse object of objects to array
                this.players = data ? Object.values(data) : [];
                // Sort by name or jersey number
                this.players.sort((a, b) => {
                    const numA = parseInt(a.number) || 0;
                    const numB = parseInt(b.number) || 0;
                    return numA - numB;
                });
                callback(this.players);
            },
            (error) => {
                Logger.error(`Failed to load players: ${error.message}`);
            }
        );
    },

    /**
     * Get all players loaded
     */
    getPlayersList: function() {
        return this.players;
    },

    /**
     * Add or update player
     */
    savePlayer: async function(player) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }

        const playerId = player.id || 'player_' + Date.now();
        const playerData = {
            ...player,
            id: playerId
        };

        const path = `${APP_CONSTANTS.FIREBASE_REFS.PLAYERS}/${playerId}`;
        return await FirebaseService.write(path, playerData);
    },

    /**
     * Delete player
     */
    deletePlayer: async function(playerId) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }

        const path = `${APP_CONSTANTS.FIREBASE_REFS.PLAYERS}/${playerId}`;
        return await FirebaseService.delete(path);
    }
};
