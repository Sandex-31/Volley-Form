# Firebase Storage Setup Guide

## Overview
This project uses Firebase Storage to store exercise training videos. Videos are organized in the structure: `videos/[exercise-name]/[filename]`

## Step 1: Enable Firebase Storage in Firebase Console

1. Go to **[Firebase Console](https://console.firebase.google.com)**
2. Select your project: **"volleyball-exercises-9fd18"**
3. In the left sidebar, go to **Storage**
4. Click **Get Started**
5. Choose storage location (keep default or select Europe: **europe-west1**)
6. Click **Done**

## Step 2: Configure Security Rules

After enabling Storage, go to the **Rules** tab and replace the default rules with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read videos
    match /videos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                   request.resource.size <= 104857600 && // 100 MB
                   request.resource.contentType.matches('video/mp4');
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

⚠️ **Important**: These rules require user authentication. For public read access, modify as needed:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read, authenticated write
    match /videos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                   request.resource.size <= 104857600 && // 100 MB
                   request.resource.contentType.matches('video/mp4');
    }
    
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish** to apply the rules

## Step 3: Configure Firebase Authentication (for Admin)

For the admin upload feature to work properly:

1. Go to **Authentication** in Firebase Console
2. Click **Get Started**
3. Enable **Anonymous** authentication:
   - Click **Anonymous**
   - Toggle **Enable**
   - Click **Save**

This allows the app to work offline and locally while still syncing to Firebase when available.

## File Structure in Storage

```
gs://volleyball-exercises-9fd18.appspot.com/
└── videos/
    ├── Warm-up (giri di campo)/
    │   └── warmup_2026.mp4
    ├── Difesa (1, 6, 5 con 2 schiacciatori)/
    │   └── defense_drills.mp4
    └── ... (one folder per exercise)
```

## How It Works

### Upload Flow
1. **Admin Login** → Enter password (admin123)
2. **Edit Exercise** → Click "Edit" on any exercise
3. **Add Description** → Write exercise description
4. **Upload Video** → Select MP4 file (max 100 MB)
5. **Save & Upload** → Sends to Firebase Storage and saves URL to database

### Storage URL Structure
- **Path**: `videos/{exerciseName}/{filename}`
- **Download URL**: `https://firebasestorage.googleapis.com/v0/b/volleyball-exercises-9fd18.appspot.com/o/videos%2F{exerciseName}%2F{filename}?alt=media&token={token}`
- The app automatically handles URL generation and retrieval

### Database Structure
Exercises are stored in the database with this structure:

```json
{
  "selectedExercises": [
    {
      "name": "Warm-up (giri di campo)",
      "description": "Light warm-up running around the court...",
      "videoUrl": "https://firebasestorage.googleapis.com/..."
    },
    {
      "name": "Difesa (1, 6, 5 con 2 schiacciatori)",
      "description": "Defense drill focusing on positioning...",
      "videoUrl": "https://firebasestorage.googleapis.com/..."
    }
  ]
}
```

## Troubleshooting

### Upload Button Disabled
- Make sure you're logged in as admin
- Check browser console for Firebase errors
- Verify Firebase Storage is enabled in console

### Videos Not Playing
- Check if video URL is correct in database
- Verify Firebase Storage rules allow read access
- Try uploading a test video with a simpler name

### "File too large" Error
- Video must be under 100 MB
- Compress video before uploading:
  ```bash
  ffmpeg -i input.mp4 -vcodec libx264 -crf 28 output.mp4
  ```

### Storage Rules Issues
- If you see "Permission denied" errors, update rules
- Make sure to click **Publish** after editing rules
- Check that rules allow the contentType 'video/mp4'

## Admin Credentials

- **Admin Panel Password**: `admin123`
- **Location**: Click "👨‍💼 Admin Panel" on public-exercises.html
- **Upload Page**: Click "📹 Upload Videos & Descriptions" in Admin Panel

## Security Notes

⚠️ **Important**: 
- Change `admin123` password in both `public-exercises.js` and `upload-exercises.js`
- Consider implementing proper authentication instead of hardcoded password
- Storage rules should prevent direct access to delete/modify videos without authentication
- Use environment variables for sensitive data in production

## Video Recommendations

For best performance and user experience:

- **Resolution**: 1920x1080 (Full HD) or 1280x720 (HD)
- **Orientation**: Landscape (16:9)
- **Format**: MP4 with H.264 codec
- **Bitrate**: 2-5 Mbps
- **Duration**: 30 seconds to 5 minutes per exercise
- **File Size**: 10-50 MB per video (after compression)

## Compression Example

```bash
# Compress video while maintaining quality
ffmpeg -i input.mp4 -vcodec libx264 -crf 25 -preset medium output.mp4

# Parameters:
# -crf 25: Quality (0-51, lower=better, default 28)
# -preset: medium (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
```

## Testing the Setup

1. Go to `upload-exercises.html`
2. Login with password: `admin123`
3. Click "Edit" on any exercise
4. Add a description
5. Upload a small test video
6. Check Firebase Console → Storage to verify upload
7. Go back to `public-exercises.html` and expand an exercise to verify video plays

---

For more help, consult:
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Firebase Security Rules](https://firebase.google.com/docs/storage/security)
