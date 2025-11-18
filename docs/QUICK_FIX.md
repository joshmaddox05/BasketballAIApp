# Quick Fix: Create User Profile Manually

## The Problem
Firebase security rules aren't being recognized by your iOS app, even though they're set to `allow read, write: if true`. This is a known issue with React Native + Firebase iOS SDK when there's dual initialization (JavaScript SDK + Native iOS SDK).

## Quick Solution: Create Profile Manually

### Step 1: Create Your Profile in Firebase Console

1. Go to: https://console.firebase.google.com/project/basketball-ai-app-db000/firestore
2. Click **"Start collection"**
3. Collection ID: `users`
4. Document ID: `jQzs3mNDBIPoj09paT0qJhZRSPz2`
5. Add these fields:

```
uid: "jQzs3mNDBIPoj09paT0qJhZRSPz2" (string)
email: "j.maddox0503@gmail.com" (string)
displayName: "Josh M" (string)
photoURL: null
emailVerified: false (boolean)
subscription: "free" (string)
level: "beginner" (string)
onboardingCompleted: false (boolean)
createdAt: [Click "Current timestamp"]
lastLoginAt: [Click "Current timestamp"]
updatedAt: [Click "Current timestamp"]

stats: (map)
  └─ shooting: 0 (number)
  └─ dribbling: 0 (number)
  └─ physical: 0 (number)
  └─ streak: 0 (number)

preferences: (map)
  └─ theme: "auto" (string)
  └─ notifications: true (boolean)
  └─ units: "imperial" (string)
  └─ language: "en" (string)
```

6. Click **"Save"**

### Step 2: Add Sample Workouts

1. Create collection: `workouts`
2. Document ID: `workout-beginner-shooting`
3. Fields:
```
title: "Beginner Shooting Drills" (string)
description: "Build your shooting foundation" (string)
category: "shooting" (string)
level: "beginner" (string)
duration: 30 (number)
featured: true (boolean)
createdAt: [Current timestamp]
```

### Step 3: Add Sample Videos

1. Create collection: `videos`
2. Document ID: `video-shooting-form`
3. Fields:
```
title: "Perfect Shooting Form" (string)
description: "Learn the mechanics of a perfect shot" (string)
category: "shooting" (string)
duration: 480 (number)
instructor: "Coach Mike" (string)
difficulty: "beginner" (string)
createdAt: [Current timestamp]
```

### Step 4: Restart Your App

After creating these manually, restart your app - it should work!

## Better Solution: Use Firebase Emulator (Recommended)

This is the BEST solution for development - it runs Firebase locally and avoids all these auth/rules issues.

### Setup Firebase Emulator:

```bash
# Install firebase-tools if not already installed
npm install -g firebase-tools

# Initialize emulators
firebase init emulators
# Select: Firestore, Authentication
# Accept default ports

# Start emulators
firebase emulators:start
```

### Update firebaseConfig.js to use emulator:

Add this to your `src/config/firebaseConfig.js` after initialization:

```javascript
// After the db initialization, add:
if (__DEV__) {
  const { connectAuthEmulator } = require('firebase/auth');
  const { connectFirestoreEmulator } = require('firebase/firestore');

  // Connect to emulators in development
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  console.log('🔥 Using Firebase Emulators');
}
```

Benefits:
- ✅ No auth/rules propagation issues
- ✅ Instant feedback
- ✅ Free - no Firebase quota usage
- ✅ Can reset data easily
- ✅ Works offline

## Root Cause Analysis

The issue is that your iOS app has:
1. **Native iOS Firebase SDK** (from GoogleService-Info.plist)
2. **JavaScript Firebase SDK** (from firebaseConfig.js)

When both initialize, auth tokens might not sync properly between them, causing permission errors even with open rules.

## Long-term Fix (Before Production)

1. **Use Firebase Emulator for development** (best approach)
2. **Or** ensure only ONE SDK initializes:
   - Remove GoogleService-Info.plist (only use JS SDK)
   - Or use native Firebase modules that bridge properly

3. **Tighten security rules** before production
4. **Use Cloud Functions** for admin operations
5. **Set up proper monitoring**

---

**Try the manual creation first**, then set up emulators for smoother development!
