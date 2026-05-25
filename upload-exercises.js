// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyB7ZT4RmUgTn73PV8Azo7Jxj2fXMUBjf5c",
    authDomain: "volleyball-exercises-9fd18.firebaseapp.com",
    databaseURL: "https://volleyball-exercises-9fd18-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "volleyball-exercises-9fd18",
    storageBucket: "volleyball-exercises-9fd18.appspot.com",
    messagingSenderId: "155905070449",
    appId: "1:155905070449:web:fd23b00f8e45fca439d2d0"
};

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = "https://ghugjdhjlbextgzxjgdn.supabase.co"; // e.g., https://abc123def456.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodWdqZGhqbGJleHRnenhqZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjU1MTIsImV4cCI6MjA5NTMwMTUxMn0.g9c9auwZ-PEqU3bmdyw4ztvqImwVcautnZZdZ1wS0Mg"; // Your anon public key

// Initialize Firebase
let db = null;
let selectedExercisesRef = null;
let firebaseReady = false;

// Initialize Supabase
let supabaseClient = null;
let supabaseReady = false;

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        selectedExercisesRef = db.ref('selectedExercises');
        firebaseReady = true;
        console.log('✅ Firebase initialized successfully');
        showMessage('✅ Firebase connected', 'info');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        firebaseReady = false;
        showMessage('⚠️ Firebase unavailable - using local data', 'error');
        return false;
    }
}

function initializeSupabase() {
    try {
        if (!SUPABASE_URL.includes('supabase') || !SUPABASE_ANON_KEY) {
            console.warn('⚠️ Supabase credentials not configured');
            showMessage('⚠️ Configure Supabase credentials in upload-exercises.js', 'error');
            supabaseReady = false;
            return false;
        }
        
        // Check if Supabase SDK is loaded
        if (typeof window.supabase === 'undefined') {
            console.error('⚠️ Supabase SDK not loaded. Check CDN availability.');
            showMessage('⚠️ Supabase SDK failed to load. Try a different browser or disable tracking protection.', 'error');
            return false;
        }
        
        // Only create client if not already created
        if (!supabaseClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        
        supabaseReady = true;
        console.log('✅ Supabase initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        supabaseReady = false;
        showMessage('⚠️ Supabase connection failed: ' + error.message, 'error');
        return false;
    }
}

// Try to initialize when script loads
if (typeof firebase !== 'undefined') {
    setTimeout(initializeFirebase, 500);
}

// Wait for Supabase SDK to load and initialize
function waitForSupabase() {
    if (typeof window.supabase !== 'undefined') {
        initializeSupabase();
    } else {
        // Retry after 500ms if SDK not loaded yet
        setTimeout(waitForSupabase, 500);
    }
}

// Start waiting for Supabase SDK
setTimeout(waitForSupabase, 1000);

// ===== CONSTANTS & DATA =====
const ADMIN_PASSWORD = 'admin123';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
let selectedExercises = [];
let isAdminLoggedIn = false;

// ===== MESSAGE FUNCTIONS =====
function showMessage(text, type = 'error') {
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    const infoMsg = document.getElementById('infoMessage');

    document.querySelectorAll('.error-message, .success-message, .info-message').forEach(el => {
        el.classList.remove('show');
    });

    let msgEl;
    if (type === 'error') {
        msgEl = errorMsg;
    } else if (type === 'success') {
        msgEl = successMsg;
    } else {
        msgEl = infoMsg;
    }

    msgEl.textContent = text;
    msgEl.classList.add('show');

    if (type !== 'error') {
        setTimeout(() => {
            msgEl.classList.remove('show');
        }, 4000);
    }
}

// ===== AUTHENTICATION =====
function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    if (!password) {
        showMessage('✗ Please enter admin password', 'error');
        return;
    }

    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        localStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('adminPassword').value = '';
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'block';
        loadExercises();
        showMessage('✓ Login successful!', 'success');
    } else {
        showMessage('✗ Incorrect admin password', 'error');
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    localStorage.removeItem('adminLoggedIn');
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    showMessage('✓ Logged out', 'success');
}

function checkAdminLogin() {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        isAdminLoggedIn = true;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'block';
        loadExercises();
        return true;
    }
    return false;
}

// ===== DATA MANAGEMENT =====
function loadExercises() {
    if (firebaseReady && selectedExercisesRef) {
        selectedExercisesRef.on('value',
            (snapshot) => {
                const data = snapshot.val();
                selectedExercises = Array.isArray(data) ? data : [];
                displayExercises();
            },
            (error) => {
                console.error('❌ Firebase read error:', error);
                showMessage('⚠️ Failed to load exercises', 'error');
            }
        );
    }
}

function saveExerciseData(exerciseName, description, videoUrl) {
    if (!firebaseReady || !selectedExercisesRef) {
        showMessage('⚠️ Firebase not available', 'error');
        return Promise.reject('Firebase unavailable');
    }

    // Find and update exercise
    const index = selectedExercises.findIndex(ex => {
        const exName = typeof ex === 'string' ? ex : ex.name;
        return exName === exerciseName;
    });

    if (index >= 0) {
        selectedExercises[index] = {
            name: exerciseName,
            description: description,
            videoUrl: videoUrl
        };

        return selectedExercisesRef.set(selectedExercises);
    } else {
        return Promise.reject('Exercise not found');
    }
}

// ===== DISPLAY FUNCTIONS =====
function displayExercises() {
    const list = document.getElementById('exercisesList');
    
    if (selectedExercises.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center; font-style: italic;">No exercises scheduled</p>';
    } else {
        list.innerHTML = selectedExercises.map((exercise) => {
            const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
            const hasVideo = typeof exercise === 'object' && exercise.videoUrl;
            const hasDesc = typeof exercise === 'object' && exercise.description;

            return `
                <div class="exercise-item-edit">
                    <div class="exercise-name-display">${exerciseName}</div>
                    <div class="exercise-status ${hasVideo ? 'has-video' : ''}">
                        ${hasVideo ? '✓ Video uploaded' : '✗ No video'}
                    </div>
                    <div class="exercise-status ${hasDesc ? 'has-description' : ''}">
                        ${hasDesc ? '✓ Has description' : '✗ No description'}
                    </div>
                    <button class="btn-edit-exercise" onclick="editExercise('${exerciseName}')">Edit</button>
                </div>
            `;
        }).join('');
    }
}

function editExercise(exerciseName) {
    const exercise = selectedExercises.find(ex => {
        const exName = typeof ex === 'string' ? ex : ex.name;
        return exName === exerciseName;
    });

    if (!exercise) {
        showMessage('Exercise not found', 'error');
        return;
    }

    const currentDesc = typeof exercise === 'object' ? (exercise.description || '') : '';

    document.getElementById('editExerciseName').value = exerciseName;
    document.getElementById('editDescription').value = currentDesc;
    document.getElementById('editVideoInput').value = '';
    document.getElementById('editSection').style.display = 'block';
    document.getElementById('uploadProgress').style.display = 'none';

    // Scroll to edit section
    document.getElementById('editSection').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('editSection').style.display = 'none';
    document.getElementById('editExerciseName').value = '';
    document.getElementById('editDescription').value = '';
    document.getElementById('editVideoInput').value = '';
}

// Validate file size on selection
function validateFileSize(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > MAX_FILE_SIZE) {
            showMessage(`✗ File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 100 MB.`, 'error');
            input.value = '';
        }
    }
}

// ===== UPLOAD FUNCTIONS =====
function uploadExerciseData() {
    const exerciseName = document.getElementById('editExerciseName').value;
    const description = document.getElementById('editDescription').value;
    const videoFile = document.getElementById('editVideoInput').files[0];

    if (!exerciseName) {
        showMessage('✗ Exercise name is missing', 'error');
        return;
    }

    if (!videoFile && !description) {
        showMessage('✗ Please add either a video or description', 'error');
        return;
    }

    // Validate file size
    if (videoFile && videoFile.size > MAX_FILE_SIZE) {
        showMessage(`✗ Video is too large (max 100 MB)`, 'error');
        return;
    }

    // Disable button and show progress
    const saveBtn = document.querySelector('#editSection .btn-save');
    saveBtn.disabled = true;

    if (videoFile) {
        uploadVideo(exerciseName, videoFile, description, saveBtn);
    } else {
        // No video, just save description
        saveExerciseData(exerciseName, description, '')
            .then(() => {
                showMessage('✓ Description saved successfully!', 'success');
                cancelEdit();
                displayExercises();
                saveBtn.disabled = false;
            })
            .catch(error => {
                showMessage('✗ Failed to save: ' + error, 'error');
                saveBtn.disabled = false;
            });
    }
}

function sanitizeFilePath(str) {
    return str
        .normalize('NFD')                           // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '')           // Remove accents
        .replace(/[^\w\s-]/g, '')                  // Remove special characters (keep letters, numbers, spaces, hyphens)
        .replace(/\s+/g, '_')                      // Replace spaces with underscores
        .replace(/_+/g, '_')                       // Remove multiple consecutive underscores
        .toLowerCase();                            // Convert to lowercase
}

function uploadVideo(exerciseName, file, description, saveBtn) {
    if (!supabaseReady || !supabaseClient) {
        showMessage('✗ Supabase not connected. Check credentials in upload-exercises.js', 'error');
        saveBtn.disabled = false;
        return;
    }

    const bucketName = 'exercises';
    const sanitizedExerciseName = sanitizeFilePath(exerciseName);
    const sanitizedFileName = sanitizeFilePath(file.name);
    const fileName = `${Date.now()}_${sanitizedFileName}`;
    const filePath = `${sanitizedExerciseName}/${fileName}`;

    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadProgress').innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text"><span id="progressPercent">0</span>%</div>
    `;

    // Upload to Supabase Storage
    supabaseClient.storage
        .from(bucketName)
        .upload(filePath, file)
        .then((response) => {
            if (response.error) {
                throw new Error(response.error.message);
            }

            // Get public URL
            const { data } = supabaseClient.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            const videoUrl = data.publicUrl;

            // Save to Firebase Database
            saveExerciseData(exerciseName, description, videoUrl)
                .then(() => {
                    showMessage('✓ Video and description saved successfully!', 'success');
                    document.getElementById('uploadProgress').style.display = 'none';
                    cancelEdit();
                    displayExercises();
                    saveBtn.disabled = false;
                })
                .catch(error => {
                    showMessage('✗ Failed to save data: ' + error, 'error');
                    saveBtn.disabled = false;
                });

            // Simulate progress completion
            document.getElementById('progressFill').style.width = '100%';
            document.getElementById('progressPercent').textContent = '100';
        })
        .catch((error) => {
            showMessage(`✗ Upload failed: ${error.message}`, 'error');
            document.getElementById('uploadProgress').style.display = 'none';
            saveBtn.disabled = false;
        });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase is initialized
    if (!firebaseReady && typeof firebase !== 'undefined') {
        initializeFirebase();
    }

    // Check if already logged in from previous session
    if (!checkAdminLogin()) {
        // Admin password enter key
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loginAdmin();
                }
            });
            passwordInput.focus();
        }
    }

    // Edit description enter key (allow multiline)
    // Note: Don't add enter key listener to textarea to allow new lines

    // Cancel edit button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }
});
