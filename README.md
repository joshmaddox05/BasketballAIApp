# Basketball AI Training App

React Native/Expo mobile application providing AI-powered basketball shot analysis and training guidance.

## Features

- Real-time shot recording with camera
- AI-powered form analysis using MediaPipe
- Visual shot breakdown with pose detection overlays
- Personalized coaching feedback in plain language
- Detailed biomechanical metrics and scoring
- Progress tracking and statistics
- Customized training plans
- Video library and drills

## Tech Stack

- **React Native** 0.81.4
- **Expo** SDK 54
- **Firebase** 12.4.0 - Authentication and Firestore
- **React Navigation** 7.x
- **expo-camera** - Video recording
- **expo-video** - Video playback

## Related Repositories

- **Backend API**: [BasketballAIAppApi](https://github.com/joshmaddox05/BasketballAIAppApi.git) - FastAPI backend for shot analysis
  - Deployed at: https://basketballaiappapi.onrender.com

## Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android emulator
- Firebase project with Authentication and Firestore enabled

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/BasketballAIApp.git
cd BasketballAIApp
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Download configuration files:
   - **iOS**: Download `GoogleService-Info.plist` to project root
   - **Android**: Download `google-services.json` to `android/app/`
5. Update `src/config/firebaseConfig.js` with your Firebase config

### 3. Backend Setup

The app requires the Basketball AI Backend to be running. Two options:

**Option A: Use Production Backend (Recommended)**

The app is preconfigured to use the production backend at:
```
https://basketballaiappapi.onrender.com
```

No additional setup needed.

**Option B: Run Backend Locally**

1. Clone the backend repository:
   ```bash
   git clone https://github.com/joshmaddox05/BasketballAIAppApi.git
   cd BasketballAIAppApi
   ```

2. Follow backend setup instructions in its README

3. Update `src/config/api.js` to point to local backend:
   ```javascript
   export const CONFIG = {
     API_BASE_URL: 'http://localhost:8000',
     isOfflineMode: false
   };
   ```

### 4. Firestore Security Rules

Deploy the included Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Or copy contents of `firestore.rules` to Firebase Console.

### 5. Run the App

```bash
# Start Expo dev server
npx expo start

# Run on specific platform
npx expo start --ios        # iOS Simulator
npx expo start --android    # Android Emulator
```

For physical device testing:
```bash
# iOS (requires Mac)
npx expo run:ios

# Android
npx expo run:android
```

## Project Structure

```
BasketballAIApp/
├── src/
│   ├── components/        # Reusable UI components
│   ├── config/           # Configuration files (Firebase, API)
│   ├── context/          # React Context (AppContext)
│   ├── navigation/       # Navigation setup
│   ├── screens/          # App screens
│   │   ├── auth/        # Login, Register, ForgotPassword
│   │   ├── onboarding/  # Welcome flow
│   │   └── shared/      # Shared screens (ShootingAnalysis, etc.)
│   ├── services/         # Business logic services
│   │   ├── authService.js
│   │   ├── firestoreService.js
│   │   └── aiAnalysisService.js
│   └── utils/            # Utility functions and theme
├── assets/               # Images, fonts, videos
├── ios/                  # iOS native code
├── android/              # Android native code
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── app.config.js         # Expo configuration
└── package.json          # Dependencies
```

**Note:** The backend API is maintained in a separate repository: [BasketballAIAppApi](https://github.com/joshmaddox05/BasketballAIAppApi.git)

## Key Services

### Authentication (`authService.js`)
- Email/password registration and login
- Google Sign-In support
- Password reset
- Profile management

### Firestore (`firestoreService.js`)
- User profiles
- Training sessions
- Goals and achievements
- Activity tracking

### AI Analysis (`aiAnalysisService.js`)
- Connects to backend API
- Shot form analysis
- Curry comparison
- Offline mode simulation

## Building for Production

### iOS

1. **Configure EAS Build**:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   ```

2. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

3. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

### Android

1. **Build for Android**:
   ```bash
   eas build --platform android
   ```

2. **Submit to Play Store**:
   ```bash
   eas submit --platform android
   ```

## Environment Variables

Create `.env` file (not tracked in git):

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:ios:abcdef
```

## Configuration

### API Configuration (`src/config/api.js`)

```javascript
export const CONFIG = {
  API_BASE_URL: 'https://basketballaiappapi.onrender.com',
  isOfflineMode: false,
  timeout: 600000 // 10 minutes
};
```

### Firebase Configuration (`src/config/firebaseConfig.js`)

Update with your Firebase project credentials.

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Clear Cache

```bash
npx expo start --clear
```

## Deployment Status

- **App**: Development build only (not yet in App Store/Play Store)
- **Backend**: Deployed on Render at https://basketballaiappapi.onrender.com
- **Database**: Firebase Firestore (production)
- **Auth**: Firebase Authentication (production)

## Troubleshooting

### "Cannot connect to backend"

1. Check backend is running (visit health check: https://basketballaiappapi.onrender.com/health)
2. Verify API_BASE_URL in `src/config/api.js`
3. Check internet connection
4. Try enabling offline mode temporarily

### "Permission denied" in Firestore

1. Ensure you're logged in
2. Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
3. Verify user has correct permissions in rules

### iOS Build Errors

1. Delete `ios/Pods` and `ios/Podfile.lock`
2. Run `npx expo prebuild --clean`
3. Try `cd ios && pod install`

### Android Build Errors

1. Check `android/app/google-services.json` exists
2. Sync Gradle: `cd android && ./gradlew clean`
3. Rebuild: `npx expo run:android`

## Features Roadmap

- [ ] Social features (share shots, challenges)
- [ ] Leaderboards and competitions
- [ ] Advanced drills library
- [ ] Workout plan builder
- [ ] Apple Watch integration
- [ ] Offline video analysis
- [ ] Multi-language support

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file

## Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/YOUR_USERNAME/BasketballAIApp/issues)
- Email: jmaddox0503@example.com

## Acknowledgments

- Firebase for backend services
- Expo for React Native tooling
- MediaPipe (backend) for pose detection
- Basketball community for feedback
