// seedWithOpenRules.js - Seed Firestore with open rules (no auth required)
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

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
const db = getFirestore(app);

// User profile to create (for the new user from logs)
const USER_PROFILE = {
  uid: "1vi3fjmvSaXsS7yj5bvRWVggfZh1",
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
  onboardingCompleted: false
};

// Sample workout data
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
    ]
  }
];

// Sample video data
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
    difficulty: 'beginner'
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
    difficulty: 'intermediate'
  }
];

async function seedFirestore() {
  try {
    console.log('🏀 Starting Firestore seeding with open rules...\n');

    // Create user profile
    console.log(`Creating user profile for ${USER_PROFILE.email}...`);
    await setDoc(doc(db, 'users', USER_PROFILE.uid), {
      ...USER_PROFILE,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ User profile created\n');

    // Add sample workouts
    console.log('Adding sample workouts...');
    for (const workout of SAMPLE_WORKOUTS) {
      await setDoc(doc(db, 'workouts', workout.id), {
        ...workout,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`  ✅ Added: ${workout.title}`);
    }
    console.log('');

    // Add sample videos
    console.log('Adding sample videos...');
    for (const video of SAMPLE_VIDEOS) {
      await setDoc(doc(db, 'videos', video.id), {
        ...video,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`  ✅ Added: ${video.title}`);
    }
    console.log('');

    console.log('🎉 Firestore seeding completed successfully!');
    console.log('\n📱 Next steps:');
    console.log('   1. Restart your app');
    console.log('   2. Sign in with j.maddox0503@gmail.com');
    console.log('   3. Your profile and sample data are ready!\n');
    console.log('⚠️  IMPORTANT: Remember to tighten security rules before production!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedFirestore();
