# Fastlane Build Failure - Troubleshooting Guide

## Common Causes of Fastlane Failures

The "Run fastlane" step in EAS builds typically fails due to:

1. **Missing/Invalid Signing Certificates**
2. **Missing/Invalid Provisioning Profiles**
3. **No Devices Registered** (for development/internal builds)
4. **Bundle Identifier Mismatch**
5. **Expired Credentials**

## Quick Fix Steps

### Step 1: Check Build Logs

Visit your build page to see the exact error:
https://expo.dev/accounts/jmaddox0503/projects/BasketballAIApp/builds/5d8f5475-cd77-4502-9ca8-122be63fb0c5

Look for errors like:
- "No signing certificate found"
- "No provisioning profile found"
- "No devices are registered"
- "Code signing error"

### Step 2: Register Your Device (If Not Done)

For internal/development builds, your iPhone must be registered:

```bash
eas device:create
```

This will:
1. Generate a registration URL
2. Open on your iPhone
3. Install a profile to get your UDID
4. Automatically register your device with Apple

### Step 3: Configure iOS Credentials

Let EAS manage your credentials (recommended):

```bash
eas credentials
```

Then:
1. Select: **iOS**
2. Select: **@jmaddox0503/BasketballAIApp**
3. Select: **com.jmaddox0503.BasketballAIApp**
4. Choose: **Set up a new distribution certificate**
5. Choose: **Generate new distribution certificate**
6. Follow prompts for provisioning profile

**Important**: You'll need your Apple ID that's enrolled in the Apple Developer Program.

### Step 4: Alternative - Use Ad Hoc Provisioning

If you don't have an Apple Developer account yet, you can build for simulator instead:

```bash
eas build --profile preview-simulator --platform ios
```

Simulator builds:
- Don't require signing certificates
- Don't require device registration
- Build much faster (~5-8 minutes)
- Run on Xcode Simulator on your Mac

## Common Error Messages

### "No valid signing certificate found"

**Solution**:
```bash
eas credentials
# Select: iOS → Distribution Certificate → Generate new certificate
```

### "No provisioning profile found"

**Solution**:
```bash
eas credentials
# Select: iOS → Provisioning Profile → Generate new profile
```

### "No devices are registered"

**Solution**:
```bash
eas device:create
# Follow prompts to register your iPhone
```

Then rebuild:
```bash
eas build --profile development --platform ios
```

### "Bundle identifier mismatch"

Check that your `app.json` bundle ID matches Apple Developer Portal:
- App config: `com.jmaddox0503.BasketballAIApp`
- Should match exactly in Apple Developer Portal

### "Code signing requires a provisioning profile"

This means credentials are missing or invalid. Run:
```bash
eas credentials
# Set up fresh credentials
```

## Step-by-Step: First Time Setup

### 1. Apple Developer Account
Ensure you have:
- Apple ID enrolled in Apple Developer Program ($99/year)
- OR use simulator builds (free, no signing needed)

### 2. Register Device
```bash
eas device:create
```
Open the URL on your iPhone and follow prompts.

### 3. Configure Credentials
```bash
eas credentials
```
Let EAS generate certificates and profiles.

### 4. Rebuild
```bash
eas build --profile development --platform ios
```

## Alternative: Build for Simulator (No Credentials Needed)

If you're still setting up Apple Developer:

```bash
# Build for simulator (no signing required)
eas build --profile preview-simulator --platform ios
```

Then run in Xcode Simulator:
1. Download the .tar.gz file after build
2. Extract it
3. Drag the .app to your simulator

## Need Immediate Testing?

While fixing credentials, you can test with emulators:
- ✅ Firebase Emulators are already running
- ✅ Test locally with `npm start`
- ✅ Test on physical device with Expo Go (limited features)

## Check Credentials Status

After setup, verify:
```bash
# View your project in Expo dashboard
open https://expo.dev/accounts/jmaddox0503/projects/BasketballAIApp/credentials
```

You should see:
- ✅ Distribution Certificate
- ✅ Provisioning Profile
- ✅ Registered Device(s)

## Still Failing?

### Option 1: Detailed Diagnostics
Share the specific error from build logs at:
https://expo.dev/accounts/jmaddox0503/projects/BasketballAIApp/builds/5d8f5475-cd77-4502-9ca8-122be63fb0c5

Look for the section titled "Run fastlane" and copy the error message.

### Option 2: Fresh Start with Credentials
```bash
eas credentials
# Select: iOS → Remove all credentials
# Then set up fresh credentials from scratch
```

### Option 3: Use Simulator Build
```bash
eas build --profile preview-simulator --platform ios
```

## Summary

**Most Likely Issue**: Missing device registration or credentials

**Quickest Fix**:
1. Register device: `eas device:create`
2. Set up credentials: `eas credentials`
3. Rebuild: `eas build --profile development --platform ios`

**Alternative** (no Apple account needed):
```bash
eas build --profile preview-simulator --platform ios
```

---

**Next Steps**: Check your build logs for the specific error, then follow the appropriate fix above.
