# EAS Build Guide

## 🎯 Ready to Build!

Your EAS configuration is now optimized and ready for building.

## Quick Start

### Trigger a Development Build
```bash
eas build --profile development --platform ios
```

This will:
1. Upload your code to EAS
2. Install dependencies (npm + CocoaPods)
3. Generate iOS project via Expo prebuild
4. Compile with Xcode
5. Sign and package the .ipa file

### Build Time
- **First build**: ~15-20 minutes (no cache)
- **Subsequent builds**: ~10-15 minutes (with Pod caching)

## What We Fixed

✅ **EAS Configuration** - Added resource class, caching, and proper iOS settings
✅ **Build Hooks** - Created post-install hook for CocoaPods
✅ **Build Ignore** - Excluded unnecessary files to reduce upload time
✅ **Firebase Integration** - Configured Google Services files as secrets

## Monitoring Your Build

Watch the build progress in terminal or visit:
https://expo.dev/accounts/jmaddox0503/projects/BasketballAIApp/builds

## Installing the Build

After build completes, you'll get:
- **QR Code** - Scan with your iPhone's camera
- **Direct Link** - Open in Safari on your device

First time? You may need to register your device:
```bash
eas device:create
```

## Need Help?

See full documentation in `EAS_BUILD_GUIDE_FULL.md`

---

**Start your build now!** 🚀
```bash
eas build --profile development --platform ios
```
