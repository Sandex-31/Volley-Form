/**
 * Response Controller
 * Handle HTTP requests for response management
 */

const dbService = require('../services/db-service');

const responseController = {
    /**
     * Delete all responses
     */
    deleteAllResponses: async (req, res) => {
        try {
            const result = await dbService.deleteAllResponses();
            res.status(200).json({
                message: 'All responses deleted successfully',
                ...result
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    },

    /**
     * Delete specific response
     */
    deleteResponse: async (req, res) => {
        try {
            const { responseId } = req.params;
            
            if (!responseId) {
                return res.status(400).json({
                    error: 'Response ID is required'
                });
            }

            const result = await dbService.deleteResponse(responseId);
            res.status(200).json({
                message: 'Response deleted successfully',
                ...result
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    },

    /**
     * Get all responses
     */
    getAllResponses: async (req, res) => {
        try {
            const data = await dbService.getAllResponses();
            res.status(200).json({
                data,
                count: Object.keys(data || {}).length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    },

    /**
     * Backup all responses
     */
    backupResponses: async (req, res) => {
        try {
            const backup = await dbService.backupResponses();
            res.status(200).json({
                message: 'Backup created successfully',
                ...backup
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

module.exports = responseController;
