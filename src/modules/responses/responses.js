/**
 * Responses Module
 * Handle display and management of form responses
 */

const ResponsesModule = {
    /**
     * Initialize responses module
     */
    init: function() {
        // Wait for Firebase to be ready before loading responses
        if (!FirebaseService.isReady()) {
            // Retry in 100ms if Firebase isn't ready yet
            setTimeout(() => this.init(), 100);
            return;
        }
        this.loadResponses();
        Logger.info('Responses module initialized');
    },

    /**
     * Load responses from Firebase
     */
    loadResponses: function() {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return;
        }

        FirebaseService.subscribe(
            APP_CONSTANTS.FIREBASE_REFS.FORM_SUBMISSIONS,
            (data) => {
                this.displayResponses(data);
            },
            (error) => {
                Logger.error(`Failed to load responses: ${error.message}`);
                UIService.showMessage('⚠️ Failed to load responses', 'error');
            }
        );
    },

    /**
     * Display responses
     */
    displayResponses: function(data) {
        const container = document.getElementById('responsesContainer');
        if (!container) return;

        container.innerHTML = '';

        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<p class="no-responses">No responses yet</p>';
            return;
        }

        const responses = Object.entries(data).map(([id, response]) => ({
            id,
            ...response
        }));

        responses.reverse(); // Most recent first

        responses.forEach((response) => {
            const responseEl = document.createElement('div');
            responseEl.className = 'response-card';

            const timestamp = new Date(response.timestamp).toLocaleString();
            let content = `
                <div class="response-header">
                    <p class="response-timestamp">${timestamp}</p>
                </div>
                <div class="response-content">
            `;

            // Add all form data
            Object.entries(response).forEach(([key, value]) => {
                if (key !== 'timestamp' && key !== 'id') {
                    content += `<p><strong>${key}:</strong> ${value}</p>`;
                }
            });

            content += '</div>';
            responseEl.innerHTML = content;
            container.appendChild(responseEl);
        });

        Logger.info(`Loaded ${responses.length} responses`);
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ResponsesModule.init();
    });
} else {
    ResponsesModule.init();
}
