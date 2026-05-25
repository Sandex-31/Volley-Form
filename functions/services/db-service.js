/**
 * Database Service
 * Reusable database operations for Cloud Functions
 */

const { db } = require('../config/firebase-admin.config');

const dbService = {
    /**
     * Get all responses
     */
    getAllResponses: async () => {
        try {
            const snapshot = await db().ref('formSubmissions').once('value');
            return snapshot.val();
        } catch (error) {
            throw new Error(`Failed to read responses: ${error.message}`);
        }
    },

    /**
     * Delete all responses
     */
    deleteAllResponses: async () => {
        try {
            const snapshot = await db().ref('formSubmissions').once('value');
            const count = snapshot.numChildren();
            
            await db().ref('formSubmissions').remove();
            
            return {
                success: true,
                deletedCount: count,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to delete responses: ${error.message}`);
        }
    },

    /**
     * Delete specific response
     */
    deleteResponse: async (responseId) => {
        try {
            await db().ref(`formSubmissions/${responseId}`).remove();
            return {
                success: true,
                deletedId: responseId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to delete response: ${error.message}`);
        }
    },

    /**
     * Backup responses
     */
    backupResponses: async () => {
        try {
            const data = await dbService.getAllResponses();
            return {
                data,
                timestamp: new Date().toISOString(),
                count: Object.keys(data || {}).length
            };
        } catch (error) {
            throw new Error(`Failed to backup responses: ${error.message}`);
        }
    }
};

module.exports = dbService;
