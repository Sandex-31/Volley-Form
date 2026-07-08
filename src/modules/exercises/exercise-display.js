/**
 * Exercise Display Module
 * Handle displaying exercises on public page
 */

const ExerciseDisplay = {
    /**
     * Initialize display module
     */
    init: function() {
        // Wait for Firebase to be ready before loading exercises
        if (!FirebaseService.isReady()) {
            // Retry in 100ms if Firebase isn't ready yet
            setTimeout(() => this.init(), 100);
            return;
        }
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
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-text">No exercises scheduled for today</div>
                </div>
            `;
            UIService.updateStatusIndicator('✅ Real-time sync active', 'var(--success)');
            return;
        }

        exercises.forEach((exercise, index) => {
            const exName = typeof exercise === 'string' ? exercise : exercise.name;
            const exDescription = typeof exercise === 'string' ? '' : (exercise.description || '');
            const videoUrl = typeof exercise === 'string' ? '' : (exercise.videoUrl || '');

            const exerciseItem = document.createElement('div');
            exerciseItem.className = 'exercise-item';
            exerciseItem.id = `exercise-${index}`;

            let cardContent = `
                <div class="exercise-item-header" onclick="ExerciseDisplay.toggleExercise(${index})">
                    <div class="exercise-item-name">${this.escapeHtml(exName)}</div>
                    <div class="exercise-expand-icon" id="icon-${index}">▼</div>
                </div>
                <div class="exercise-item-content" id="content-${index}">
                    <div class="exercise-item-body">
                        ${exDescription ? `<div class="exercise-description">${this.escapeHtml(exDescription)}</div>` : ''}
                        <div class="exercise-video-container">
                            ${videoUrl ? `
                                <video class="exercise-video" controls loop>
                                    <source src="${this.escapeHtml(videoUrl)}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            ` : `
                                <div class="no-video-message">🎥 No video available yet</div>
                            `}
                        </div>
                    </div>
                </div>
            `;

            exerciseItem.innerHTML = cardContent;
            container.appendChild(exerciseItem);
        });

        UIService.updateStatusIndicator('✅ Real-time sync active', 'var(--success)');
    },

    /**
     * Toggle expand/collapse exercise item
     */
    toggleExercise: function(index) {
        const content = document.getElementById(`content-${index}`);
        const icon = document.getElementById(`icon-${index}`);
        if (!content || !icon) return;

        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            icon.classList.remove('expanded');
            content.classList.remove('expanded');
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            icon.classList.add('expanded');
            content.classList.add('expanded');
        }
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
