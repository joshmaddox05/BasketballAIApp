// setup-firebase-configs.js - Help set up Firebase configuration files
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔥 Firebase Configuration Setup');
console.log('===============================');

// Check iOS GoogleService-Info.plist
const iosConfigPath = './ios/GoogleService-Info.plist';
if (fs.existsSync(iosConfigPath)) {
  console.log('✅ iOS GoogleService-Info.plist found');
  
  // Read and validate the plist
  const plistContent = fs.readFileSync(iosConfigPath, 'utf8');
  if (plistContent.includes('basketball-ai-app-db000')) {
    console.log('✅ iOS config contains correct project ID');
  } else {
    console.log('⚠️  iOS config may not be for the correct project');
  }
} else {
  console.log('❌ iOS GoogleService-Info.plist not found');
  console.log('   Download it from: https://console.firebase.google.com/project/basketball-ai-app-db000/settings/general');
  console.log('   Place it at: ios/GoogleService-Info.plist');
}

// Check Android google-services.json
const androidConfigPath = './android/app/google-services.json';
if (fs.existsSync(androidConfigPath)) {
  console.log('✅ Android google-services.json found');
  
  // Read and validate the JSON
  const jsonContent = JSON.parse(fs.readFileSync(androidConfigPath, 'utf8'));
  if (jsonContent.project_info && jsonContent.project_info.project_id === 'basketball-ai-app-db000') {
    console.log('✅ Android config contains correct project ID');
  } else {
    console.log('⚠️  Android config may not be for the correct project');
  }
} else {
  console.log('❌ Android google-services.json not found');
  console.log('   Download it from: https://console.firebase.google.com/project/basketball-ai-app-db000/settings/general');
  console.log('   Place it at: android/app/google-services.json');
}

// Create android directory structure if it doesn't exist
const androidDir = './android/app';
if (!fs.existsSync(androidDir)) {
  console.log('📁 Creating Android directory structure...');
  fs.mkdirSync(androidDir, { recursive: true });
  console.log('✅ Created android/app/ directory');
}

console.log('');
console.log('📋 Next Steps:');
console.log('1. Download google-services.json from Firebase Console');
console.log('2. Place it at: android/app/google-services.json');
console.log('3. Run: eas build --profile development --platform ios');
console.log('');
console.log('🔗 Firebase Console: https://console.firebase.google.com/project/basketball-ai-app-db000/settings/general');
