/**
 * Script to delete all responses from Firebase Realtime Database
 * Used by GitHub Actions workflow for scheduled deletion
 * 
 * Usage: node deleteResponses.js [delete|backup]
 * 
 * Environment Variables:
 *   FIREBASE_SERVICE_ACCOUNT - JSON string with service account credentials
 *   DATABASE_URL - Firebase database URL (optional, will use default from config)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using service account
const initializeApp = () => {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    const databaseUrl = process.env.DATABASE_URL || "https://volleyball-exercises-9fd18-default-rtdb.europe-west1.firebasedatabase.app/";

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseUrl
    });

    return admin.database();
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    throw error;
  }
};

/**
 * Delete all responses from Firebase
 */
const deleteAllResponses = async () => {
  try {
    const db = initializeApp();
    const submissionsRef = db.ref('formSubmissions');
    
    // Get snapshot to count responses
    const snapshot = await submissionsRef.once('value');
    const responseCount = snapshot.numChildren();
    
    console.log(`🗑️ Starting deletion of ${responseCount} responses...`);
    
    // Delete all responses
    await submissionsRef.remove();
    
    const timestamp = new Date().toISOString();
    console.log(`✅ Successfully deleted ${responseCount} responses at ${timestamp}`);
    
    return {
      success: true,
      deletedCount: responseCount,
      timestamp
    };
    
  } catch (error) {
    console.error('❌ Error deleting responses:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Backup responses to console/file
 */
const backupResponses = async () => {
  try {
    const db = initializeApp();
    const submissionsRef = db.ref('formSubmissions');
    
    const snapshot = await submissionsRef.once('value');
    const data = snapshot.val();
    const count = Object.keys(data || {}).length;
    
    console.log(`✅ Backup of ${count} responses created`);
    console.log(JSON.stringify(data, null, 2));
    
    return {
      success: true,
      count,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error backing up responses:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run based on command line argument
const command = process.argv[2] || 'delete';

const run = async () => {
  let result;
  
  switch(command) {
    case 'delete':
      result = await deleteAllResponses();
      process.exit(result.success ? 0 : 1);
      break;
    case 'backup':
      result = await backupResponses();
      process.exit(result.success ? 0 : 1);
      break;
    default:
      console.log('Usage: node deleteResponses.js [delete|backup]');
      process.exit(0);
  }
};

run();

module.exports = { deleteAllResponses, backupResponses };
