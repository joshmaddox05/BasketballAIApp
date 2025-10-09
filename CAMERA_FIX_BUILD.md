# 🎥 Camera Fix - Build for Physical Device

## The Problem
The camera doesn't work in the iOS/Android simulator because simulators don't have access to real cameras.

## The Solution
Build the app for a **physical device** using EAS Build.

---

## 🚀 Quick Start (2 commands)

### Step 1: Start the Build
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp
./build-for-device.sh
```

Choose **Option 1** (Android) - fastest and easiest!

### Step 2: Install on Your Phone
When build completes (~15 minutes):
1. Scan the QR code shown in terminal
2. Or open the download URL on your phone
3. Install the APK
4. Open the app
5. Camera will work! 🎉

---

## 📱 Platform Recommendations

### ✅ Android (Recommended for Quick Testing)
- **Time:** 10-15 minutes
- **Install:** Direct APK download
- **Requirements:** None
- **Easy:** Just download and install

### 🍎 iOS (If you have iPhone)
- **Time:** 20-30 minutes
- **Install:** TestFlight or direct
- **Requirements:** Apple Developer account (free)
- **Process:** Slightly more setup

---

## 🎯 Alternative: Use the Script

### Interactive Build Menu
```bash
./build-for-device.sh
```

This will:
- Check your EAS login
- Ask which platform (Android/iOS/Both)
- Start the build
- Show progress

---

## 🤖 Manual Commands

### Build for Android
```bash
npx eas build --profile preview --platform android
```

### Build for iOS
```bash
npx eas build --profile preview --platform ios
```

### Check Build Status
```bash
npx eas build:list
```

---

## ⏰ What to Expect

### Build Time
- **Android:** 10-15 minutes first time, 8-12 minutes after
- **iOS:** 20-30 minutes first time, 15-25 minutes after

### Build Output
- **Android:** `.apk` file (30-50 MB)
- **iOS:** `.ipa` file (50-80 MB)

### After Build
You'll get:
1. ✅ Download URL
2. ✅ QR code to scan
3. ✅ Installation instructions
4. ✅ Working camera!

---

## 📥 Installation Methods

### Android
**Option 1:** Scan QR code with phone → Download → Install
**Option 2:** Open download link on phone → Install
**Option 3:** Download on computer → Transfer to phone → Install

### iOS
**Option 1:** Install via TestFlight (automatic)
**Option 2:** Direct installation with profile
**Option 3:** Use Apple Configurator

---

## 🐛 Quick Troubleshooting

### "Not logged in to EAS"
```bash
npx eas login
# Enter your Expo credentials
```

### "Cannot install app" (Android)
```
Enable "Install from unknown sources":
Settings → Security → Unknown Sources → Enable
```

### "Untrusted Developer" (iOS)
```
Settings → General → VPN & Device Management
→ Trust your developer profile
```

### Build fails
```bash
# Check logs
npx eas build:list

# View specific build
npx eas build:view BUILD_ID
```

---

## 📚 Full Documentation

Detailed guides available:
- **Complete Guide:** `EAS_BUILD_GUIDE.md`
- **Phone Testing:** `PHONE_TESTING_GUIDE.md`
- **Quick Start:** `QUICK_START_GUIDE.md`

---

## ✅ Success Checklist

After installation:
- [ ] App installed on physical device
- [ ] App opens without Expo Go
- [ ] Navigate to Shooting Analysis
- [ ] Tap "Start Recording"
- [ ] Camera opens (no error!)
- [ ] Can record video
- [ ] Analysis shows results
- [ ] 🎉 Camera works perfectly!

---

## 🎯 Bottom Line

**The camera freezes in the simulator because simulators don't have cameras.**

**Solution:** Build for a real device with EAS.

**Fastest path:**
```bash
./build-for-device.sh
# Choose option 1 (Android)
# Wait 15 minutes
# Install APK on phone
# Camera works! 🎥
```

---

## ⏱️ Timeline

1. **Start build:** 1 minute
2. **Wait for build:** 10-15 minutes (Android) or 20-30 minutes (iOS)
3. **Download:** 1 minute
4. **Install:** 1 minute
5. **Test camera:** Instant!

**Total: 15-35 minutes** depending on platform

---

## 💡 Pro Tips

1. **Build Android first** - It's faster
2. **You can close terminal** - Build runs in cloud
3. **Share the build** - QR code works for team
4. **Check status online** - Visit expo.dev
5. **Rebuild only when needed** - Not for every code change

---

## 🚀 Ready?

Run this now:
```bash
./build-for-device.sh
```

Choose Android, wait 15 minutes, install, and test!

Your camera will work perfectly on the physical device! 📱🎥
