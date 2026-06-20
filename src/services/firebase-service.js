/**
 * Firebase Service
 * Handle all Firebase database operations
 */

const FirebaseService = {
    /**
     * Initialize Firebase
     */
    init: function() {
        return FirebaseModule.init();
    },

    /**
     * Check if Firebase is ready
     */
    isReady: function() {
        return FirebaseModule.isInitialized();
    },

    /**
     * Write data to database
     */
    write: async function(path, data) {
        if (!this.isReady()) {
            Logger.error('Firebase not initialized');
            return false;
        }

        try {
            const db = FirebaseModule.getDb();
            await db.ref(path).set(data);
            Logger.success(`Data written to ${path}`);
            return true;
        } catch (error) {
            Logger.error(`Failed to write to ${path}: ${error.message}`);
            return false;
        }
    },

    /**
     * Update data in database
     */
    update: async function(path, data) {
        if (!this.isReady()) {
            Logger.error('Firebase not initialized');
            return false;
        }

        try {
            const db = FirebaseModule.getDb();
            await db.ref(path).update(data);
            Logger.success(`Data updated at ${path}`);
            return true;
        } catch (error) {
            Logger.error(`Failed to update ${path}: ${error.message}`);
            return false;
        }
    },

    /**
     * Atomically increment a numeric value at a path (server-side).
     * Avoids the read-modify-write race of writing a whole object back.
     */
    increment: async function(path, delta) {
        if (!this.isReady()) {
            Logger.error('Firebase not initialized');
            return false;
        }

        try {
            const db = FirebaseModule.getDb();
            await db.ref(path).set(firebase.database.ServerValue.increment(delta));
            Logger.success(`Incremented ${path} by ${delta}`);
            return true;
        } catch (error) {
            Logger.error(`Failed to increment ${path}: ${error.message}`);
            return false;
        }
    },

    /**
     * Read data from database (one-time)
     */
    read: async function(path) {
        if (!this.isReady()) {
            Logger.error('Firebase not initialized');
            return null;
        }

        try {
            const db = FirebaseModule.getDb();
            const snapshot = await db.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            Logger.error(`Failed to read from ${path}: ${error.message}`);
            return null;
        }
    },

    /**
     * Listen to real-time updates
     */
    subscribe: function(path, callback, errorCallback = null) {
        if (!this.isReady()) {
            Logger.error('Firebase not initialized');
            return null;
        }

        const db = FirebaseModule.getDb();
        const ref = db.ref(path);

        ref.on('value',
            (snapshot) => {
                callback(snapshot.val());
            },
            (error) => {
                Logger.error(`Firebase subscribe error: ${error.message}`);
                if (errorCallback) errorCallback(error);
            }
        );

        return ref;
    },

    /**
     * Remove listener
     */
    unsubscribe: function(ref) {
        if (ref) {
            ref.off();
        }
    },

    /**
     * Delete data from database
     */
    delete: async function(path) {
        if (!this.isReady()) {
            Logger.error('Firebase not initialized');
            return false;
        }

        try {
            const db = FirebaseModule.getDb();
            await db.ref(path).remove();
            Logger.success(`Data deleted from ${path}`);
            return true;
        } catch (error) {
            Logger.error(`Failed to delete from ${path}: ${error.message}`);
            return false;
        }
    }
};
