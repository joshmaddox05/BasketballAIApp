// Test if the user GDiWhVw8LVcQmBKXRBZtIRHWRhE3 has a profile in Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDU-rpHFZ5ZBcuzdKDeOcbfWtVgKqtB3pc",
  authDomain: "basketball-ai-app-db000.firebaseapp.com",
  projectId: "basketball-ai-app-db000",
  storageBucket: "basketball-ai-app-db000.firebasestorage.app",
  messagingSenderId: "764475749989",
  appId: "1:764475749989:android:d28067f69117b1a8aaf88c",
  measurementId: "509606001"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uid = 'GDiWhVw8LVcQmBKXRBZtIRHWRhE3';

async function checkUser() {
  try {
    console.log(`\n🔍 Checking if user ${uid} has a profile...\n`);
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      console.log('✅ User profile EXISTS in Firestore');
      console.log('\n📄 Profile data:');
      console.log(JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log('❌ User profile DOES NOT EXIST in Firestore');
      console.log('\n💡 Solution: The user needs to:');
      console.log('   1. Delete their account from Firebase Console > Authentication');
      console.log('   2. Re-register in the app to create the profile');
      console.log('\n   OR manually create the profile using Firebase Console');
    }
  } catch (error) {
    console.error('❌ Error checking user:', error.message);
  }
  
  process.exit(0);
}

checkUser();
