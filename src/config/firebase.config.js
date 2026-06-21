/**
 * Firebase Configuration
 * Initialize and manage Firebase database connections
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB7ZT4RmUgTn73PV8Azo7Jxj2fXMUBjf5c",
    authDomain: "volleyball-exercises-9fd18.firebaseapp.com",
    databaseURL: "https://volleyball-exercises-9fd18-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "volleyball-exercises-9fd18",
    storageBucket: "volleyball-exercises-9fd18.appspot.com",
    messagingSenderId: "155905070449",
    appId: "1:155905070449:web:fd23b00f8e45fca439d2d0"
};

// Module namespace for Firebase operations
const FirebaseModule = {
    db: null,
    isReady: false,

    /**
     * Initialize Firebase
     */
    init: function() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            this.db = firebase.database();
            this.isReady = true;
            if (typeof Logger !== 'undefined') {
                Logger.log('✅ Firebase initialized successfully', 'success');
            } else {
                console.log('✅ Firebase initialized successfully');
            }
            return true;
        } catch (error) {
            if (typeof Logger !== 'undefined') {
                Logger.log('❌ Firebase initialization failed: ' + error.message, 'error');
            } else {
                console.error('❌ Firebase initialization failed: ' + error.message);
            }
            this.isReady = false;
            return false;
        }
    },

    /**
     * Get database reference
     */
    getDb: function() {
        return this.db;
    },

    /**
     * Check if Firebase is ready
     */
    isInitialized: function() {
        return this.isReady;
    }
};

// Auto-initialize when script loads (immediately, no delay)
if (typeof firebase !== 'undefined') {
    if (!FirebaseModule.isReady) {
        FirebaseModule.init();
    }
}
