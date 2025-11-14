// seedEmulator.js - Seed Firebase Emulator with data
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, doc, setDoc, connectFirestoreEmulator } = require('firebase/firestore');

// Firebase configuration (same as app)
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

// Connect to emulators
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

console.log('🔥 Connected to Firebase Emulators\n');

// Test user credentials
const TEST_USER = {
  email: 'j.maddox0503@gmail.com',
  password: 'testpassword123',
  displayName: 'Josh M'
};

// Sample data
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
    ],
    createdAt: new Date(),
    updatedAt: new Date()
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
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'workout-intermediate-shooting',
    title: 'Advanced Shooting',
    description: 'Take your shooting to the next level',
    category: 'shooting',
    level: 'intermediate',
    duration: 45,
    featured: false,
    exercises: [
      { name: '3-Point Shots', sets: 5, reps: 10, rest: 90 },
      { name: 'Off-Dribble Shooting', sets: 4, reps: 12, rest: 90 },
      { name: 'Game Speed Shooting', sets: 3, reps: 15, rest: 120 }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
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
    difficulty: 'beginner',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'video-dribbling-basics',
    title: 'Ball Handling Fundamentals',
    description: 'Master the basic dribbling techniques',
    category: 'dribbling',
    duration: 360,
    thumbnailUrl: 'https://via.placeholder.com/640x360?text=Ball+Handling',
    videoUrl: 'https://www.example.com/videos/dribbling-basics',
    instructor: 'Coach Sarah',
    difficulty: 'beginner',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'video-defense-techniques',
    title: 'Defensive Stance and Movement',
    description: 'Learn proper defensive positioning',
    category: 'defense',
    duration: 420,
    thumbnailUrl: 'https://via.placeholder.com/640x360?text=Defense',
    videoUrl: 'https://www.example.com/videos/defense',
    instructor: 'Coach Mike',
    difficulty: 'intermediate',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedEmulator() {
  try {
    console.log('📝 Creating test user...');

    let user;
    try {
      // Try to create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        TEST_USER.email,
        TEST_USER.password
      );
      user = userCredential.user;
      console.log(`✅ User created: ${TEST_USER.email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        // User exists, sign in instead
        const userCredential = await signInWithEmailAndPassword(
          auth,
          TEST_USER.email,
          TEST_USER.password
        );
        user = userCredential.user;
        console.log(`✅ User already exists, signed in: ${TEST_USER.email}`);
      } else {
        throw error;
      }
    }

    // Create user profile
    console.log('\n📝 Creating user profile...');
    const userProfile = {
      uid: user.uid,
      email: user.email,
      displayName: TEST_USER.displayName,
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
      createdAt: new Date(),
      lastLoginAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log(`✅ Profile created for UID: ${user.uid}\n`);

    // Add sample workouts
    console.log('📚 Adding sample workouts...');
    for (const workout of SAMPLE_WORKOUTS) {
      await setDoc(doc(db, 'workouts', workout.id), workout);
      console.log(`  ✅ ${workout.title}`);
    }

    // Add sample videos
    console.log('\n🎥 Adding sample videos...');
    for (const video of SAMPLE_VIDEOS) {
      await setDoc(doc(db, 'videos', video.id), video);
      console.log(`  ✅ ${video.title}`);
    }

    console.log('\n🎉 Emulator seeding complete!');
    console.log('\n📱 Test Credentials:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log('\n🌐 Emulator UI: http://127.0.0.1:4000\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding emulator:', error);
    process.exit(1);
  }
}

// Run the seeding
seedEmulator();
