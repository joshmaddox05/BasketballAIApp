// Test script to verify Firestore permissions
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDU-rpHFZ5ZBcuzdKDeOcbfWtVgKqtB3pc",
  authDomain: "basketball-ai-app-db000.firebaseapp.com",
  projectId: "basketball-ai-app-db000",
  storageBucket: "basketball-ai-app-db000.firebasestorage.app",
  messagingSenderId: "764475749989",
  appId: "1:764475749989:android:d28067f69117b1a8aaf88c",
  measurementId: "509606001"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testFirestorePermissions() {
  console.log('🧪 Testing Firestore permissions...');
  
  try {
    // Test 1: Try to read workouts without authentication
    console.log('\n1. Testing read workouts without auth...');
    try {
      const workoutsSnapshot = await getDocs(collection(db, 'workouts'));
      console.log('❌ Should have failed - workouts readable without auth');
    } catch (error) {
      console.log('✅ Correctly blocked - workouts require auth:', error.code);
    }
    
    // Test 2: Try to read workouts with authentication
    console.log('\n2. Testing read workouts with auth...');
    try {
      // Sign in with a test account (you'll need to create this)
      const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'testpassword');
      console.log('✅ Signed in successfully');
      
      const workoutsSnapshot = await getDocs(collection(db, 'workouts'));
      console.log('✅ Workouts readable with auth:', workoutsSnapshot.docs.length, 'workouts found');
      
      // Test 3: Try to create user profile
      console.log('\n3. Testing create user profile...');
      const userProfile = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: 'Test User',
        createdAt: new Date(),
        stats: { shooting: 0, dribbling: 0, physical: 0, streak: 0 },
        preferences: { theme: 'auto', notifications: true, units: 'imperial', language: 'en' },
        subscription: 'free',
        level: 'beginner',
        onboardingCompleted: false
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
      console.log('✅ User profile created successfully');
      
      // Test 4: Try to read user profile
      console.log('\n4. Testing read user profile...');
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        console.log('✅ User profile readable:', userDoc.data().displayName);
      } else {
        console.log('❌ User profile not found');
      }
      
    } catch (error) {
      console.log('❌ Auth test failed:', error.code, error.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error);
  }
}

// Run the test
testFirestorePermissions().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
