// createUserProfile.js - Script to create missing user profile with authentication
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const readline = require('readline');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDcDAGYFdLFZOOo7snvbfSBdknH89LmQ_8",
  authDomain: "basketball-ai-app-db000.firebaseapp.com",
  projectId: "basketball-ai-app-db000",
  storageBucket: "basketball-ai-app-db000.firebasestorage.app",
  messagingSenderId: "764475749989",
  appId: "1:764475749989:web:9540a3e383dcb30daaf88c",
  measurementId: "G-R48NZXG8YP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sample workout and video data
const SAMPLE_WORKOUTS = [
  {
    id: 'workout-beginner-shooting',
    title: 'Beginner Shooting Drills',
    description: 'Build your shooting foundation with these essential drills',
    category: 'shooting',
    level: 'beginner',
    duration: 30,
    featured: true,
    exercises: [
      { name: 'Form Shooting', sets: 3, reps: 10, rest: 60 },
      { name: 'Free Throws', sets: 3, reps: 10, rest: 60 },
      { name: 'Mid-Range Shots', sets: 3, reps: 15, rest: 90 }
    ]
  },
  {
    id: 'workout-beginner-dribbling',
    title: 'Ball Handling Basics',
    description: 'Master the fundamentals of dribbling and ball control',
    category: 'dribbling',
    level: 'beginner',
    duration: 25,
    featured: true,
    exercises: [
      { name: 'Stationary Dribbling', sets: 3, duration: 60, rest: 30 },
      { name: 'Figure 8s', sets: 3, reps: 20, rest: 45 },
      { name: 'Crossovers', sets: 3, reps: 15, rest: 60 }
    ]
  }
];

const SAMPLE_VIDEOS = [
  {
    id: 'video-shooting-form',
    title: 'Perfect Shooting Form',
    description: 'Learn the mechanics of a perfect basketball shot',
    category: 'shooting',
    duration: 480,
    thumbnailUrl: 'https://via.placeholder.com/640x360?text=Shooting+Form',
    videoUrl: 'https://www.example.com/videos/shooting-form',
    instructor: 'Coach Mike',
    difficulty: 'beginner'
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createUserProfile() {
  try {
    console.log('🏀 Basketball AI - User Profile Creator\n');

    // Get credentials
    const email = await question('Enter your email: ');
    const password = await question('Enter your password: ');

    console.log('\n🔐 Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log(`✅ Signed in as ${user.email} (UID: ${user.uid})\n`);

    // Create user profile
    console.log('📝 Creating user profile...');
    const userProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || email.split('@')[0],
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified,
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
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log('✅ User profile created!\n');

    // Add sample workouts
    console.log('📚 Adding sample workouts...');
    for (const workout of SAMPLE_WORKOUTS) {
      await setDoc(doc(db, 'workouts', workout.id), {
        ...workout,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`  ✅ ${workout.title}`);
    }

    // Add sample videos
    console.log('\n🎥 Adding sample videos...');
    for (const video of SAMPLE_VIDEOS) {
      await setDoc(doc(db, 'videos', video.id), {
        ...video,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`  ✅ ${video.title}`);
    }

    console.log('\n🎉 Setup complete! You can now restart your app.');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

createUserProfile();
