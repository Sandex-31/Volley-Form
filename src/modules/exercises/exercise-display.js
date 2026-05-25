/**
 * Exercise Display Module
 * Handle displaying exercises on public page
 */

const ExerciseDisplay = {
    /**
     * Initialize display module
     */
    init: function() {
        this.loadAndDisplayExercises();
        Logger.info('Exercise display module initialized');
    },

    /**
     * Load and display exercises
     */
    loadAndDisplayExercises: function() {
        const ref = ExerciseService.subscribeToSelectedExercises((exercises) => {
            this.displayExercisesPublic(exercises);
        });
    },

    /**
     * Display exercises in public view
     */
    displayExercisesPublic: function(exercises) {
        const container = document.getElementById('exercisesContainer');
        if (!container) return;

        container.innerHTML = '';

        if (!exercises || exercises.length === 0) {
            container.innerHTML = '<p class="no-exercises-message">No exercises available at the moment.</p>';
            UIService.updateStatusIndicator('✅ Real-time sync active', '#51a376');
            return;
        }

        exercises.forEach((exercise) => {
            const exName = typeof exercise === 'string' ? exercise : exercise.name;
            const exDescription = typeof exercise === 'string' ? '' : (exercise.description || '');
            const videoUrl = typeof exercise === 'string' ? '' : (exercise.videoUrl || '');

            const exerciseCard = document.createElement('div');
            exerciseCard.className = 'exercise-card';

            let cardContent = `
                <h3>${this.escapeHtml(exName)}</h3>
            `;

            if (exDescription) {
                cardContent += `<p class="exercise-description">${this.escapeHtml(exDescription)}</p>`;
            }

            if (videoUrl) {
                cardContent += `
                    <div class="video-container">
                        <a href="${exUrl}" target="_blank" class="video-link">📹 Watch Video</a>
                    </div>
                `;
            }

            exerciseCard.innerHTML = cardContent;
            container.appendChild(exerciseCard);
        });

        UIService.updateStatusIndicator('✅ Real-time sync active', '#51a376');
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml: function(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ExerciseDisplay.init();
    });
} else {
    ExerciseDisplay.init();
}
