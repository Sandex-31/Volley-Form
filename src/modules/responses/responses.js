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
        const container = document.getElementById('responsesList');
        const countEl = document.getElementById('responseCount');
        if (!container) return;

        container.innerHTML = '';

        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-text">No responses yet</div>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }

        const responses = Object.entries(data).map(([id, response]) => ({
            id,
            ...response
        }));

        responses.reverse(); // Most recent first
        if (countEl) countEl.textContent = responses.length;

        const ratingEmojis = ['😞', '😐', '🙂', '😊', '🤩'];
        const ratingLabels = ['Terrible', 'Bad', 'Okay', 'Good', 'Amazing'];

        responses.forEach((response, index) => {
            const responseEl = document.createElement('div');
            responseEl.className = 'response-card';

            const exerciseFields = {};
            
            // Extract all exercise data
            Object.keys(response).forEach(key => {
                if (key.startsWith('exercise_')) {
                    const match = key.match(/exercise_(\d+)_(.+)/);
                    if (match) {
                        const exerciseNum = match[1];
                        const field = match[2];
                        if (!exerciseFields[exerciseNum]) {
                            exerciseFields[exerciseNum] = {};
                        }
                        exerciseFields[exerciseNum][field] = response[key];
                    }
                }
            });

            const submittedAt = response.submittedAt || (response.timestamp ? new Date(response.timestamp).toLocaleString() : 'Unknown time');
            const exerciseDate = response.exerciseDate || 'No date specified';
            const notes = response.notes || '';
            const firstName = response.firstName || 'Anonymous';
            const lastName = response.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();

            let exercisesHtml = '';
            Object.keys(exerciseFields).sort((a, b) => parseInt(a) - parseInt(b)).forEach(exerciseNum => {
                const exercise = exerciseFields[exerciseNum];
                const exerciseName = exercise.name || 'Unknown exercise';
                const exerciseNote = exercise.notes || '';
                const rating = parseInt(exercise.rating);
                const ratingEmoji = !isNaN(rating) && ratingEmojis[rating] ? ratingEmojis[rating] : '❓';
                const ratingLabel = !isNaN(rating) && ratingLabels[rating] ? ratingLabels[rating] : 'Not Rated';

                exercisesHtml += `
                    <div class="exercise-card">
                        <div class="exercise-name">💪 ${this.escapeHtml(exerciseName)}</div>
                        <div class="exercise-rating">
                            <span class="rating-stars">${ratingEmoji}</span>
                            <span class="rating-text">${ratingLabel}</span>
                        </div>
                        ${exerciseNote ? `
                        <div class="exercise-rating" style="margin-top: 8px;">
                            <span class="rating-stars" style="font-size: 14px; min-width: 20px;">📝</span>
                            <span class="exercise-note">${this.escapeHtml(exerciseNote)}</span>
                        </div>` : ''}
                    </div>
                `;
            });

            const notesHtml = notes.trim() 
                ? `<div class="notes-section">"${this.escapeHtml(notes)}"</div>`
                : '<div class="notes-section empty">No additional notes</div>';

            const cardContent = `
                <div class="response-header">
                    <div>
                        <div class="response-date">📅 ${this.escapeHtml(exerciseDate)}</div>
                        <div class="response-time">Submitted by <strong>${this.escapeHtml(fullName)}</strong> on ${submittedAt}</div>
                    </div>
                    <div class="response-index">Response #${responses.length - index}</div>
                </div>

                <div class="response-section">
                    <h3>💪 Exercises & Ratings</h3>
                    <div class="exercises-grid">
                        ${exercisesHtml || '<p style="color: var(--text-muted); font-style: italic;">No exercises recorded</p>'}
                    </div>
                </div>

                <div class="response-section">
                    <h3>📝 Notes</h3>
                    ${notesHtml}
                </div>
            `;

            responseEl.innerHTML = cardContent;
            container.appendChild(responseEl);
        });

        Logger.info(`Loaded ${responses.length} responses`);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml: function(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
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
