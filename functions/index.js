/**
 * Cloud Functions for Volleyball Form
 * Handles scheduled deletions, manual deletions, and response management
 */

const functions = require('firebase-functions');

// ===== SCHEDULED FUNCTIONS =====

/**
 * Scheduled Cloud Function to delete all responses every Tuesday and Friday at 00:00 UTC
 * Triggers: Every Tuesday and Friday at midnight UTC (0 0 * * 2,5)
 */
exports.deleteResponsesScheduled = functions.pubsub
  .schedule('0 0 * * 2,5')  // Tuesday (2) and Friday (5) at 00:00 UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('🗑️ Starting scheduled deletion of responses...');
      
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      
      const db = admin.database();
      const submissionsRef = db.ref('formSubmissions');
      
      // Get a snapshot of all responses
      const snapshot = await submissionsRef.once('value');
      const responseCount = snapshot.numChildren();
      
      console.log(`Found ${responseCount} responses to delete`);
      
      // Delete all responses
      await submissionsRef.remove();
      
      const result = {
        success: true,
        deletedCount: responseCount,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Successfully deleted ${responseCount} responses`);
      return result;
      
    } catch (error) {
      console.error('❌ Error deleting responses:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });


// ===== HTTP FUNCTIONS =====

/**
 * HTTP triggered function to manually delete all responses
 * Call with: curl -X POST https://region-project.cloudfunctions.net/deleteResponsesManual
 * With authentication required
 */
exports.deleteResponsesManual = functions.https.onCall(async (data, context) => {
  try {
    // Optional: Check authentication
    if (!context.auth && !data.adminSecret) {
      throw new functions.https.HttpsError('permission-denied', 'Authentication required');
    }

    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.database();
    const submissionsRef = db.ref('formSubmissions');
    const snapshot = await submissionsRef.once('value');
    const responseCount = snapshot.numChildren();

    console.log(`🗑️ Manual deletion triggered: ${responseCount} responses`);
    
    await submissionsRef.remove();
    
    return {
      success: true,
      message: 'All responses deleted successfully',
      deletedCount: responseCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in deleteResponsesManual:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * HTTP triggered function to get all responses
 */
exports.getAllResponses = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).send('');
    return;
  }

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.database();
    const snapshot = await db.ref('formSubmissions').once('value');
    const data = snapshot.val();

    res.json({
      success: true,
      data,
      count: Object.keys(data || {}).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * HTTP triggered function to backup responses
 */
exports.backupResponses = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.database();
    const snapshot = await db.ref('formSubmissions').once('value');
    const data = snapshot.val();

    res.json({
      success: true,
      message: 'Backup created',
      data,
      count: Object.keys(data || {}).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * HTTP function to get next scheduled deletion time
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
