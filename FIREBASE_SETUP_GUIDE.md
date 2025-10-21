# Firebase Setup Guide - Basketball AI App

This guide will walk you through setting up Firebase for your Basketball AI App to make it production-ready for the App Store.

## Prerequisites

- Google account
- Firebase project access
- iOS and Android app bundle IDs
- Development environment set up

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter project name: `Basketball AI App` (or your preferred name)
4. **Enable Google Analytics** (recommended for production apps)
5. Select or create an Analytics account
6. Click **"Create project"**
7. Wait for project creation to complete

## Step 2: Add iOS App to Firebase

1. In your Firebase project dashboard, click the **iOS icon**
2. Enter your iOS bundle ID (found in `app.json`):
   ```
   com.yourcompany.basketballaiapp
   ```
3. App nickname: `Basketball AI iOS`
4. App Store ID: Leave blank for now (add later when published)
5. Click **"Register app"**
6. **Download `GoogleService-Info.plist`** - **SAVE THIS FILE SECURELY**
7. Click **"Next"** through the remaining steps
8. **Important**: Note the iOS URL scheme from the plist file (you'll need this later)

## Step 3: Add Android App to Firebase

1. Click the **Android icon** in Firebase Console
2. Enter Android package name (same as iOS bundle ID):
   ```
   com.yourcompany.basketballaiapp
   ```
3. App nickname: `Basketball AI Android`
4. Debug signing certificate SHA-1: Leave blank for now
5. Click **"Register app"**
6. **Download `google-services.json`** - **SAVE THIS FILE SECURELY**
7. Click **"Next"** through the remaining steps

## Step 4: Enable Authentication Methods

1. In Firebase Console, navigate to **Authentication** > **Sign-in method**
2. **Enable Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"
3. **Enable Google Sign-In**:
   - Click on "Google"
   - Toggle "Enable"
   - Select your project support email
   - Add the iOS URL scheme from step 2
   - Click "Save"
4. **Enable Apple Sign-In** (iOS only):
   - Click on "Apple"
   - Toggle "Enable"
   - Add your Apple Developer Team ID
   - Add your Apple Services ID
   - Click "Save"

## Step 5: Create Firestore Database

1. Navigate to **Firestore Database**
2. Click **"Create database"**
3. **Start in Production mode** (we'll configure rules)
4. Choose location: `us-central1` (or closest to your target users)
5. Click **"Enable"**

### Configure Firestore Security Rules

1. Go to **Firestore** > **Rules**
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
      
      // User's activities
      match /activities/{activityId} {
        allow read, write: if isOwner(userId);
      }
      
      // User's goals
      match /goals/{goalId} {
        allow read, write: if isOwner(userId);
      }
      
      // User's achievements
      match /achievements/{achievementId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // Workouts collection (read-only for users)
    match /workouts/{workoutId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only admins via backend
    }
    
    // Videos collection (read-only for users)
    match /videos/{videoId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only admins via backend
    }
    
    // Community posts (coming soon - structure ready)
    match /community/{postId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
      
      match /comments/{commentId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if isOwner(resource.data.userId);
      }
    }
  }
}
```

3. Click **"Publish"**

## Step 6: Enable Firebase Storage

1. Navigate to **Storage**
2. Click **"Get started"**
3. **Start in production mode**
4. Use the same location as Firestore
5. Click **"Next"**

### Configure Storage Security Rules

1. Go to **Storage** > **Rules**
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile images
    match /users/{userId}/profile/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Activity images
    match /users/{userId}/activities/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

3. Click **"Publish"**

## Step 7: Set Up Firebase Billing

1. Navigate to **Project Settings** > **Usage and billing**
2. Click **"Modify plan"**
3. **Upgrade to Blaze (Pay as you go) plan**
4. Add payment method
5. **Set budget alerts**:
   - $25/month
   - $50/month
   - $100/month
6. Click **"Purchase"**

## Step 8: Configure App Check (Security)

1. Navigate to **App Check**
2. **Register iOS app**:
   - Click "iOS"
   - Select your iOS app
   - Choose "App Attest" provider
   - Click "Save"
3. **Register Android app**:
   - Click "Android"
   - Select your Android app
   - Choose "Play Integrity" provider
   - Click "Save"
4. **Enable enforcement**:
   - Toggle "Enforce" for Firestore
   - Toggle "Enforce" for Storage

## Step 9: Set Up Firebase Cloud Messaging

1. Navigate to **Cloud Messaging**
2. **Generate APNs key** (iOS):
   - Go to Apple Developer Console
   - Create new APNs key
   - Upload to Firebase Console
3. **Add FCM server key** (Android):
   - Copy server key from Project Settings
   - Use in your backend for sending notifications

## Step 10: Configure Firebase Analytics

1. Navigate to **Analytics** > **Events**
2. **Enable automatic collection**:
   - Toggle on for all events
3. **Set up custom events** (optional):
   - Workout completions
   - Video views
   - Feature usage

## Step 11: Set Up Firebase Remote Config

1. Navigate to **Remote Config**
2. **Add default values**:
   ```json
   {
     "community_enabled": false,
     "premium_features_enabled": true,
     "maintenance_mode": false,
     "app_version_required": "1.0.0",
     "new_features": {
       "ai_analysis": true,
       "video_bookmarks": true,
       "workout_timer": true
     }
   }
   ```
3. Click **"Publish changes"**

## Step 12: Set Up Firebase Performance Monitoring

1. Navigate to **Performance**
2. **Enable automatic collection**
3. **Set up custom traces** (optional):
   - App startup time
   - Screen load times
   - API response times

## Step 13: Add Configuration Files to Your Project

### For iOS:
1. Add `GoogleService-Info.plist` to your iOS project
2. Add to Xcode project (drag and drop)
3. Ensure it's added to the app target

### For Android:
1. Add `google-services.json` to `android/app/` directory
2. The file will be automatically detected by the build system

## Step 14: Update Your App Configuration

1. **Update `firebaseConfig.js`** with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-actual-api-key",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id",
     measurementId: "your-measurement-id"
   };
   ```

2. **Update iOS URL scheme** in `app.json`:
   ```json
   {
     "expo": {
       "scheme": "your-reversed-client-id"
     }
   }
   ```

## Step 15: Test Your Setup

1. **Test Authentication**:
   - Try email/password signup
   - Try Google sign-in
   - Try Apple sign-in (iOS)

2. **Test Firestore**:
   - Create user profile
   - Add activities
   - Add goals

3. **Test Storage**:
   - Upload profile image
   - Upload activity photos

4. **Test Remote Config**:
   - Fetch feature flags
   - Verify community features are disabled

## Step 16: Production Checklist

- [ ] All authentication methods working
- [ ] Firestore rules properly configured
- [ ] Storage rules properly configured
- [ ] App Check enabled
- [ ] Billing set up with budget alerts
- [ ] Analytics tracking working
- [ ] Remote Config working
- [ ] Performance monitoring enabled
- [ ] Push notifications working
- [ ] All configuration files added
- [ ] Security rules tested
- [ ] Error handling implemented

## Step 17: Monitoring and Maintenance

1. **Set up monitoring**:
   - Check Firebase Console daily
   - Monitor usage and costs
   - Review error logs

2. **Regular maintenance**:
   - Update security rules as needed
   - Monitor user feedback
   - Optimize database queries
   - Update Remote Config values

## Estimated Costs

**Free Tier (Spark Plan)**:
- Authentication: 50,000 users/month
- Firestore: 50K reads, 20K writes, 20K deletes/day
- Storage: 5GB
- Hosting: 10GB transfer/month

**Paid Tier (Blaze Plan)** - Expected costs:
- 1,000 active users: $5-15/month
- 10,000 active users: $50-150/month
- Set budget alerts to monitor spending

## Support and Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Support](https://firebase.google.com/support)
- [Firebase Community](https://firebase.community)

## Security Best Practices

1. **Never commit** `GoogleService-Info.plist` or `google-services.json` to public repositories
2. **Use environment variables** for sensitive configuration
3. **Regularly review** security rules
4. **Enable App Check** for production
5. **Monitor** for suspicious activity
6. **Keep** Firebase SDKs updated
7. **Use** Firebase Security Rules testing
8. **Implement** proper error handling

## Troubleshooting

### Common Issues:

1. **Authentication not working**:
   - Check bundle ID matches
   - Verify URL schemes
   - Check API keys

2. **Firestore permission denied**:
   - Review security rules
   - Check user authentication
   - Verify data structure

3. **Storage upload fails**:
   - Check file size limits
   - Verify content types
   - Review storage rules

4. **Push notifications not working**:
   - Check APNs configuration
   - Verify device tokens
   - Review FCM setup

### Getting Help:

1. Check Firebase Console for error logs
2. Review Firebase documentation
3. Check Stack Overflow for common issues
4. Contact Firebase support for critical issues

---

**Important**: Keep your Firebase configuration files secure and never commit them to public repositories. Use environment variables or secure configuration management for production deployments.

This setup will make your Basketball AI App production-ready with proper authentication, data persistence, and scalable infrastructure for the App Store.
