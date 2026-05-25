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

// Initialize Firebase
let db = null;
let selectedExercisesRef = null;
let firebaseReady = false;

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        selectedExercisesRef = db.ref('selectedExercises');
        firebaseReady = true;
        console.log('✅ Firebase initialized successfully');
        updateStatusIndicator('✅ Real-time sync active', '#51a376');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        firebaseReady = false;
        updateStatusIndicator('⚠️ Using local storage', '#e67e22');
        return false;
    }
}

function updateStatusIndicator(text, color) {
    const status = document.getElementById('firebaseStatus');
    if (status) {
        status.textContent = text;
        status.style.color = color;
    }
}

// Try to initialize Firebase when script loads
if (typeof firebase !== 'undefined') {
    setTimeout(initializeFirebase, 500);
} else {
    console.warn('Firebase SDK not loaded yet, will try again on page load');
}

// ===== CONSTANTS & DATA =====
const ADMIN_PASSWORD = 'admin123';
const DEFAULT_EXERCISES = [
    'TEST NUOVO ESERCIZIO GENERALE',
    'Liberi - TEST NUOVO ESERCIZIO',
    'Bande - TEST NUOVO ESERCIZIO',
    'Opposti - TEST NUOVO ESERCIZIO',
    'Centrali - TEST NUOVO ESERCIZIO',
    'Palleggi - TEST NUOVO ESERCIZIO',
    'Warm-up (giri di campo)',
    'Preparazione atletica (addome/dorso/gambe)',
    'Esplosività (salti, sprint, balzi)',
    'Suicidi e scatti',
    'Bagherone (1v1 bagher)',
    'Inferno & Paradiso',
    'Partitella',
    'Servizio (mirato per ruoli)',
    'Difesa (1, 6, 5 con 2 schiacciatori)',
    'Difesa (4 ruoli autogestita, 1 schiacciatore a giro)',
    'Ricezione (4 in rice, opposti/centrali servizio)',
    'Ricezione (liberi in rice, il resto in servizio)',
    'Ricezione (doppia ricezione a 2 campi)',
    'Situazione di gioco (6 vs 6, con muro a 2 o 3)',
    'Attacchi (uno o entrambi i campi, bande/opposti/centrali)',
    'Attacchi (un campo, bande/opposti, centrali a muro)',
    'Attacchi (bande/opposti, approccio e salto con blocco della palla)',
    'Attacchi (approccio, con il minimo di passi, senza toccare la rete con la mano)',
    'Attacchi (tecnica diagonali/parallele/pallonetti con pallina da tennis)',
    'Attacchi (approccio con tappetino per staccare il primo passo)',
    'Bande (approccio a muro e rotazione in posizione di attacco)',
    'Bande (movimento delle braccia con palla da tennis)',
    'Liberi (rinforzo gambe e posizione squat con spostamento/affondi/hip trust/ single leg reach)',
    'Liberi (scatti con cinesini)',
    'Liberi (bagher a chiamata partento di spalle)',
    'Liberi (bagher con elastico alle spalliere)',
    'Liberi (difesa palla corta/palla lunga)',
    'Opposti (attacco con muro)',
    'Opposti (approccio per attacco da prima)',
    'Opposti (approccio per attacco da seconda)',
    'Centrali (approccio ad attacco in prima)',
    'Centrali (muro a 2 entrambi i lati)',
    'Centrali (muro singolo con spostamento laterale doppio tramite cinesini)',
    'Centrali (situazione di gioco con muro e approccio)',
    'Centrali (muro con lettura del palleggio)'
];

let allExercises = [];
let selectedExercises = [];
let isAdminLoggedIn = false;

// ===== DATA MANAGEMENT =====

// Load exercises from storage
function loadData() {
    const saved = localStorage.getItem('exercisesList');
    if (saved) {
        allExercises = JSON.parse(saved);
    } else {
        allExercises = DEFAULT_EXERCISES;
    }

    // Load selectedExercises from Firebase
    if (firebaseReady && selectedExercisesRef) {
        console.log('📡 Setting up Firebase real-time listener...');
        updateStatusIndicator('📡 Syncing...', '#5b7cfa');
        selectedExercisesRef.on('value', 
            (snapshot) => {
                const data = snapshot.val();
                console.log('🔄 Firebase data received:', data);
                selectedExercises = Array.isArray(data) ? data : [];
                updateStatusIndicator('✅ Real-time sync active', '#51a376');
                displayExercises();
            },
            (error) => {
                console.error('❌ Firebase read error:', error);
                updateStatusIndicator('⚠️ Using local storage (sync failed)', '#e67e22');
                // Fallback to localStorage
                const savedSelected = localStorage.getItem('selectedExercises');
                selectedExercises = savedSelected ? JSON.parse(savedSelected) : [];
                displayExercises();
            }
        );
    } else {
        console.warn('⚠️ Firebase not ready, using localStorage');
        updateStatusIndicator('⚠️ Using local storage (Firebase unavailable)', '#e67e22');
        // Fallback to localStorage
        const savedSelected = localStorage.getItem('selectedExercises');
        if (savedSelected) {
            selectedExercises = JSON.parse(savedSelected);
        } else {
            selectedExercises = [];
        }
        displayExercises();
    }
}

// Save exercises to Firebase or localStorage
function saveSelectedExercises() {
    if (firebaseReady && selectedExercisesRef) {
        console.log('💾 Saving to Firebase:', selectedExercises);
        selectedExercisesRef.set(selectedExercises)
            .then(() => console.log('✅ Firebase save successful'))
            .catch(error => {
                console.error('❌ Firebase save failed:', error);
                // Fallback to localStorage
                localStorage.setItem('selectedExercises', JSON.stringify(selectedExercises));
            });
    } else {
        console.log('💾 Saving to localStorage:', selectedExercises);
        localStorage.setItem('selectedExercises', JSON.stringify(selectedExercises));
    }
}

// ===== DISPLAY FUNCTIONS =====

// Display all selected exercises
function displayExercises() {
    const list = document.getElementById('exercisesList');
    
    if (selectedExercises.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">No exercises scheduled for today</div>
            </div>
        `;
    } else {
        list.innerHTML = selectedExercises.map((exercise, index) => {
            // Support both string and object formats for backward compatibility
            const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
            const exerciseDescription = typeof exercise === 'object' ? (exercise.description || '') : '';
            const exerciseVideoUrl = typeof exercise === 'object' ? (exercise.videoUrl || '') : '';
            
            return `
                <div class="exercise-item" id="exercise-${index}">
                    <div class="exercise-item-header" onclick="toggleExercise(${index})">
                        <div class="exercise-item-name">${exerciseName}</div>
                        <div class="exercise-expand-icon" id="icon-${index}">▼</div>
                    </div>
                    <div class="exercise-item-content" id="content-${index}">
                        <div class="exercise-item-body">
                            ${exerciseDescription ? `<div class="exercise-description">${exerciseDescription}</div>` : ''}
                            <div class="exercise-video-container">
                                ${exerciseVideoUrl ? `
                                    <video class="exercise-video" controls loop>
                                        <source src="${exerciseVideoUrl}" type="video/mp4">
                                        Your browser does not support the video tag.
                                    </video>
                                ` : `
                                    <div class="no-video-message">🎥 No video available yet</div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Toggle exercise expand/collapse
function toggleExercise(index) {
    const contentEl = document.getElementById(`content-${index}`);
    const iconEl = document.getElementById(`icon-${index}`);
    
    if (contentEl && iconEl) {
        contentEl.classList.toggle('expanded');
        iconEl.classList.toggle('expanded');
    }
}

// ===== ADMIN PANEL FUNCTIONS =====

// Open admin panel
function openAdminPanel() {
    document.getElementById('adminModal').classList.add('show');
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
    clearMessages();
}

// Close admin panel
function closeAdminPanel() {
    document.getElementById('adminModal').classList.remove('show');
    isAdminLoggedIn = false;
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

// Login as admin
function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('errorMessage');

    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        populateExerciseSelect();
        updateAdminExercisesList();
        errorMsg.classList.remove('show');
    } else {
        errorMsg.textContent = '✗ Incorrect admin password';
        errorMsg.classList.add('show');
    }
}

// Logout admin
function logoutAdmin() {
    isAdminLoggedIn = false;
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    closeAdminPanel();
}

// Populate exercise select dropdown
function populateExerciseSelect() {
    const select = document.getElementById('exerciseSelect');
    select.innerHTML = '<option value="">-- Choose an exercise --</option>';
    
    allExercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        option.textContent = exercise;
        select.appendChild(option);
    });
}

// Add selected exercise to the list
function addSelectedExercise() {
    const selected = document.getElementById('exerciseSelect').value;
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');

    if (!selected) {
        errorMsg.textContent = '✗ Please select an exercise';
        errorMsg.classList.add('show');
        return;
    }

    // Check if exercise already exists (by name)
    if (selectedExercises.some(ex => {
        const exName = typeof ex === 'string' ? ex : ex.name;
        return exName === selected;
    })) {
        errorMsg.textContent = '✗ This exercise is already scheduled';
        errorMsg.classList.add('show');
        return;
    }

    // Create exercise object with name, description, and videoUrl
    const exerciseObj = {
        name: selected,
        description: '',
        videoUrl: ''
    };
    
    selectedExercises.push(exerciseObj);
    saveSelectedExercises();
    
    document.getElementById('exerciseSelect').value = '';
    errorMsg.classList.remove('show');
    successMsg.textContent = '✓ Exercise added successfully!';
    successMsg.classList.add('show');

    updateAdminExercisesList();
    displayExercises();

    setTimeout(() => {
        successMsg.classList.remove('show');
    }, 2000);
}

// Remove exercise from display
function removeExerciseFromDisplay(index) {
    selectedExercises.splice(index, 1);
    saveSelectedExercises();
    
    const successMsg = document.getElementById('successMessage');
    successMsg.textContent = '✓ Exercise removed!';
    successMsg.classList.add('show');
    
    displayExercises();
    updateAdminExercisesList();

    setTimeout(() => {
        successMsg.classList.remove('show');
    }, 1500);
}

// Update exercises list in admin panel
function updateAdminExercisesList() {
    const adminList = document.getElementById('adminExercisesList');
    
    if (selectedExercises.length === 0) {
        adminList.innerHTML = '<div style="color: #999; text-align: center; padding: 15px; font-style: italic;">No exercises scheduled</div>';
    } else {
        adminList.innerHTML = selectedExercises.map((exercise, index) => {
            const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
            return `
                <div class="admin-exercise-item" draggable="true" data-index="${index}">
                    <span class="admin-drag-handle" title="Drag to reorder">☰</span>
                    <span class="admin-exercise-name">${exerciseName}</span>
                    <div class="admin-reorder-buttons">
                        <button type="button" class="admin-btn-reorder" onclick="moveExerciseUpAdmin(${index})" ${index === 0 ? 'disabled' : ''} title="Move up">▲</button>
                        <button type="button" class="admin-btn-reorder" onclick="moveExerciseDownAdmin(${index})" ${index === selectedExercises.length - 1 ? 'disabled' : ''} title="Move down">▼</button>
                    </div>
                    <button class="btn-remove-exercise" onclick="removeExerciseFromAdminList(${index})" style="font-size: 11px; padding: 4px 8px;">Remove</button>
                </div>
            `;
        }).join('');
        setupAdminDragAndDrop();
    }
}

// Move exercise up in admin
function moveExerciseUpAdmin(index) {
    if (index > 0) {
        [selectedExercises[index - 1], selectedExercises[index]] = [selectedExercises[index], selectedExercises[index - 1]];
        saveSelectedExercises();
        updateAdminExercisesList();
        displayExercises();
    }
}

// Move exercise down in admin
function moveExerciseDownAdmin(index) {
    if (index < selectedExercises.length - 1) {
        [selectedExercises[index + 1], selectedExercises[index]] = [selectedExercises[index], selectedExercises[index + 1]];
        saveSelectedExercises();
        updateAdminExercisesList();
        displayExercises();
    }
}

// Setup drag and drop for admin exercises
let draggedAdminItem = null;
function setupAdminDragAndDrop() {
    const items = document.querySelectorAll('.admin-exercise-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                e.preventDefault();
                return;
            }
            draggedAdminItem = item;
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
            draggedAdminItem = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedAdminItem && draggedAdminItem !== item) {
                item.classList.add('drag-over');
            }
        });
        
        item.addEventListener('dragleave', (e) => {
            item.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedAdminItem && draggedAdminItem !== item) {
                const draggedIndex = parseInt(draggedAdminItem.dataset.index);
                const targetIndex = parseInt(item.dataset.index);
                
                [selectedExercises[draggedIndex], selectedExercises[targetIndex]] = [selectedExercises[targetIndex], selectedExercises[draggedIndex]];
                
                saveSelectedExercises();
                updateAdminExercisesList();
                displayExercises();
            }
        });
    });
}

// Remove exercise from admin list
function removeExerciseFromAdminList(index) {
    selectedExercises.splice(index, 1);
    saveSelectedExercises();
    updateAdminExercisesList();
    displayExercises();
}

// Clear messages
function clearMessages() {
    document.getElementById('errorMessage').classList.remove('show');
    document.getElementById('successMessage').classList.remove('show');
}

// ===== INITIALIZATION =====

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase is initialized before loading data
    if (!firebaseReady) {
        console.log('⏳ Initializing Firebase...');
        if (typeof firebase !== 'undefined') {
            initializeFirebase();
        } else {
            console.warn('⚠️ Firebase SDK not available');
            updateStatusIndicator('⚠️ Using local storage', '#e67e22');
        }
    }
    
    // Load data after a small delay to ensure Firebase is ready
    setTimeout(loadData, 200);

    // Admin password enter key listener
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginAdmin();
        }
    });

    // Exercise select enter key listener
    document.getElementById('exerciseSelect').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addSelectedExercise();
        }
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('adminModal');
        if (event.target == modal) {
            closeAdminPanel();
        }
    }
});
