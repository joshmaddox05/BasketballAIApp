# 📱 Phone Testing Guide - Basketball AI App

## Quick Start (5 minutes)

### Prerequisites
- ✅ iPhone or Android phone
- ✅ Same WiFi network as your computer
- ✅ Expo Go app installed on your phone

### Install Expo Go
- **iOS:** [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android:** [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## 🚀 Method 1: Automated Setup (Recommended)

### Step 1: Run Setup Script
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp
./setup-phone-testing.sh
```

### Step 2: Start the App
```bash
npm start
```

### Step 3: Scan QR Code
1. Open **Expo Go** on your phone
2. **iOS:** Tap "Scan QR Code" and point camera at terminal
3. **Android:** Scan with Expo Go's built-in scanner
4. Wait for app to load (30-60 seconds first time)

---

## 🔧 Method 2: Manual Setup

### Step 1: Install Dependencies (if needed)
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp
npm install
```

### Step 2: Start Development Server
```bash
npm start
```

### Step 3: Connect Your Phone

**Option A: QR Code (Easiest)**
- Open Expo Go and scan the QR code shown in terminal

**Option B: Manual URL Entry**
- Note the URL shown (e.g., `exp://192.168.1.X:8081`)
- Open Expo Go → Enter URL manually

**Option C: Send Link via Email/Text**
- Press `s` in terminal to open share dialog
- Send link to your phone and open in Expo Go

---

## 🎯 Testing the Curry Comparison Feature

### Navigation Path
1. Open the app on your phone
2. Tap **"Training"** in bottom navigation
3. Tap **"Shooting Analysis"**
4. Tap **"Compare with Pro Form"**
5. Select **"Stephen Curry"**
6. Tap **"Start Recording"**

### Recording Your Shot
- Grant **camera** and **microphone** permissions when prompted
- Position yourself **90° to the camera** (side view)
- Ensure **good lighting** and **clear background**
- Record **3-5 shooting attempts** (5-10 seconds)
- Tap **stop** when finished

### View Results
- Wait 3-5 seconds for analysis
- Check your **similarity score** to Curry
- Review **metric breakdowns**
- Read **personalized recommendations**
- Try **"New Analysis"** to test again

---

## 📱 Supported Features

### ✅ Works on Phone
- Video recording with camera
- Shooting form analysis (simulated)
- Curry comparison results
- Metric visualizations
- Navigation between screens
- Bottom tab navigation
- All UI components

### ⚠️ Requires Backend (Not Needed for Testing)
- Real AI analysis
- Actual baseline comparison
- Video upload to server

### 🎯 Current Mode
- **Offline Mode: ENABLED** ✅
- Uses simulated results
- No backend server needed
- Perfect for UI/UX testing

---

## 🐛 Troubleshooting

### App Won't Load

**Issue:** QR code scan fails
```
Solution:
1. Make sure phone and computer are on SAME WiFi
2. Disable VPN on both devices
3. Try typing URL manually in Expo Go
4. Restart Expo server: npm start -- --clear
```

**Issue:** "Network connection lost"
```
Solution:
1. Check WiFi connection on both devices
2. Make sure you're not on cellular data
3. Restart router if needed
4. Try using USB cable (see below)
```

**Issue:** "Unable to resolve module"
```
Solution:
1. Clear cache: npm start -- --clear
2. Reinstall: rm -rf node_modules && npm install
3. Restart Metro bundler
```

### Camera Issues

**Issue:** Camera permission denied
```
Solution:
1. Go to phone Settings → Apps → Expo Go
2. Enable Camera and Microphone permissions
3. Restart the app
```

**Issue:** Camera is black or frozen
```
Solution:
1. Force close Expo Go
2. Clear app cache in phone settings
3. Restart the app
4. Try a different phone if problem persists
```

### Performance Issues

**Issue:** App is slow or laggy
```
Solution:
1. Close other apps on your phone
2. Restart Expo Go
3. Clear cache: npm start -- --clear
4. Use production build (see below)
```

**Issue:** Analysis takes too long
```
Solution:
- This is normal in offline mode (3-5 sec simulated delay)
- Real backend would be faster for actual analysis
```

---

## 🔌 Alternative: USB Connection (More Reliable)

### iOS (via USB)
```bash
# Connect iPhone via USB cable
npm start

# In Expo Dev Tools, select:
# "Connection" → "Tunnel" or "LAN"
```

### Android (via USB)
```bash
# 1. Enable USB Debugging on your Android phone
# 2. Connect via USB
# 3. Run:
npm start

# 4. Press 'a' to open on Android device
```

---

## 📊 What to Test

### Essential Tests
- [ ] App loads successfully
- [ ] Bottom navigation works
- [ ] Can navigate to Shooting Analysis
- [ ] Can select Steph Curry as comparison
- [ ] Camera opens when recording starts
- [ ] Video recording works
- [ ] Analysis completes (3-5 seconds)
- [ ] Results display correctly
- [ ] Similarity score shows
- [ ] Metric bars appear
- [ ] Recommendations are visible

### UI/UX Tests
- [ ] All text is readable
- [ ] Buttons are tappable
- [ ] Animations are smooth
- [ ] No layout issues
- [ ] Colors look good
- [ ] Icons display properly
- [ ] Modal works correctly

### Feature Tests
- [ ] Can record multiple times
- [ ] Can try different pro players
- [ ] "New Analysis" button works
- [ ] "Save & Exit" button works
- [ ] Back navigation works
- [ ] App doesn't crash

---

## 📝 Quick Commands Reference

```bash
# Start app
npm start

# Start with cache cleared
npm start -- --clear

# Start in tunnel mode (for different networks)
npm start -- --tunnel

# Show QR code larger
npm start -- --lan

# Stop server
# Press Ctrl+C in terminal

# Reinstall everything
rm -rf node_modules && npm install && npm start
```

---

## 🎯 Expected Behavior

### First Load
- Takes 30-60 seconds to load initially
- Shows "Building JavaScript bundle" progress
- May show "Downloading..." for dependencies
- Will show warning about Reanimated (safe to ignore)

### After First Load
- Subsequent loads are faster (10-20 seconds)
- Hot reload works when you save files
- Shake phone to open developer menu

### Analysis Results
- **Overall Score:** 70-90 range (simulated)
- **Similarity to Curry:** 65-90% (simulated)
- **Metrics:** 4 metrics with colored bars
- **Recommendations:** 3-5 personalized tips

---

## 🔥 Hot Tips

1. **Shake Your Phone** - Opens developer menu
2. **CMD+D (iOS) / CMD+M (Android)** - Developer menu in simulator
3. **Fast Refresh** - Changes appear automatically when you save files
4. **Console Logs** - Check terminal for debug messages
5. **Keep Screen Awake** - Enable in phone developer settings

---

## 📸 Test Recording Tips

### Good Recording Setup
- ✅ Side angle (90° to shooter)
- ✅ Full body visible in frame
- ✅ Good lighting (natural or bright indoor)
- ✅ Clear background (solid color best)
- ✅ Stable camera (phone on stand or held steady)
- ✅ 5-10 seconds of shooting motion

### Avoid
- ❌ Front-facing angle
- ❌ Too dark or backlit
- ❌ Cluttered background
- ❌ Shaky camera
- ❌ Too short (<3 seconds)
- ❌ Subject out of frame

---

## 🎓 Developer Menu Features

Access by **shaking your phone** or **pressing D** in Expo Go:

- **Reload** - Restart app
- **Debug Remote JS** - Use Chrome DevTools
- **Show Element Inspector** - Inspect UI elements
- **Show Performance Monitor** - Check FPS
- **Toggle Fast Refresh** - Enable/disable hot reload

---

## ✨ Success Indicators

You'll know it's working when:
1. ✅ App loads without errors
2. ✅ Bottom navigation is visible
3. ✅ You can navigate to Training → Shooting Analysis
4. ✅ Camera opens when you tap "Start Recording"
5. ✅ Video recording works smoothly
6. ✅ Analysis completes in 3-5 seconds
7. ✅ Results screen shows with all metrics
8. ✅ Similarity percentage is displayed
9. ✅ Metric bars are visible and colored
10. ✅ Recommendations appear at the bottom

---

## 📞 Need Help?

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Look at terminal output for error messages**
3. **Try clearing cache: `npm start -- --clear`**
4. **Restart Expo Go app on phone**
5. **Ensure both devices are on same WiFi**
6. **Check that offline mode is enabled** (it should be by default)

---

## 🚀 Ready to Test!

**Quick Start Command:**
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp
npm start
```

Then scan the QR code with Expo Go and start testing! 🏀

---

**Current Configuration:**
- ✅ Offline Mode: **ENABLED**
- ✅ Simulated Results: **YES**
- ✅ Backend Required: **NO**
- ✅ Camera Access: **REQUIRED**
- ✅ Network Required: **YES** (for initial load)

**Perfect for testing the UI and user experience!**
