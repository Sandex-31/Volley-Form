/**
 * Exercise Upload Manager
 * Handle admin exercise uploads and management
 */

const ExerciseUploadManager = {
    isAdminLoggedIn: false,
    selectedExercises: [],

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
        const cancelEditBtn = document.getElementById('cancelEditBtn');

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
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.cancelEdit());
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
            this.populatePresetDropdown();
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
        this.cancelEdit();
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
            // Allow dynamic loading of presets once ready
            setTimeout(() => this.populatePresetDropdown(), 500);
        }
    },

    /**
     * Load exercises from Firebase
     */
    loadExercises: function() {
        ExerciseService.subscribeToSelectedExercises((exercises) => {
            this.selectedExercises = exercises || [];
            this.displayExercises(this.selectedExercises);
        });
    },

    /**
     * Populate preset exercises dropdown
     */
    populatePresetDropdown: function() {
        const select = document.getElementById('exerciseSelect');
        if (!select) return;

        select.innerHTML = '<option value="">-- Choose an exercise --</option>';
        const presets = ExerciseService.getPresetExercises();

        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = preset;
            select.appendChild(option);
        });
    },

    /**
     * Add selected preset exercise to the schedule
     */
    addPresetExercise: async function() {
        const select = document.getElementById('exerciseSelect');
        if (!select) return;

        const selected = select.value;
        if (!selected) {
            UIService.showMessage('✗ Please select an exercise from the list', 'error');
            return;
        }

        // Check if already scheduled
        const exists = this.selectedExercises.some(ex => {
            const exName = typeof ex === 'string' ? ex : ex.name;
            return exName === selected;
        });

        if (exists) {
            UIService.showMessage('✗ This exercise is already scheduled', 'error');
            return;
        }

        const newExercise = {
            name: selected,
            description: '',
            videoUrl: '',
            timestamp: new Date().toISOString()
        };

        const updatedList = [...this.selectedExercises, newExercise];
        const success = await ExerciseService.saveSelectedExercises(updatedList);
        if (success) {
            select.value = '';
            UIService.showMessage('✓ Exercise added to schedule!', 'success');
        } else {
            UIService.showMessage('✗ Failed to add exercise', 'error');
        }
    },

    /**
     * Add new custom exercise
     */
    addNewExercise: async function() {
        const exerciseName = prompt('Enter custom exercise name:');
        if (!exerciseName || !exerciseName.trim()) return;

        const exists = this.selectedExercises.some(ex => {
            const exName = typeof ex === 'string' ? ex : ex.name;
            return exName.toLowerCase() === exerciseName.trim().toLowerCase();
        });

        if (exists) {
            UIService.showMessage('✗ This exercise is already scheduled', 'error');
            return;
        }

        const newExercise = {
            name: exerciseName.trim(),
            description: '',
            videoUrl: '',
            timestamp: new Date().toISOString()
        };

        const updatedList = [...this.selectedExercises, newExercise];
        const success = await ExerciseService.saveSelectedExercises(updatedList);
        if (success) {
            UIService.showMessage('✓ Custom exercise added to schedule!', 'success');
        } else {
            UIService.showMessage('✗ Failed to add exercise', 'error');
        }
    },

    /**
     * Display exercises in UI (Matching styles in upload-exercises.css)
     */
    displayExercises: function(exercises) {
        const container = document.getElementById('exercisesList');
        if (!container) return;

        container.innerHTML = '';

        if (!exercises || exercises.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-style: italic; padding: 20px;">No exercises scheduled</p>';
            return;
        }

        exercises.forEach((exercise, index) => {
            const exerciseEl = document.createElement('div');
            exerciseEl.className = 'exercise-item-edit';
            exerciseEl.draggable = true;
            exerciseEl.dataset.index = index;

            const exName = typeof exercise === 'string' ? exercise : exercise.name;
            const hasVideo = typeof exercise === 'object' && exercise.videoUrl;
            const hasDesc = typeof exercise === 'object' && exercise.description;

            exerciseEl.innerHTML = `
                <span class="admin-drag-handle" title="Drag to reorder" style="cursor: grab; color: var(--text-muted); font-size: 16px; margin-right: 10px; user-select: none;">☰</span>
                <div class="exercise-name-display" style="display: inline-block; font-weight: bold; margin-bottom: 8px;">${exName}</div>
                <div class="exercise-status ${hasVideo ? 'has-video' : ''}" style="font-size: 12px; color: ${hasVideo ? 'var(--success)' : 'var(--text-muted)'};">
                    ${hasVideo ? '✓ Video uploaded' : '✗ No video'}
                </div>
                <div class="exercise-status ${hasDesc ? 'has-description' : ''}" style="font-size: 12px; color: ${hasDesc ? 'var(--accent)' : 'var(--text-muted)'}; margin-top: 4px;">
                    ${hasDesc ? '✓ Has description' : '✗ No description'}
                </div>
                <div class="admin-reorder-buttons" style="margin-top: 10px; display: inline-flex; gap: 4px;">
                    <button type="button" class="admin-btn-reorder" onclick="ExerciseUploadManager.moveExercise(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move up" style="padding: 4px 8px; font-size: 10px;">▲</button>
                    <button type="button" class="admin-btn-reorder" onclick="ExerciseUploadManager.moveExercise(${index}, 1)" ${index === exercises.length - 1 ? 'disabled' : ''} title="Move down" style="padding: 4px 8px; font-size: 10px;">▼</button>
                </div>
                <div style="margin-top: 10px;">
                    <button class="btn-edit-exercise" onclick="ExerciseUploadManager.editExercise('${this.escapeQuote(exName)}')" style="padding: 6px 12px; font-size: 12px; background: var(--accent); color: white;">Edit</button>
                    <button class="btn-remove-exercise" onclick="ExerciseUploadManager.deleteExercise('${this.escapeQuote(exName)}')" style="padding: 6px 12px; font-size: 12px; background: var(--danger); color: white; margin-left: 5px;">Delete</button>
                </div>
            `;
            container.appendChild(exerciseEl);
        });

        this.setupDragAndDrop();
    },

    /**
     * Open exercise edit form
     */
    editExercise: function(exerciseName) {
        const exercise = this.selectedExercises.find(ex => {
            const exName = typeof ex === 'string' ? ex : ex.name;
            return exName === exerciseName;
        });

        if (!exercise) {
            UIService.showMessage('Exercise not found', 'error');
            return;
        }

        const currentDesc = typeof exercise === 'object' ? (exercise.description || '') : '';
        
        document.getElementById('editExerciseName').value = exerciseName;
        document.getElementById('editDescription').value = currentDesc;
        document.getElementById('editVideoInput').value = '';
        
        const progressDiv = document.getElementById('uploadProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
            progressDiv.innerHTML = '';
        }

        UIService.toggleElement('editSection', true);
        document.getElementById('editSection').scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * Cancel edit mode
     */
    cancelEdit: function() {
        UIService.toggleElement('editSection', false);
        document.getElementById('editExerciseName').value = '';
        document.getElementById('editDescription').value = '';
        document.getElementById('editVideoInput').value = '';
    },

    /**
     * Save exercise data and upload video if provided
     */
    uploadExerciseData: async function() {
        const exerciseName = document.getElementById('editExerciseName').value;
        const description = document.getElementById('editDescription').value;
        const videoInput = document.getElementById('editVideoInput');
        const videoFile = videoInput ? videoInput.files[0] : null;

        if (!exerciseName) {
            UIService.showMessage('✗ Exercise name is missing', 'error');
            return;
        }

        const saveBtn = document.querySelector('#editSection .btn-save');
        if (saveBtn) saveBtn.disabled = true;

        try {
            if (videoFile) {
                // Check file size
                if (videoFile.size > APP_CONSTANTS.MAX_FILE_SIZE) {
                    UIService.showMessage('✗ Video is too large (max 100 MB)', 'error');
                    if (saveBtn) saveBtn.disabled = false;
                    return;
                }

                // Check Supabase initialization
                if (!SupabaseModule.isInitialized()) {
                    UIService.showMessage('✗ Supabase Storage is not connected or initialized', 'error');
                    if (saveBtn) saveBtn.disabled = false;
                    return;
                }

                const bucketName = 'exercises';
                const sanitizedExerciseName = this.sanitizeFilePath(exerciseName);
                const sanitizedFileName = this.sanitizeFilePath(videoFile.name);
                const fileName = `${Date.now()}_${sanitizedFileName}`;
                const filePath = `${sanitizedExerciseName}/${fileName}`;

                // Setup progress bar
                const progressDiv = document.getElementById('uploadProgress');
                if (progressDiv) {
                    progressDiv.style.display = 'block';
                    progressDiv.innerHTML = `
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill" style="width: 10%;"></div>
                        </div>
                        <div class="progress-text"><span id="progressPercent">10</span>% - Uploading to Supabase...</div>
                    `;
                }

                // Upload file to Supabase
                const supabaseClient = SupabaseModule.getClient();
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from(bucketName)
                    .upload(filePath, videoFile);

                if (uploadError) {
                    throw new Error(uploadError.message);
                }

                // Update progress indicator
                const progressFill = document.getElementById('progressFill');
                const progressPercent = document.getElementById('progressPercent');
                if (progressFill) progressFill.style.width = '70%';
                if (progressPercent) progressPercent.textContent = '70';

                // Get public URL
                const { data: publicUrlData } = supabaseClient.storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                const videoUrl = publicUrlData.publicUrl;

                if (progressFill) progressFill.style.width = '90%';
                if (progressPercent) progressPercent.textContent = '90';

                // Save to Firebase
                const success = await ExerciseService.saveExerciseData(exerciseName, description, videoUrl);
                if (success) {
                    if (progressFill) progressFill.style.width = '100%';
                    if (progressPercent) progressPercent.textContent = '100';
                    UIService.showMessage('✓ Video and description saved successfully!', 'success');
                    this.cancelEdit();
                } else {
                    UIService.showMessage('✗ Failed to save metadata to Firebase', 'error');
                }
            } else {
                // No video file, just update description and keep the existing video URL!
                const existingExercise = this.selectedExercises.find(ex => {
                    const exName = typeof ex === 'string' ? ex : ex.name;
                    return exName === exerciseName;
                });
                const existingVideoUrl = existingExercise && typeof existingExercise === 'object' ? (existingExercise.videoUrl || '') : '';

                const success = await ExerciseService.saveExerciseData(exerciseName, description, existingVideoUrl);
                if (success) {
                    UIService.showMessage('✓ Description saved successfully!', 'success');
                    this.cancelEdit();
                } else {
                    UIService.showMessage('✗ Failed to save data', 'error');
                }
            }
        } catch (error) {
            Logger.error(`Upload error: ${error.message}`);
            UIService.showMessage(`✗ Upload failed: ${error.message}`, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            const progressDiv = document.getElementById('uploadProgress');
            if (progressDiv) progressDiv.style.display = 'none';
        }
    },

    /**
     * Delete exercise from schedule
     */
    deleteExercise: async function(exerciseName) {
        if (!confirm(`Are you sure you want to delete "${exerciseName}" from the schedule?`)) {
            return;
        }

        const success = await ExerciseService.deleteExercise(exerciseName);
        if (success) {
            UIService.showMessage('✓ Exercise deleted!', 'success');
            // If deleting the active editing exercise, cancel it
            const activeEditName = document.getElementById('editExerciseName').value;
            if (activeEditName === exerciseName) {
                this.cancelEdit();
            }
        } else {
            UIService.showMessage('✗ Failed to delete exercise', 'error');
        }
    },

    /**
     * Move exercise up or down in array
     */
    moveExercise: async function(index, direction) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= this.selectedExercises.length) return;

        const updatedList = [...this.selectedExercises];
        // Swap elements
        [updatedList[index], updatedList[targetIndex]] = [updatedList[targetIndex], updatedList[index]];

        const success = await ExerciseService.saveSelectedExercises(updatedList);
        if (!success) {
            UIService.showMessage('✗ Failed to reorder exercises', 'error');
        }
    },

    /**
     * Setup drag and drop for cards
     */
    setupDragAndDrop: function() {
        const items = document.querySelectorAll('.exercise-item-edit');
        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    e.preventDefault();
                    return;
                }
                draggedItem = item;
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                items.forEach(i => i.classList.remove('drag-over'));
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== item) {
                    const draggedIndex = parseInt(draggedItem.dataset.index);
                    const targetIndex = parseInt(item.dataset.index);

                    const updatedList = [...this.selectedExercises];
                    [updatedList[draggedIndex], updatedList[targetIndex]] = [updatedList[targetIndex], updatedList[draggedIndex]];

                    const success = await ExerciseService.saveSelectedExercises(updatedList);
                    if (!success) {
                        UIService.showMessage('✗ Failed to save reordered list', 'error');
                    }
                }
            });
        });
    },

    /**
     * Sanitize path string for Supabase uploads
     */
    sanitizeFilePath: function(str) {
        return str
            .normalize('NFD')                           // Decompose accented characters
            .replace(/[\u0300-\u036f]/g, '')           // Remove accents
            .replace(/[^\w\s-]/g, '')                  // Remove special characters
            .replace(/\s+/g, '_')                      // Replace spaces with underscores
            .replace(/_+/g, '_')                       // Remove multiple consecutive underscores
            .toLowerCase();                            // Convert to lowercase
    },

    /**
     * Escape single quotes for HTML attribute strings
     */
    escapeQuote: function(str) {
        return str.replace(/'/g, "\\'");
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
