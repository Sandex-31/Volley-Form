const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Scheduled Cloud Function to delete all responses every Tuesday and Friday at 00:00 UTC
 * Triggers: Every Tuesday and Friday at midnight UTC (0 0 * * 2,5)
 */
exports.deleteResponsesScheduled = functions.pubsub
  .schedule('0 0 * * 2,5')  // Tuesday (2) and Friday (5) at 00:00 UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const db = admin.database();
      const submissionsRef = db.ref('formSubmissions');
      
      // Get a snapshot of all responses
      const snapshot = await submissionsRef.once('value');
      const responseCount = snapshot.numChildren();
      
      console.log(`🗑️ Starting deletion of ${responseCount} responses...`);
      
      // Delete all responses
      await submissionsRef.remove();
      
      console.log(`✅ Successfully deleted ${responseCount} responses at ${new Date().toISOString()}`);
      
      return {
        success: true,
        deletedCount: responseCount,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error deleting responses:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });

/**
 * Optional: HTTP triggered function to manually delete responses
 * Call with: curl -X POST https://us-central1-PROJECT_ID.cloudfunctions.net/deleteResponsesManual
 */
exports.deleteResponsesManual = functions.https.onCall(async (data, context) => {
  // Optional: Add authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete responses'
    );
  }
  
  try {
    const db = admin.database();
    const submissionsRef = db.ref('formSubmissions');
    
    const snapshot = await submissionsRef.once('value');
    const responseCount = snapshot.numChildren();
    
    console.log(`🗑️ Manual deletion triggered: ${responseCount} responses`);
    
    await submissionsRef.remove();
    
    console.log(`✅ Successfully deleted ${responseCount} responses`);
    
    return {
      success: true,
      deletedCount: responseCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error in manual deletion:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Optional: HTTP function to get next scheduled deletion time
 */
exports.getNextDeletionTime = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  const now = new Date();
  const nextDeletion = getNextScheduledDeletion(now);
  
  res.status(200).json({
    currentTime: now.toISOString(),
    nextDeletion: nextDeletion.toISOString(),
    schedule: 'Every Tuesday and Friday at 00:00 UTC',
    timezone: 'UTC'
  });
});

/**
 * Helper function to calculate next scheduled deletion
 */
function getNextScheduledDeletion(date) {
  const nextDate = new Date(date);
  const dayOfWeek = nextDate.getUTCDay();
  
  let daysToAdd = 0;
  
  if (dayOfWeek < 2) {
    // Before Tuesday: add days to reach Tuesday
    daysToAdd = 2 - dayOfWeek;
  } else if (dayOfWeek === 2) {
    // On Tuesday: if before midnight UTC, schedule for today; else for Friday
    nextDate.setUTCHours(0, 0, 0, 0);
    if (nextDate <= date) {
      daysToAdd = 3; // Next Friday
    } else {
      return nextDate;
    }
  } else if (dayOfWeek < 5) {
    // Wednesday/Thursday: add days to reach Friday
    daysToAdd = 5 - dayOfWeek;
  } else if (dayOfWeek === 5) {
    // On Friday: if before midnight UTC, schedule for today; else for Tuesday
    nextDate.setUTCHours(0, 0, 0, 0);
    if (nextDate <= date) {
      daysToAdd = 4; // Next Tuesday
    } else {
      return nextDate;
    }
  } else {
    // Saturday/Sunday: add days to reach Tuesday
    daysToAdd = (9 - dayOfWeek);
  }
  
  nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd);
  nextDate.setUTCHours(0, 0, 0, 0);
  
  return nextDate;
}
