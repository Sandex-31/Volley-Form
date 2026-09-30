/**
 * Form Module
 * Handle multi-step form logic and navigation
 */

const FormModule = {
    currentStep: 1,
    totalSteps: APP_CONSTANTS.FORM_STEPS,
    exerciseCount: 0,

    /**
     * Initialize form
     */
    init: function() {
        this.setupEventListeners();
        this.updateProgress();
        Logger.info('Form module initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.handleNextStep());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.handlePrevStep());
        }
    },

    /**
     * Handle next step
     */
    handleNextStep: function() {
        if (!FormValidator.validateFormStep(this.currentStep)) {
            return;
        }

        if (this.currentStep === this.totalSteps) {
            this.submitForm();
        } else {
            this.currentStep++;
            this.updateProgress();
        }
    },

    /**
     * Handle previous step
     */
    handlePrevStep: function() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateProgress();
        }
    },

    /**
     * Update progress bar and indicators
     */
    updateProgress: function() {
        const progressPercent = (this.currentStep / this.totalSteps) * 100;
        const progressFill = document.querySelector('.progress-fill');
        
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }

        const currentStepEl = document.getElementById('currentStep');
        if (currentStepEl) {
            currentStepEl.textContent = this.currentStep;
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            if (stepNum === this.currentStep) {
                step.classList.add('active');
            } else if (stepNum < this.currentStep) {
                step.classList.add('completed');
            }
        });

        // Update button states
        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            if (this.currentStep === this.totalSteps) {
                nextBtn.textContent = 'Invia';
                nextBtn.style.background = 'var(--success)';
            } else {
                nextBtn.textContent = 'Avanti →';
                nextBtn.style.background = '';
            }
        }

        this.showStep(this.currentStep);
    },

    /**
     * Show specific step content
     */
    showStep: function(step) {
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeStep = document.querySelector(`.step-content[data-step="${step}"]`);
        if (activeStep) {
            activeStep.classList.add('active');
        }
    },

    /**
     * Submit form
     */
    submitForm: async function() {
        const form = document.getElementById('dataForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = {
            timestamp: new Date().toISOString(),
            ...Object.fromEntries(formData)
        };

        if (!FirebaseService.isReady()) {
            UIService.showMessage('Connessione al database assente: la valutazione potrebbe non essere salvata', 'error');
            return;
        }

        const success = await FirebaseService.write(
            APP_CONSTANTS.FIREBASE_REFS.FORM_SUBMISSIONS + '/' + Date.now(),
            data
        );

        if (success) {
            UIService.showMessage('Valutazione inviata, grazie!', 'success');
            form.reset();
            this.currentStep = 1;
            this.updateProgress();
        } else {
            UIService.showMessage('Valutazione non inviata, riprova', 'error');
        }
    },

    /**
     * Add exercise item
     */
    addExercise: function() {
        if (this.exerciseCount >= APP_CONSTANTS.MAX_EXERCISES_PER_FORM) {
            UIService.showMessage(`Puoi valutare al massimo ${APP_CONSTANTS.MAX_EXERCISES_PER_FORM} esercizi`, 'error');
            return;
        }

        this.exerciseCount++;
        const exercisesList = document.getElementById('exercisesList');
        const presetExercises = ExerciseService.getPresetExercises();

        const exerciseOptions = presetExercises
            .map(exercise => `<option value="${exercise}">${exercise}</option>`)
            .join('');

        const exerciseItem = document.createElement('div');
        exerciseItem.className = 'exercise-item';
        exerciseItem.id = `exercise-${this.exerciseCount}`;
        exerciseItem.innerHTML = `
            <select name="exercise_${this.exerciseCount}_name" class="exercise-name-select exercise-name-dropdown">
                <option value="">Scegli un esercizio…</option>
                ${exerciseOptions}
            </select>
            <div class="exercise-top-row">
                <div class="exercise-rating">
                    <input type="range" class="rating-slider" name="exercise_${this.exerciseCount}_rating" min="0" max="4" value="0">
                    <div class="rating-value" id="rating-value-${this.exerciseCount}">😞</div>
                </div>
                <button type="button" class="exercise-remove" onclick="FormModule.removeExercise(${this.exerciseCount})">✕</button>
            </div>
            <div class="exercise-notes">
                <textarea name="exercise_${this.exerciseCount}_notes" placeholder="Note su questo esercizio (facoltative)…"></textarea>
            </div>
        `;

        exercisesList.appendChild(exerciseItem);

        // Add event listener for rating slider
        const slider = exerciseItem.querySelector('.rating-slider');
        slider.addEventListener('change', () => this.updateRatingValue(this.exerciseCount));
        slider.addEventListener('input', () => this.updateRatingValue(this.exerciseCount));

        this.updateRatingValue(this.exerciseCount);

        // Disable add button if max reached
        const addBtn = document.getElementById('addExerciseBtn');
        if (addBtn) {
            addBtn.disabled = this.exerciseCount >= APP_CONSTANTS.MAX_EXERCISES_PER_FORM;
        }
    },

    /**
     * Update rating display
     */
    updateRatingValue: function(exerciseNum) {
        const slider = document.querySelector(`input[name="exercise_${exerciseNum}_rating"]`);
        const valueDisplay = document.getElementById(`rating-value-${exerciseNum}`);

        if (slider && valueDisplay) {
            valueDisplay.textContent = APP_CONSTANTS.RATING_LABELS[slider.value];
        }
    },

    /**
     * Remove exercise
     */
    removeExercise: function(exerciseNum) {
        const item = document.getElementById(`exercise-${exerciseNum}`);
        if (item) {
            item.remove();
        }

        // Enable add button if below max
        const addBtn = document.getElementById('addExerciseBtn');
        if (addBtn) {
            addBtn.disabled = this.exerciseCount >= APP_CONSTANTS.MAX_EXERCISES_PER_FORM;
        }
    }
};

// Initialize form when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        FormModule.init();
    });
} else {
    FormModule.init();
}
