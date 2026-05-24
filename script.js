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
let submissionsRef = null;
let firebaseReady = false;

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        submissionsRef = db.ref('formSubmissions');
        firebaseReady = true;
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        firebaseReady = false;
        return false;
    }
}

// Initialize Firebase when page loads
if (typeof firebase !== 'undefined') {
    setTimeout(initializeFirebase, 500);
}

let currentStep = 1;
const totalSteps = 3;

// Update progress and UI
function updateProgress() {
    const progressPercent = (currentStep / totalSteps) * 100;
    document.querySelector('.progress-fill').style.width = progressPercent + '%';
    document.getElementById('currentStep').textContent = currentStep;

    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum === currentStep) {
            step.classList.add('active');
        } else if (stepNum < currentStep) {
            step.classList.add('completed');
        }
    });

    // Update button states
    document.getElementById('prevBtn').disabled = currentStep === 1;
    
    if (currentStep === totalSteps) {
        document.getElementById('nextBtn').textContent = 'Submit';
        document.getElementById('nextBtn').style.background = '#4caf50';
    } else {
        document.getElementById('nextBtn').textContent = 'Next →';
        document.getElementById('nextBtn').style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Show/hide step content
function showStep(step) {
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector(`.step-content[data-step="${step}"]`).classList.add('active');
}

let exerciseCount = 0;

// Load exercises from localStorage or use defaults
function getPresetExercises() {
    const saved = localStorage.getItem('exercisesList');
    if (saved) {
        return JSON.parse(saved);
    }
    return [
        'Warm-up (giri di campo)',
        'Preparazione atletica (addome/dorso/gambe)',
        'Esplosività (salti, sprint, balzi)',
        'Difesa (1, 6, 5 con 2 schiacciatori)',
        'Difesa (4 ruoli autogestita, 1 schiacciatore a giro)',
        'Ricezione (4 in rice, opposti/centrali servizio)',
        'Ricezione (liberi in rice, il resto in servizio)',
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
}

// Add exercise item
function addExercise() {
    exerciseCount++;
    const exercisesList = document.getElementById('exercisesList');
    const presetExercises = getPresetExercises();
    
    const exerciseOptions = presetExercises.map(exercise => `<option value="${exercise}">${exercise}</option>`).join('');
    
    const exerciseItem = document.createElement('div');
    exerciseItem.className = 'exercise-item';
    exerciseItem.id = `exercise-${exerciseCount}`;
    exerciseItem.innerHTML = `
        <select name="exercise_${exerciseCount}_name" class="exercise-name-select exercise-name-dropdown" onchange="updateExerciseName(${exerciseCount})">
            <option value="">Select an exercise...</option>
            ${exerciseOptions}
        </select>
        <div class="exercise-top-row">
            <div class="exercise-rating">
                <input type="range" class="rating-slider" name="exercise_${exerciseCount}_rating" min="0" max="4" value="0" onchange="updateRatingValue(${exerciseCount})" oninput="updateRatingValue(${exerciseCount})">
                <div class="rating-value" id="rating-value-${exerciseCount}">😞</div>
            </div>
            <button type="button" class="exercise-remove" onclick="removeExercise(${exerciseCount})" style="flex: 0 0 auto;">✕</button>
        </div>
        <div class="exercise-notes">
            <textarea name="exercise_${exerciseCount}_notes" placeholder="Add notes for this exercise (optional)..." class="exercise-notes-input"></textarea>
        </div>
    `;
    
    exercisesList.appendChild(exerciseItem);
    updateRatingValue(exerciseCount);
    
    // Disable add button if we have 10 exercises
    if (exerciseCount >= 10) {
        document.getElementById('addExerciseBtn').disabled = true;
    }
}

// Update rating value display
function updateRatingValue(exerciseNum) {
    const slider = document.querySelector(`input[name="exercise_${exerciseNum}_rating"]`);
    const valueDisplay = document.getElementById(`rating-value-${exerciseNum}`);
    const rating = slider.value;
    
    const ratingLabels = ['😞', '😐', '😊', '😄', '🤩'];
    valueDisplay.textContent = ratingLabels[rating];
}

// Update exercise name
function updateExerciseName(exerciseNum) {
    const select = document.querySelector(`select[name="exercise_${exerciseNum}_name"]`);
    // The form data will automatically include the selected name
}

// Remove exercise
function removeExercise(exerciseNum) {
    document.getElementById(`exercise-${exerciseNum}`).remove();
    
    // Renumber all remaining exercises
    const remainingExercises = document.querySelectorAll('.exercise-item');
    remainingExercises.forEach((item, index) => {
        const newNum = index + 1;
        
        // Update the item ID
        item.id = `exercise-${newNum}`;
        
        // Update the select field name and onchange handler
        const select = item.querySelector('select');
        select.name = `exercise_${newNum}_name`;
        select.setAttribute('onchange', `updateExerciseName(${newNum})`);
        
        // Update the input field name and handlers for rating
        const slider = item.querySelector('.rating-slider');
        slider.name = `exercise_${newNum}_rating`;
        slider.setAttribute('onchange', `updateRatingValue(${newNum})`);
        slider.setAttribute('oninput', `updateRatingValue(${newNum})`);
        
        // Update the rating value display ID
        const ratingDisplay = item.querySelector('.rating-value');
        ratingDisplay.id = `rating-value-${newNum}`;
        
        // Update the notes field name
        const notesInput = item.querySelector('.exercise-notes-input');
        notesInput.name = `exercise_${newNum}_notes`;
        
        // Update the remove button onclick handler
        const removeBtn = item.querySelector('.exercise-remove');
        removeBtn.setAttribute('onclick', `removeExercise(${newNum})`);
    });
    
    // Recalculate exerciseCount based on remaining exercises
    exerciseCount = remainingExercises.length;
    
    // Enable add button if we have less than 10
    if (exerciseCount < 10) {
        document.getElementById('addExerciseBtn').disabled = false;
    }
}

// Validate current step
function validateStep(step) {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.classList.remove('show');
    errorMsg.textContent = '';

    const getFieldValue = (id) => document.getElementById(id)?.value?.trim() || '';
    const getFieldCheck = (id) => document.getElementById(id)?.checked || false;

    switch(step) {
        case 1:
            if (!getFieldValue('firstName')) {
                errorMsg.textContent = '✗ First Name is required';
                errorMsg.classList.add('show');
                return false;
            }
            if (!getFieldValue('lastName')) {
                errorMsg.textContent = '✗ Last Name is required';
                errorMsg.classList.add('show');
                return false;
            }
            return true;

        case 2:
            if (!getFieldValue('exerciseDate')) {
                errorMsg.textContent = '✗ Please select a date';
                errorMsg.classList.add('show');
                return false;
            }
            
            const exerciseRatings = document.querySelectorAll('input[name^="exercise_"][name$="_rating"]');
            if (exerciseRatings.length === 0) {
                errorMsg.textContent = '✗ Please add at least one exercise with a rating';
                errorMsg.classList.add('show');
                return false;
            }
            
            let hasUnrated = false;
            let hasUnnamed = false;
            exerciseRatings.forEach((input, index) => {
                const exerciseNum = index + 1;
                if (input.value === '') {
                    hasUnrated = true;
                }
                const nameSelect = document.querySelector(`select[name="exercise_${exerciseNum}_name"]`);
                if (!nameSelect.value) {
                    hasUnnamed = true;
                }
            });
            
            if (hasUnnamed) {
                errorMsg.textContent = '✗ Please select a name for all exercises';
                errorMsg.classList.add('show');
                return false;
            }
            
            if (hasUnrated) {
                errorMsg.textContent = '✗ Please rate all exercises';
                errorMsg.classList.add('show');
                return false;
            }
            return true;

        case 3:
            return true;

        default:
            return true;
    }
}

// Generate summary
function generateSummary() {
    const getFieldValue = (id) => document.getElementById(id)?.value || '';
    const getFieldsValues = (name) => {
        const elements = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(elements).map(el => el.value).join(', ') || 'None';
    };

    // Build exercises summary
    let exercisesSummary = '';
    const exerciseRatings = document.querySelectorAll('input[name^="exercise_"][name$="_rating"]');
    const ratingLabels = ['-', '😞', '😐', '😊', '😄', '🤩'];
    exerciseRatings.forEach((input, index) => {
        const exerciseNum = index + 1;
        const rating = input.value;
        const emoji = ratingLabels[rating];
        const nameSelect = document.querySelector(`select[name="exercise_${exerciseNum}_name"]`);
        const exerciseName = nameSelect?.value || 'Unnamed Exercise';
        const notes = document.querySelector(`textarea[name="exercise_${exerciseNum}_notes"]`)?.value || '';
        const notesDisplay = notes ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #3a4560; font-size: 13px; color: #999;">📝 ${notes}</div>` : '';
        
        exercisesSummary += `
            <div class="summary-item">
                <div class="summary-label">${exerciseName}</div>
                <div class="summary-value">${emoji} (${rating}/5)${notesDisplay}</div>
            </div>
        `;
    });

    const summary = `
        <div class="summary-section">
            <div class="summary-item">
                <div class="summary-label">Full Name</div>
                <div class="summary-value">${getFieldValue('firstName')} ${getFieldValue('lastName')}</div>
            </div>
        </div>

        <div class="summary-section">
            ${exercisesSummary}
        </div>

        <div class="summary-section">
            <div class="summary-item">
                <div class="summary-label">Notes</div>
                <div class="summary-value">${getFieldValue('notes') || 'No notes'}</div>
            </div>
        </div>
    `;

    document.getElementById('summaryContainer').innerHTML = summary;
}

// Next step
function nextStep() {
    const errorMsg = document.getElementById('errorMessage');

    if (currentStep < totalSteps) {
        if (!validateStep(currentStep)) {
            return;
        }
        errorMsg.classList.remove('show');
        currentStep++;
        
        showStep(currentStep);
        updateProgress();
        window.scrollTo(0, 0);
    } else if (currentStep === totalSteps) {
        // Submit form
        if (!validateStep(currentStep)) {
            return;
        }
        submitForm();
    }
}

// Previous step
function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        document.getElementById('errorMessage').classList.remove('show');
        showStep(currentStep);
        updateProgress();
        window.scrollTo(0, 0);
    }
}

// Submit form
function submitForm() {
    const form = document.getElementById('dataForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Add timestamp
    const submission = {
        ...data,
        timestamp: new Date().toISOString(),
        submittedAt: new Date().toLocaleString()
    };
    
    console.log('Form Data Submitted:', submission);
    
    // Save to Firebase
    if (firebaseReady && submissionsRef) {
        const newSubmissionRef = submissionsRef.push();
        newSubmissionRef.set(submission)
            .then(() => {
                console.log('✅ Form saved to Firebase');
                // Show success message
                document.getElementById('successMessage').classList.add('show');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    currentStep = 1;
                    form.reset();
                    document.getElementById('successMessage').classList.remove('show');
                    showStep(1);
                    updateProgress();
                }, 2000);
            })
            .catch(error => {
                console.error('❌ Error saving to Firebase:', error);
                alert('Error submitting form. Please try again.');
            });
    } else {
        console.warn('⚠️ Firebase not available, form not submitted');
        alert('⚠️ Database connection unavailable. Please try again.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase is initialized
    if (!firebaseReady && typeof firebase !== 'undefined') {
        initializeFirebase();
    }
    
    updateProgress();
    addExercise(); // Add first exercise by default
});
