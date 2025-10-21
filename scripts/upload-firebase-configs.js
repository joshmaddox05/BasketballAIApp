// upload-firebase-configs.js - Upload Firebase config files to EAS as environment variables
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔥 Uploading Firebase Config Files to EAS');
console.log('=========================================');

// Check if files exist
const iosConfigPath = './ios/GoogleService-Info.plist';
const androidConfigPath = './android/app/google-services.json';

if (!fs.existsSync(iosConfigPath)) {
  console.error('❌ iOS GoogleService-Info.plist not found at:', iosConfigPath);
  process.exit(1);
}

if (!fs.existsSync(androidConfigPath)) {
  console.error('❌ Android google-services.json not found at:', androidConfigPath);
  process.exit(1);
}

console.log('✅ Both Firebase config files found');

try {
  // Upload iOS GoogleService-Info.plist
  console.log('📱 Uploading iOS GoogleService-Info.plist...');
  execSync(`eas env:create --name GOOGLE_SERVICES_PLIST --value @${iosConfigPath} --environment development --visibility secret`, { stdio: 'inherit' });
  execSync(`eas env:create --name GOOGLE_SERVICES_PLIST --value @${iosConfigPath} --environment preview --visibility secret`, { stdio: 'inherit' });
  execSync(`eas env:create --name GOOGLE_SERVICES_PLIST --value @${iosConfigPath} --environment production --visibility secret`, { stdio: 'inherit' });
  console.log('✅ iOS config uploaded to all environments');

  // Upload Android google-services.json
  console.log('🤖 Uploading Android google-services.json...');
  execSync(`eas env:create --name GOOGLE_SERVICES_JSON --value @${androidConfigPath} --environment development --visibility secret`, { stdio: 'inherit' });
  execSync(`eas env:create --name GOOGLE_SERVICES_JSON --value @${androidConfigPath} --environment preview --visibility secret`, { stdio: 'inherit' });
  execSync(`eas env:create --name GOOGLE_SERVICES_JSON --value @${androidConfigPath} --environment production --visibility secret`, { stdio: 'inherit' });
  console.log('✅ Android config uploaded to all environments');

  console.log('');
  console.log('🎉 Firebase config files successfully uploaded to EAS!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Run: eas build --profile development --platform ios');
  console.log('2. The build should now find your Firebase config files');
  console.log('');
  console.log('💡 You can verify the environment variables at:');
  console.log('   https://expo.dev/accounts/jmaddox0503/projects/basketball-ai-app/environment-variables');

} catch (error) {
  console.error('❌ Error uploading config files:', error.message);
  console.log('');
  console.log('🔧 Manual upload instructions:');
  console.log('1. Go to: https://expo.dev/accounts/jmaddox0503/projects/basketball-ai-app/environment-variables');
  console.log('2. Create environment variables:');
  console.log('   - Name: GOOGLE_SERVICES_PLIST');
  console.log('   - Value: Upload ios/GoogleService-Info.plist file');
  console.log('   - Environments: development, preview, production');
  console.log('   - Visibility: Secret');
  console.log('');
  console.log('   - Name: GOOGLE_SERVICES_JSON');
  console.log('   - Value: Upload android/app/google-services.json file');
  console.log('   - Environments: development, preview, production');
  console.log('   - Visibility: Secret');
  process.exit(1);
}
