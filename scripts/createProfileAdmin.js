// createProfileAdmin.js - Use Firebase Admin SDK to create profile
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'basketball-ai-app-db000'
  });
}

const db = admin.firestore();

const USER_PROFILE = {
  uid: "jQzs3mNDBIPoj09paT0qJhZRSPz2",
  email: "j.maddox0503@gmail.com",
  displayName: "Josh M",
  photoURL: null,
  emailVerified: false,
  stats: {
    shooting: 0,
    dribbling: 0,
    physical: 0,
    streak: 0
  },
  preferences: {
    theme: 'auto',
    notifications: true,
    units: 'imperial',
    language: 'en'
  },
  subscription: 'free',
  level: 'beginner',
  onboardingCompleted: false,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

async function createProfile() {
  try {
    console.log('Creating user profile with Admin SDK...');
    await db.collection('users').doc(USER_PROFILE.uid).set(USER_PROFILE);
    console.log('✅ Profile created successfully!');

    // Verify it exists
    const doc = await db.collection('users').doc(USER_PROFILE.uid).get();
    console.log('✅ Profile verified:', doc.exists);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createProfile();
