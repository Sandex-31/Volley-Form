/**
 * Exercise Upload Manager
 * Handle admin exercise uploads and management
 */

const ExerciseUploadManager = {
    isAdminLoggedIn: false,

    /**
     * Initialize upload manager
     */
    init: function() {
        this.checkAdminLogin();
        this.setupEventListeners();
        Logger.info('Exercise upload manager initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const passwordInput = document.getElementById('adminPassword');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.loginAdmin());
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logoutAdmin());
        }
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loginAdmin();
                }
            });
        }
    },

    /**
     * Login admin
     */
    loginAdmin: function() {
        const password = document.getElementById('adminPassword').value;

        if (!password) {
            UIService.showMessage('✗ Please enter admin password', 'error');
            return;
        }

        if (password === APP_CONSTANTS.ADMIN_PASSWORD) {
            this.isAdminLoggedIn = true;
            StorageService.setItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN, true);
            document.getElementById('adminPassword').value = '';
            UIService.toggleElement('loginSection', false);
            UIService.toggleElement('uploadSection', true);
            this.loadExercises();
            UIService.showMessage('✓ Login successful!', 'success');
        } else {
            UIService.showMessage('✗ Incorrect admin password', 'error');
        }
    },

    /**
     * Logout admin
     */
    logoutAdmin: function() {
        this.isAdminLoggedIn = false;
        StorageService.removeItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        UIService.toggleElement('loginSection', true);
        UIService.toggleElement('uploadSection', false);
        document.getElementById('adminPassword').value = '';
        UIService.showMessage('✓ Logged out', 'success');
    },

    /**
     * Check admin login status
     */
    checkAdminLogin: function() {
        if (StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN)) {
            this.isAdminLoggedIn = true;
            UIService.toggleElement('loginSection', false);
            UIService.toggleElement('uploadSection', true);
            this.loadExercises();
        }
    },

    /**
     * Load exercises from Firebase
     */
    loadExercises: function() {
        const ref = ExerciseService.subscribeToSelectedExercises((exercises) => {
            this.displayExercises(exercises);
        });
    },

    /**
     * Display exercises in UI
     */
    displayExercises: function(exercises) {
        const container = document.getElementById('exercisesList');
        if (!container) return;

        container.innerHTML = '';

        if (!exercises || exercises.length === 0) {
            container.innerHTML = '<p class="no-exercises">No exercises added yet</p>';
            return;
        }

        exercises.forEach((exercise, index) => {
            const exerciseEl = document.createElement('div');
            exerciseEl.className = 'exercise-card';
            const exName = typeof exercise === 'string' ? exercise : exercise.name;
            const exDescription = typeof exercise === 'string' ? '' : (exercise.description || '');

            exerciseEl.innerHTML = `
                <div class="exercise-header">
                    <h3>${exName}</h3>
                    <button class="btn-delete" onclick="ExerciseUploadManager.deleteExercise('${exName}')">Delete</button>
                </div>
                ${exDescription ? `<p class="exercise-description">${exDescription}</p>` : ''}
                <textarea class="exercise-input" placeholder="Add description..." id="desc-${index}">${exDescription}</textarea>
                <input type="url" class="exercise-input" placeholder="Video URL (optional)" id="video-${index}" value="">
                <button class="btn-save" onclick="ExerciseUploadManager.saveExerciseData('${exName}', ${index})">Save</button>
            `;
            container.appendChild(exerciseEl);
        });
    },

    /**
     * Save exercise data
     */
    saveExerciseData: async function(exerciseName, index) {
        const description = document.getElementById(`desc-${index}`).value;
        const videoUrl = document.getElementById(`video-${index}`).value;

        if (videoUrl && !FormValidator.isValidUrl(videoUrl)) {
            UIService.showMessage('Please enter a valid video URL', 'error');
            return;
        }

        const success = await ExerciseService.saveExerciseData(exerciseName, description, videoUrl);
        if (success) {
            UIService.showMessage(`✓ Exercise "${exerciseName}" saved!`, 'success');
        }
    },

    /**
     * Delete exercise
     */
    deleteExercise: async function(exerciseName) {
        if (!confirm(`Are you sure you want to delete "${exerciseName}"?`)) {
            return;
        }

        const success = await ExerciseService.deleteExercise(exerciseName);
        if (success) {
            UIService.showMessage(`✓ Exercise deleted!`, 'success');
        }
    },

    /**
     * Add new exercise
     */
    addNewExercise: async function() {
        const exerciseName = prompt('Enter exercise name:');
        if (!exerciseName) return;

        const success = await ExerciseService.saveExerciseData(exerciseName, '', '');
        if (success) {
            UIService.showMessage('✓ Exercise added!', 'success');
        }
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ExerciseUploadManager.init();
    });
} else {
    ExerciseUploadManager.init();
}
