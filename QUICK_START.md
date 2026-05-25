# Quick Start Guide

## 🚀 Getting Started with the New Architecture

### 1️⃣ Quick Setup (5 minutes)

```bash
# Copy CSS files to new location
cp styles.css src/styles/global.css
cp upload-exercises.css src/styles/
cp public-exercises.css src/styles/

# Update CSS paths in HTML files (if needed)
# Open src/pages/*.html and update <link> paths
```

### 2️⃣ Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 3️⃣ Test the Application

#### Test Form
- Open: `src/pages/index.html`
- Fill form and submit
- Check Firebase console for data

#### Test Exercises
- Open: `src/pages/upload-exercises.html`
- Admin password: `admin123`
- Add/edit/delete exercises
- Check `src/pages/public-exercises.html` to verify

#### Test Responses
- Open: `src/pages/responses.html`
- Verify submitted forms display

---

## 📁 File Organization Quick Reference

```
src/
├── config/                    # Constants & config
│   ├── firebase.config.js     # Firebase setup
│   ├── supabase.config.js     # Supabase setup
│   └── constants.js           # App constants
│
├── common/                    # Shared utilities
│   ├── logger.js              # Logging
│   ├── ui-service.js          # UI helpers
│   └── storage-service.js     # LocalStorage
│
├── services/                  # Business logic
│   ├── firebase-service.js    # Database ops
│   └── exercise-service.js    # Exercises
│
├── modules/
│   ├── form/                  # Form functionality
│   ├── exercises/             # Exercise management
│   └── responses/             # Response handling
│
├── pages/                     # HTML files
│   ├── index.html
│   ├── upload-exercises.html
│   ├── public-exercises.html
│   └── responses.html
│
└── styles/                    # CSS files
```

---

## 🔧 Common Tasks

### Add a New Feature

1. **Create module folder**: `src/modules/my-feature/`
2. **Create module file**: `src/modules/my-feature/my-feature.js`
3. **Use services**: Import from `src/services/`
4. **Add to HTML**: Include script in `src/pages/`

Example:
```javascript
// src/modules/my-feature/my-feature.js
const MyFeatureModule = {
    init: function() {
        this.setupEventListeners();
    },
    
    setupEventListeners: function() {
        // Your code here
    },
    
    doSomething: async function() {
        const data = await FirebaseService.read('path');
        UIService.showMessage('Done!', 'success');
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MyFeatureModule.init();
    });
} else {
    MyFeatureModule.init();
}
```

### Use a Service

```javascript
// Logging
Logger.success('Operation completed');
Logger.error('Something went wrong');

// UI
UIService.showMessage('Hello!', 'success');
UIService.toggleElement('myElement', true);

// Storage
StorageService.setItem('key', { name: 'value' });
const data = StorageService.getItem('key');

// Firebase
const data = await FirebaseService.read('path');
FirebaseService.subscribe('path', (data) => {
    console.log('Data changed:', data);
});

// Exercises
const exercises = ExerciseService.getPresetExercises();
await ExerciseService.saveExerciseData(name, desc, url);
```

### Debug Issues

```javascript
// Open browser console (F12)

// Check logs
Logger.log('Something to log', 'info');

// Check Firebase status
console.log(FirebaseService.isReady());

// Check exercise data
console.log(ExerciseService.selectedExercises);

// Check storage
console.log(StorageService.getItem('key'));
```

---

## 🎯 Important Files

| File | Purpose |
|------|---------|
| `src/config/constants.js` | All constants & defaults |
| `src/services/firebase-service.js` | All database operations |
| `src/modules/form/form.js` | Form logic & navigation |
| `src/modules/exercises/upload-manager.js` | Admin exercise management |
| `src/modules/responses/responses.js` | Response display |
| `functions/index.js` | Cloud Functions |

---

## 📝 HTML Script Import Order

**IMPORTANT**: Scripts must load in this exact order:

```html
<!-- 1. External Libraries -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

<!-- 2. Configuration -->
<script src="../config/firebase.config.js"></script>
<script src="../config/supabase.config.js"></script>
<script src="../config/constants.js"></script>

<!-- 3. Common Services -->
<script src="../common/logger.js"></script>
<script src="../common/storage-service.js"></script>
<script src="../common/ui-service.js"></script>

<!-- 4. Data Services (use other services) -->
<script src="../services/firebase-service.js"></script>
<script src="../services/exercise-service.js"></script>

<!-- 5. Feature Modules (use all above) -->
<script src="../modules/form/validation.js"></script>
<script src="../modules/form/form.js"></script>
```

---

## 🐛 Troubleshooting

### Script Not Found Error
```
❌ Uncaught SyntaxError: Unexpected token '<'
```
**Fix**: Check script path is correct relative to HTML file location

### Firebase Not Ready
```
❌ Cannot read property 'database' of undefined
```
**Fix**: Make sure Firebase SDK loads before `firebase.config.js`

### Module Not Defined
```
❌ FormModule is not defined
```
**Fix**: Ensure script order is correct and module script is loaded

### Empty Exercise List
**Fix**: 
1. Check Firebase has data in `selectedExercises` node
2. Verify Firebase connection works
3. Check browser console for errors

---

## 🚀 Deployment

### Firebase Hosting
```bash
firebase deploy --only hosting
```

### Cloud Functions
```bash
cd functions
firebase deploy --only functions
```

### Both
```bash
firebase deploy
```

---

## 💡 Best Practices

### 1. Always Use Services
```javascript
// ❌ Don't do this
localStorage.setItem('key', data);
document.getElementById('msg').textContent = 'Hi';

// ✅ Do this
StorageService.setItem('key', data);
UIService.showMessage('Hi', 'info');
```

### 2. Proper Error Handling
```javascript
// ✅ Good
try {
    const data = await FirebaseService.read('path');
    if (data) {
        // Use data
    }
} catch (error) {
    Logger.error('Failed: ' + error.message);
    UIService.showMessage('Operation failed', 'error');
}
```

### 3. Initialize on Page Load
```javascript
// ✅ Always initialize modules when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        MyModule.init();
    });
} else {
    MyModule.init();
}
```

### 4. Use Constants
```javascript
// ❌ Avoid hardcoding
if (exercises.length >= 10) { ... }

// ✅ Use constants
if (exercises.length >= APP_CONSTANTS.MAX_EXERCISES_PER_FORM) { ... }
```

---

## 📚 Documentation

- **ARCHITECTURE.md** - Full architecture documentation
- **MIGRATION_GUIDE.md** - How to migrate custom code
- **REFACTORING_SUMMARY.md** - What changed and why
- **This file** - Quick start guide

---

## 🎓 Learning the New Structure

### Understanding Services
Each service provides a clean API for a specific concern:
- `FirebaseService` - All database operations
- `ExerciseService` - Exercise data management
- `UIService` - User interface updates
- `StorageService` - Browser storage
- `Logger` - Logging and debugging

### Understanding Modules
Each module handles a specific feature:
- `FormModule` - Multi-step form
- `ExerciseUploadManager` - Admin exercise management
- `ExerciseDisplay` - Public exercise list
- `ResponsesModule` - Response viewer

### Understanding Config
Configuration is centralized:
- `constants.js` - All constants
- `firebase.config.js` - Firebase setup
- `supabase.config.js` - Supabase setup

---

## ✨ You're Ready!

Your project is now organized and ready for development. 

**Start with**: Review `ARCHITECTURE.md` for detailed documentation.

**Questions?**: Check `MIGRATION_GUIDE.md` or browser console logs.

**Happy coding! 🚀**
