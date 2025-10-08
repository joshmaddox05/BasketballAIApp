# 📱 EAS Build Guide - Test Camera on Real Device

## Overview
This guide will help you build the app for your physical device so you can test the camera functionality.

---

## 🎯 Quick Build Commands

### For iPhone (iOS)
```bash
# Preview build (recommended for testing)
npx eas build --profile preview --platform ios

# This will create an .ipa file you can install via TestFlight or directly
```

### For Android Phone
```bash
# Preview build (creates APK you can install directly)
npx eas build --profile preview --platform android

# This will create an .apk file you can download and install
```

---

## 📋 Prerequisites

### 1. EAS Account
You need an Expo account (free):
```bash
# Login to EAS
npx eas login

# Check if you're logged in
npx eas whoami
```

### 2. For iOS Builds
- **Apple Developer Account** (free or paid)
- **Team ID** (if you have a paid account)
- EAS will guide you through certificate setup

### 3. For Android Builds
- No special requirements!
- APK can be installed directly on any Android device

---

## 🚀 Step-by-Step: Android Build (Easiest)

### Step 1: Start the Build
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp

# Build for Android
npx eas build --profile preview --platform android
```

### Step 2: Wait for Build
- Build takes **10-20 minutes**
- You'll see progress in terminal
- You can close terminal and check status later:
  ```bash
  npx eas build:list
  ```

### Step 3: Download APK
When build completes:
1. You'll get a **download link** in terminal
2. Or visit: https://expo.dev/accounts/YOUR_USERNAME/projects/BasketballAIApp/builds
3. Download the APK file

### Step 4: Install on Android Phone
**Option A: Direct Download on Phone**
1. Open the download link on your Android phone
2. Download the APK
3. Tap to install (may need to allow "Install from unknown sources")

**Option B: Transfer via USB/AirDrop**
1. Download APK on computer
2. Transfer to phone via USB, AirDrop, or email
3. Open file on phone and install

**Option C: QR Code**
1. EAS will show a QR code
2. Scan with your Android phone
3. Download and install

---

## 🍎 Step-by-Step: iOS Build

### Step 1: Configure iOS Build
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp

# Build for iOS
npx eas build --profile preview --platform ios
```

### Step 2: Apple Account Setup
EAS will ask for:
1. **Apple ID** - Your Apple account email
2. **Apple Password** - Or app-specific password
3. **Team ID** - If you have a paid developer account

EAS will:
- Create certificates for you
- Set up provisioning profiles
- Handle code signing

### Step 3: Wait for Build
- Build takes **15-30 minutes**
- You'll get notified when complete

### Step 4: Install on iPhone

**Option A: TestFlight (Recommended)**
1. Install **TestFlight** app from App Store
2. Build will be uploaded to TestFlight
3. Open TestFlight link sent to you
4. Install the app

**Option B: Direct Installation**
1. Download the .ipa file
2. Use **Apple Configurator** or **Xcode**
3. Connect iPhone and install

**Option C: Internal Distribution**
1. Register your device UDID
2. Download via EAS installation link
3. Follow on-screen instructions

---

## ⚡ Quick Start (Recommended)

### For Testing Right Now - Android is Fastest!

```bash
# 1. Make sure you're logged in
npx eas login

# 2. Build for Android (simplest)
npx eas build --profile preview --platform android

# 3. Wait 10-20 minutes

# 4. When done, scan the QR code or download APK

# 5. Install on your Android phone

# 6. Open app and test the camera!
```

---

## 🔍 Check Build Status

```bash
# List all builds
npx eas build:list

# Check specific build
npx eas build:view BUILD_ID

# View in browser
npx eas build:list --json
```

Or visit: https://expo.dev

---

## 🛠️ Build Profiles Explained

### `preview` (Recommended for Testing)
- **Purpose:** Quick testing on real devices
- **iOS:** Ad-hoc distribution (30 days)
- **Android:** APK file (install directly)
- **Fast:** Optimized builds
- **Easy:** Direct installation

### `development`
- **Purpose:** Development with dev tools
- **Includes:** Dev client, debugging
- **Slower:** Larger file size
- **Best for:** Active development

### `production`
- **Purpose:** App Store/Play Store submission
- **Optimized:** Smallest size, best performance
- **Requires:** Full app store setup

---

## 📱 What You'll Get

### Android Build
- **File:** `.apk` (30-50 MB)
- **Install:** Direct installation
- **Duration:** 10-20 minutes
- **Easy:** No special setup needed

### iOS Build
- **File:** `.ipa` (50-80 MB)
- **Install:** Via TestFlight or direct
- **Duration:** 15-30 minutes
- **Requires:** Apple Developer account

---

## 🎯 After Installation

### Test the Camera Feature

1. **Open the installed app** (not Expo Go!)
2. Navigate: **Training → Shooting Analysis**
3. Select **"Stephen Curry"**
4. Tap **"Start Recording"**
5. **Camera should work!** 📹
6. Record your shot
7. View results

### Differences from Expo Go
- ✅ **Camera works perfectly**
- ✅ **Better performance**
- ✅ **Production-like experience**
- ⚠️ **No hot reload** (need to rebuild for changes)

---

## 🐛 Troubleshooting

### Build Fails

**Error: "No bundle identifier"**
```bash
# The app.json already has bundle IDs, but if needed:
# iOS: com.jmaddox0503.BasketballAIApp
# Android: com.jmaddox0503.BasketballAIApp
```

**Error: "Not logged in"**
```bash
npx eas login
# Enter your Expo credentials
```

**Error: "Invalid credentials"**
```bash
# For iOS, you may need an app-specific password
# Go to: appleid.apple.com → Security → Generate app-specific password
```

### Installation Fails

**Android: "Cannot install app"**
```
1. Enable "Install from unknown sources" in phone settings
2. Settings → Security → Unknown Sources → Enable
3. Try installing again
```

**iOS: "Untrusted Developer"**
```
1. Go to: Settings → General → VPN & Device Management
2. Find your developer profile
3. Tap "Trust"
4. Try opening app again
```

### Camera Still Not Working

**Permissions Issue**
```
1. Go to phone Settings → Apps → BasketballAIApp
2. Enable Camera and Microphone permissions
3. Restart app
```

**Still Not Working**
```
# Try a development build with dev client
npx eas build --profile development --platform android
```

---

## 💡 Pro Tips

### Faster Builds
1. **Build Android first** - Faster than iOS
2. **Use preview profile** - Faster than production
3. **Build during off-peak** - EAS servers less busy
4. **Cache enabled** - Subsequent builds faster

### Testing Workflow
1. **Use Expo Go** for UI changes (fast)
2. **Use EAS builds** for camera/native features
3. **Only rebuild** when you change native code
4. **Share builds** with team via QR code

### Build Locally (Advanced)
```bash
# Build locally if you have Android Studio / Xcode
npx eas build --profile preview --platform android --local
```

---

## 📊 Expected Timeline

### First Build Ever
- **Android:** 15-25 minutes
- **iOS:** 25-40 minutes
- Includes setup and certificate generation

### Subsequent Builds
- **Android:** 10-15 minutes
- **iOS:** 15-25 minutes
- Cached dependencies speed things up

---

## 🎬 Complete Example

### Android Build (Start to Finish)

```bash
# 1. Navigate to project
cd /Users/joshuamaddox/Codebase/BasketballAIApp

# 2. Login to EAS (if not already)
npx eas login

# 3. Start build
npx eas build --profile preview --platform android

# 4. Follow prompts (usually just confirms)

# 5. Wait for build...
# ⏳ Building... (10-20 minutes)
# ✅ Build complete!

# 6. You'll see:
#    - Download URL
#    - QR code
#    - Installation instructions

# 7. On your Android phone:
#    - Scan QR code OR
#    - Open download URL OR
#    - Download APK and transfer

# 8. Install APK on phone

# 9. Open app and test camera! 🎥
```

---

## 📚 Additional Resources

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **EAS Dashboard:** https://expo.dev
- **Build Status:** `npx eas build:list`
- **iOS Certificates:** Handled automatically by EAS
- **Android Signing:** Handled automatically by EAS

---

## ✅ Quick Checklist

Before building:
- [ ] Logged into EAS: `npx eas whoami`
- [ ] App.json has correct bundle IDs
- [ ] Decided: Android or iOS?
- [ ] Choose profile: preview (recommended)

After building:
- [ ] Build completed successfully
- [ ] Downloaded .apk or .ipa
- [ ] Installed on phone
- [ ] Granted camera permissions
- [ ] Tested camera recording
- [ ] Camera works! 🎉

---

## 🚀 Ready to Build!

**Simplest path for immediate testing:**

```bash
npx eas build --profile preview --platform android
```

**This will:**
1. Build an APK in ~15 minutes
2. Give you a download link
3. Let you install directly on Android
4. Camera will work perfectly!

---

## 🎯 Next Steps After Build

Once installed:
1. Test the **Curry Comparison** feature with real camera
2. Record actual shooting videos
3. Validate the analysis UI
4. Share the build with others if needed
5. Iterate and rebuild as needed

**Build takes time, so grab a coffee! ☕**

When it's done, you'll have a fully functional app with working camera on your real device.
