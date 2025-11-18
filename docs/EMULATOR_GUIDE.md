# Firebase Emulator Development Guide

## 🎉 Your App Now Uses Firebase Emulators!

All Firebase operations (Auth & Firestore) now run locally on your machine during development. This eliminates permission issues and makes development faster and more reliable.

## Quick Start

### Starting the Emulators

```bash
# Start Auth and Firestore emulators
firebase emulators:start --only auth,firestore
```

The emulators will start on:
- **Auth**: http://127.0.0.1:9099
- **Firestore**: http://127.0.0.1:8080
- **UI Dashboard**: http://127.0.0.1:4000

### Seeding Test Data

After starting the emulators, seed them with test data:

```bash
node scripts/seedEmulator.js
```

This creates:
- Test user: `j.maddox0503@gmail.com` (password: `testpassword123`)
- User profile with default settings
- 3 sample workouts
- 3 sample videos

### Running Your App

```bash
# Start your Expo dev server
npm start
# or
expo start
```

The app will automatically connect to the emulators in development mode (when `__DEV__` is true).

## Test Credentials

**Email**: `j.maddox0503@gmail.com`
**Password**: `testpassword123`

You can use these credentials to sign in and test your app.

## Emulator UI Dashboard

Open http://127.0.0.1:4000 in your browser to:
- 👤 View all authenticated users
- 📊 Browse Firestore collections
- ✏️ Manually edit documents
- 🔍 See real-time changes as you use the app
- 📈 Monitor emulator performance

## How It Works

### Automatic Connection

Your app is configured to automatically use emulators in development mode. Check `src/config/firebaseConfig.js`:

```javascript
if (__DEV__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('🔥 Connected to Firebase Emulators');
}
```

### Production vs Development

- **Development** (`__DEV__ = true`): Uses local emulators
- **Production** (`__DEV__ = false`): Uses real Firebase services

## Common Tasks

### Adding More Test Users

Edit `scripts/seedEmulator.js` and add users to the seed script, or use the Emulator UI to manually create users.

### Resetting Data

Just restart the emulators - data is ephemeral and doesn't persist between sessions.

```bash
# Stop emulators (Ctrl+C)
# Start again
firebase emulators:start --only auth,firestore
# Re-seed if needed
node scripts/seedEmulator.js
```

### Adding Sample Data

Edit `scripts/seedEmulator.js` to add more workouts, videos, or other collections.

### Persistent Data (Optional)

If you want data to persist between emulator sessions:

```bash
# Export data
firebase emulators:export ./emulator-data

# Start with imported data
firebase emulators:start --only auth,firestore --import=./emulator-data
```

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Kill processes on emulator ports
lsof -ti:8080 | xargs kill
lsof -ti:9099 | xargs kill
lsof -ti:4000 | xargs kill

# Then restart emulators
firebase emulators:start --only auth,firestore
```

### App Not Connecting to Emulators

1. Make sure emulators are running
2. Check console for "🔥 Connected to Firebase Emulators" message
3. Verify `__DEV__` is true (it should be in Expo dev mode)
4. Restart your app

### Can't Sign In

1. Make sure you've run `node scripts/seedEmulator.js`
2. Check Emulator UI (http://127.0.0.1:4000) to verify user exists
3. Try creating a new user via the app's registration flow

## Benefits of Emulator Development

✅ **No Permission Issues** - Everything runs with your local rules
✅ **Instant Feedback** - No network delays or propagation time
✅ **Free** - Doesn't count against Firebase quotas
✅ **Offline** - Works without internet connection
✅ **Fast Iteration** - Reset and test instantly
✅ **Safe** - Can't accidentally mess up production data
✅ **Debugging** - View all data in real-time via UI

## When to Use Production Firebase

Only use production Firebase when:
- Testing on a real device outside your network
- Testing production-specific features (Cloud Functions, etc.)
- Preparing for release
- Demonstrating to stakeholders

To use production Firebase, set `__DEV__` to `false` or build a production version of your app.

## Before Production Deployment

Before deploying to production:

1. **Tighten Security Rules** - Replace `allow read, write: if true` with proper auth checks
2. **Test with Production** - Test with real Firebase to ensure everything works
3. **Update Environment** - Use environment variables for Firebase config
4. **Enable Monitoring** - Set up Firebase Analytics and Crashlytics
5. **Set Up CI/CD** - Automate testing with emulators in CI pipeline

## Scripts Reference

### Start Emulators
```bash
firebase emulators:start --only auth,firestore
```

### Start with UI
```bash
firebase emulators:start --only auth,firestore,ui
```

### Start in Background
```bash
firebase emulators:exec --only auth,firestore "npm start"
```

### Seed Data
```bash
node scripts/seedEmulator.js
```

### Export Data
```bash
firebase emulators:export ./emulator-data
```

### Import Data
```bash
firebase emulators:start --import=./emulator-data --export-on-exit
```

## Package.json Scripts (Recommended)

Add these to your `package.json`:

```json
{
  "scripts": {
    "emulators": "firebase emulators:start --only auth,firestore",
    "emulators:seed": "node scripts/seedEmulator.js",
    "dev": "firebase emulators:exec --only auth,firestore 'expo start'",
    "dev:seed": "npm run emulators:seed && expo start"
  }
}
```

Then you can run:
```bash
npm run emulators        # Start emulators
npm run emulators:seed   # Seed data
npm run dev              # Start emulators + app together
```

---

**Happy coding!** 🏀 You now have a robust local development environment that eliminates all those frustrating Firebase permission issues.
