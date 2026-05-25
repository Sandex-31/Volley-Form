/**
 * Cloud Functions Configuration
 * Initialize Firebase Admin SDK
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin;
};

module.exports = {
    admin: initializeFirebaseAdmin(),
    db: () => initializeFirebaseAdmin().database()
};
