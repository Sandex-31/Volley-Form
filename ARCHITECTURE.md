# Volleyball Form - Refactored Architecture

A modern, well-organized volleyball training form application with Firebase integration, exercise management, and cloud functions for response handling.

## 📁 Project Structure

```
Volley_Form/
├── src/
│   ├── config/                    # Configuration files
│   │   ├── firebase.config.js     # Firebase initialization
│   │   ├── supabase.config.js     # Supabase initialization
│   │   └── constants.js           # App constants & defaults
│   │
│   ├── common/                    # Shared utilities
│   │   ├── logger.js              # Logging service
│   │   ├── ui-service.js          # UI helper functions
│   │   └── storage-service.js     # LocalStorage wrapper
│   │
│   ├── services/                  # Business logic services
│   │   ├── firebase-service.js    # Firebase database operations
│   │   └── exercise-service.js    # Exercise data management
│   │
│   ├── modules/
│   │   ├── form/                  # Multi-step form module
│   │   │   ├── form.js            # Form logic & navigation
│   │   │   └── validation.js      # Form validation
│   │   │
│   │   ├── exercises/             # Exercise management
│   │   │   ├── upload-manager.js  # Admin upload interface
│   │   │   └── exercise-display.js # Public display
│   │   │
│   │   └── responses/             # Response handling
│   │       └── responses.js       # Display form responses
│   │
│   ├── pages/                     # HTML pages
│   │   ├── index.html             # Main form page
│   │   ├── upload-exercises.html  # Admin exercise upload
│   │   ├── public-exercises.html  # Public exercise list
│   │   └── responses.html         # Response viewer
│   │
│   └── styles/                    # Global styles
│       └── global.css             # Shared CSS
│
├── functions/
│   ├── config/
│   │   └── firebase-admin.config.js # Admin SDK config
│   │
│   ├── services/
│   │   └── db-service.js          # Database operations
│   │
│   ├── controllers/
│   │   └── response-controller.js # Response handlers
│   │
│   ├── index.js                   # Cloud Functions exports
│   ├── deleteResponses.js         # CLI deletion script
│   └── package.json               # Dependencies
│
├── public/                        # Static assets
├── README.md
├── .env.example
└── .gitignore
```

## 🎯 Key Features

### Frontend Architecture
- **Modular Design**: Each feature is self-contained in its own module
- **Separation of Concerns**: Config, services, and UI logic are separate
- **Reusable Services**: Firebase, UI, Storage, and Logger services
- **Form Validation**: Centralized validation with sanitization

### Backend (Cloud Functions)
- **Scheduled Deletions**: Automatic response deletion on Tuesday & Friday
- **Manual Management**: HTTP functions for backup and deletion
- **Service Layer**: Abstracted database operations

## 🚀 Getting Started

### 1. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your Firebase & Supabase credentials
```

### 2. HTML File Imports

All HTML files should import scripts in this order:

```html
<!-- 1. Firebase SDK (CDN) -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>

<!-- 2. Supabase SDK (CDN) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 3. Configuration & Constants -->
<script src="src/config/firebase.config.js"></script>
<script src="src/config/supabase.config.js"></script>
<script src="src/config/constants.js"></script>

<!-- 4. Common Services -->
<script src="src/common/logger.js"></script>
<script src="src/common/storage-service.js"></script>
<script src="src/common/ui-service.js"></script>

<!-- 5. Data Services -->
<script src="src/services/firebase-service.js"></script>
<script src="src/services/exercise-service.js"></script>

<!-- 6. Feature Modules -->
<!-- For index.html -->
<script src="src/modules/form/validation.js"></script>
<script src="src/modules/form/form.js"></script>

<!-- For upload-exercises.html -->
<script src="src/modules/exercises/upload-manager.js"></script>

<!-- For public-exercises.html -->
<script src="src/modules/exercises/exercise-display.js"></script>

<!-- For responses.html -->
<script src="src/modules/responses/responses.js"></script>
```

### 3. Cloud Functions Deployment

```bash
cd functions
npm install
firebase deploy --only functions
```

## 📋 Module Documentation

### Services

#### FirebaseService
```javascript
// Check if ready
FirebaseService.isReady() // boolean

// Write data
await FirebaseService.write('path', data)

// Read data (one-time)
const data = await FirebaseService.read('path')

// Subscribe to changes (real-time)
const ref = FirebaseService.subscribe('path', (data) => {
  console.log('Data updated:', data);
})

// Unsubscribe
FirebaseService.unsubscribe(ref)
```

#### ExerciseService
```javascript
// Load exercises
ExerciseService.loadExercises()

// Get preset exercises
const exercises = ExerciseService.getPresetExercises()

// Get selected exercises
const selected = await ExerciseService.getSelectedExercises()

// Save exercise
await ExerciseService.saveExerciseData(name, description, videoUrl)

// Delete exercise
await ExerciseService.deleteExercise(name)
```

#### UIService
```javascript
// Show message
UIService.showMessage('Hello!', 'success') // success, error, info

// Update status
UIService.updateStatusIndicator('Connected', '#51a376')

// Toggle element
UIService.toggleElement('elementId', true)
```

#### StorageService
```javascript
// Get item
const value = StorageService.getItem('key')

// Set item
StorageService.setItem('key', value)

// Remove item
StorageService.removeItem('key')

// Check if exists
if (StorageService.hasItem('key')) { ... }
```

### Modules

#### FormModule
```javascript
// Add exercise
FormModule.addExercise()

// Remove exercise
FormModule.removeExercise(exerciseNum)

// Update rating
FormModule.updateRatingValue(exerciseNum)

// Submit form
FormModule.submitForm()
```

#### ExerciseUploadManager
```javascript
// Login
ExerciseUploadManager.loginAdmin()

// Logout
ExerciseUploadManager.logoutAdmin()

// Save exercise
await ExerciseUploadManager.saveExerciseData(name, index)

// Delete exercise
await ExerciseUploadManager.deleteExercise(name)
```

#### ExerciseDisplay
```javascript
// Load and display
ExerciseDisplay.loadAndDisplayExercises()
```

#### ResponsesModule
```javascript
// Load responses
ResponsesModule.loadResponses()
```

## 🛠 Cloud Functions

### Scheduled Functions

**deleteResponsesScheduled**
- Runs every Tuesday & Friday at 00:00 UTC
- Automatically deletes all form responses
- Logs deletion count

### HTTP Functions

**deleteResponsesManual**
- Callable function to manually delete responses
- Requires authentication
- Returns deletion count

**getAllResponses**
- GET endpoint to retrieve all responses
- Returns count and data

**backupResponses**
- GET endpoint to create backup
- Returns all responses with metadata

**getNextDeletionTime**
- GET endpoint to check next scheduled deletion
- Returns next deletion date/time

## 📝 Configuration

### Constants (src/config/constants.js)

```javascript
APP_CONSTANTS = {
    ADMIN_PASSWORD: 'admin123',
    MAX_FILE_SIZE: 100 * 1024 * 1024,
    MAX_EXERCISES_PER_FORM: 10,
    FORM_STEPS: 3,
    // ... more constants
}
```

## 🔐 Security Notes

- Admin password should be changed in production
- Never commit sensitive credentials
- Use environment variables for secrets
- Cloud Functions should have proper authentication
- Sanitize user inputs to prevent XSS

## 📦 Dependencies

### Frontend
- Firebase Realtime Database
- Supabase (for file storage)

### Backend
- firebase-admin
- firebase-functions
- Node.js 20+

## 🔄 Workflow

### Adding Form Data
1. User fills out multi-step form
2. FormModule validates input
3. FormModule submits to Firebase
4. Responses stored in 'formSubmissions'

### Managing Exercises
1. Admin logs in with password
2. ExerciseUploadManager loads exercises from Firebase
3. Admin can add/edit/delete exercises
4. Changes sync to Firebase Realtime Database
5. Public page displays exercises in real-time

## 🐛 Debugging

### Enable Logging
```javascript
Logger.log('Message', 'info')     // info, success, warning, error
Logger.success('Success!')
Logger.error('Error occurred')
```

### Check Firebase Status
- All modules log to browser console
- Check Firebase console for data
- UI displays status indicators

## 🚀 Deployment

### Frontend
- Deploy to Firebase Hosting or any static host
- Update environment variables

### Backend (Functions)
```bash
cd functions
npm install
firebase deploy --only functions
```

## 📞 Support

For issues or questions about the architecture, check:
1. Browser console for error logs
2. Firebase console for data issues
3. Cloud Functions logs for backend errors

## 📄 License

MIT License - feel free to modify for your needs
