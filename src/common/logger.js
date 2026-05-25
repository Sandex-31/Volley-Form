/**
 * Logger Service
 * Centralized logging for debug messages and notifications
 */

const Logger = {
    /**
     * Log a message with type (success, error, warning, info)
     */
    log: function(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}]`;

        switch(type) {
            case 'success':
                console.log(`%c${prefix} ${message}`, 'color: #51a376; font-weight: bold;');
                break;
            case 'error':
                console.error(`%c${prefix} ${message}`, 'color: #e74c3c; font-weight: bold;');
                break;
            case 'warning':
                console.warn(`%c${prefix} ${message}`, 'color: #e67e22; font-weight: bold;');
                break;
            default:
                console.log(`%c${prefix} ${message}`, 'color: #3498db; font-weight: bold;');
        }
    },

    warn: function(message) {
        this.log(message, 'warning');
    },

    error: function(message) {
        this.log(message, 'error');
    },

    success: function(message) {
        this.log(message, 'success');
    },

    info: function(message) {
        this.log(message, 'info');
    }
};
