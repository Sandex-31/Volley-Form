/**
 * Script to delete all responses from Firebase Realtime Database
 * Used by GitHub Actions workflow for scheduled deletion
 * 
 * Usage: node deleteResponses.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://volleyball-exercises-9fd18-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = admin.database();

async function deleteAllResponses() {
  try {
    const submissionsRef = db.ref('formSubmissions');
    
    // Get snapshot to count responses
    const snapshot = await submissionsRef.once('value');
    const responseCount = snapshot.numChildren();
    
    console.log(`🗑️ Starting deletion of ${responseCount} responses...`);
    
    // Delete all responses
    await submissionsRef.remove();
    
    console.log(`✅ Successfully deleted ${responseCount} responses at ${new Date().toISOString()}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error deleting responses:', error.message);
    process.exit(1);
  }
}

deleteAllResponses();
