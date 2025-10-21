# Firebase Security Rules Setup Guide

## Problem
Your app is getting "Missing or insufficient permissions" errors because Firestore security rules are blocking all operations by default.

## Solution
You need to deploy the security rules to your Firebase project. Here are the steps:

### Method 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your existing project: `basketball-ai-app-db000`
   - Choose to use the existing `firestore.rules` file
   - Choose to use the existing `firestore.indexes.json` file

4. **Deploy the security rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Method 2: Using Firebase Console (Alternative)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `basketball-ai-app-db000`
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with the content from `firestore.rules` file
5. Click **Publish**

### Method 3: Quick Test Rules (Temporary - NOT for production)

If you want to test quickly, you can temporarily use these open rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ WARNING: These rules allow anyone to read/write your database. Only use for testing!**

## What the Security Rules Do

The provided `firestore.rules` file:

1. **User Data Protection**: Users can only access their own user documents and subcollections
2. **Global Content Access**: Authenticated users can read workouts and videos
3. **Community Features**: Users can create and manage their own community posts
4. **Authentication Required**: All operations require user authentication

## Testing the Fix

After deploying the rules:

1. Restart your app
2. Try to sign up or sign in
3. The permission errors should be resolved

## Next Steps

1. Deploy the security rules using one of the methods above
2. Test your authentication flow
3. If you need to modify the rules later, update the `firestore.rules` file and redeploy

## Troubleshooting

- If you still get permission errors, check that the rules were deployed successfully
- Make sure your Firebase project ID matches: `basketball-ai-app-db000`
- Verify that users are properly authenticated before accessing Firestore
