/**
 * Exercise Service
 * Manage exercise data and operations
 */

const ExerciseService = {
    selectedExercises: [],
    allExercises: [],

    /**
     * Load exercises from storage or defaults
     */
    loadExercises: function() {
        const saved = StorageService.getItem(APP_CONSTANTS.STORAGE_KEYS.EXERCISES_LIST);
        this.allExercises = saved || DEFAULT_EXERCISES;
        return this.allExercises;
    },

    /**
     * Get preset exercises
     */
    getPresetExercises: function() {
        if (this.allExercises.length === 0) {
            this.loadExercises();
        }
        return this.allExercises;
    },

    /**
     * Save exercise list to storage
     */
    saveExerciseList: function(exercises) {
        this.allExercises = exercises;
        return StorageService.setItem(APP_CONSTANTS.STORAGE_KEYS.EXERCISES_LIST, exercises);
    },

    /**
     * Get selected exercises from Firebase
     */
    getSelectedExercises: async function() {
        if (FirebaseService.isReady()) {
            const data = await FirebaseService.read(APP_CONSTANTS.FIREBASE_REFS.SELECTED_EXERCISES);
            this.selectedExercises = Array.isArray(data) ? data : [];
            return this.selectedExercises;
        }
        return [];
    },

    /**
     * Subscribe to selected exercises changes
     */
    subscribeToSelectedExercises: function(callback) {
        return FirebaseService.subscribe(
            APP_CONSTANTS.FIREBASE_REFS.SELECTED_EXERCISES,
            (data) => {
                this.selectedExercises = Array.isArray(data) ? data : [];
                callback(this.selectedExercises);
            },
            (error) => {
                Logger.error(`Failed to load exercises: ${error.message}`);
                UIService.showMessage('⚠️ Failed to load exercises', 'error');
            }
        );
    },

    /**
     * Save exercise with metadata
     */
    saveExerciseData: async function(exerciseName, description, videoUrl) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }

        const index = this.selectedExercises.findIndex(ex => {
            const exName = typeof ex === 'string' ? ex : ex.name;
            return exName === exerciseName;
        });

        const exerciseData = {
            name: exerciseName,
            description: description,
            videoUrl: videoUrl,
            timestamp: new Date().toISOString()
        };

        if (index >= 0) {
            // Update existing
            this.selectedExercises[index] = exerciseData;
        } else {
            // Add new
            this.selectedExercises.push(exerciseData);
        }

        return await FirebaseService.write(
            APP_CONSTANTS.FIREBASE_REFS.SELECTED_EXERCISES,
            this.selectedExercises
        );
    },

    /**
     * Delete exercise
     */
    deleteExercise: async function(exerciseName) {
        this.selectedExercises = this.selectedExercises.filter(ex => {
            const exName = typeof ex === 'string' ? ex : ex.name;
            return exName !== exerciseName;
        });

        return await FirebaseService.write(
            APP_CONSTANTS.FIREBASE_REFS.SELECTED_EXERCISES,
            this.selectedExercises
        );
    },

    /**
     * Save the entire selected exercises list (e.g. for reordering)
     */
    saveSelectedExercises: async function(exercises) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase not available', 'error');
            return false;
        }
        this.selectedExercises = exercises;
        return await FirebaseService.write(
            APP_CONSTANTS.FIREBASE_REFS.SELECTED_EXERCISES,
            this.selectedExercises
        );
    }
};

// Initialize exercises on load
ExerciseService.loadExercises();
