# Production Setup Guide

This guide covers all the steps needed to prepare the Basketball AI app for production deployment.

## Table of Contents
1. [Stripe Configuration](#stripe-configuration)
2. [Google Sign-In Setup](#google-sign-in-setup)
3. [EAS Secrets Setup](#eas-secrets-setup)
4. [Firebase Cloud Functions Secrets](#firebase-cloud-functions-secrets)
5. [Production Checklist](#production-checklist)

---

## Stripe Configuration

### Finding Your Stripe Keys

#### 1. Stripe Publishable Key (Client-side)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in the correct mode:
   - **Test Mode**: Toggle in top-right shows "Test mode" (orange)
   - **Live Mode**: Toggle shows "Live mode" (no orange indicator)
3. Click **Developers** in the left sidebar
4. Click **API keys**
5. Copy your **Publishable key**:
   - Test: Starts with `pk_test_`
   - Live: Starts with `pk_live_`

#### 2. Stripe Secret Key (Server-side only)

1. Same location: **Developers > API keys**
2. Click **Reveal test/live key** next to "Secret key"
3. Copy your **Secret key**:
   - Test: Starts with `sk_test_`
   - Live: Starts with `sk_live_`

> **IMPORTANT**: Never expose your secret key in client-side code or commit it to version control!

#### 3. Stripe Webhook Secret

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint** (or select existing endpoint)
3. Set your endpoint URL:
   - Format: `https://<region>-<project-id>.cloudfunctions.net/stripeWebhook`
   - Example: `https://us-central1-basketballaiapp.cloudfunctions.net/stripeWebhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. On the webhook details page, click **Reveal** under "Signing secret"
7. Copy the webhook secret (starts with `whsec_`)

### Switching from Test to Live Mode

When ready for production:

1. **Create Live Products & Prices**:
   - Go to **Products** in Stripe Dashboard
   - Switch to Live mode
   - Create matching products with live prices
   - Update `src/config/stripe.js` with new price IDs

2. **Update Payment Links** (if using):
   - Create new payment links in Live mode
   - Update `src/config/stripe.js` with new URLs

3. **Create Live Webhook**:
   - Add new webhook endpoint in Live mode
   - Use the same Cloud Functions URL
   - Get new webhook signing secret

---

## Google Sign-In Setup

Google Sign-In requires configuration in both Firebase and Google Cloud Console.

### Step 1: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `basketball-ai-app-db000`
3. Navigate to **Authentication > Sign-in method**
4. Click on **Google** provider
5. Enable the toggle
6. Add your **Project support email**
7. Click **Save**

### Step 2: Get the Web Client ID

After enabling Google Sign-In in Firebase:

1. Stay on the Google provider settings page
2. Expand **Web SDK configuration**
3. Copy the **Web client ID** (looks like: `XXXX.apps.googleusercontent.com`)
4. Update `src/services/googleAuthService.js` with this Web client ID:

```javascript
const WEB_CLIENT_ID = 'your-web-client-id.apps.googleusercontent.com';
```

### Step 3: Configure SHA-1 Fingerprint (Android)

For Android, you need to add your app's SHA-1 fingerprint:

1. **Get SHA-1 from EAS**:
   ```bash
   eas credentials --platform android
   ```
   Select your keystore and copy the SHA-1 fingerprint.

2. **Add to Firebase**:
   - Go to Firebase Console > Project Settings > Your apps
   - Select your Android app
   - Click **Add fingerprint**
   - Paste the SHA-1 fingerprint
   - Click **Save**

3. **Download updated google-services.json**:
   - Click **Download google-services.json**
   - Replace the file in your project

### Step 4: Configure iOS (if not using GoogleService-Info.plist)

For iOS, ensure your `GoogleService-Info.plist` is properly configured:

1. Go to Firebase Console > Project Settings > Your apps
2. Select your iOS app
3. Download **GoogleService-Info.plist**
4. Place it in your project root or configure via EAS secrets

### Step 5: Rebuild the App

After configuring Google Sign-In, you must rebuild the development client:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Troubleshooting Google Sign-In

| Error | Solution |
|-------|----------|
| `DEVELOPER_ERROR` | SHA-1 fingerprint not added to Firebase |
| `Network error` | Check internet connection, try again |
| `Sign-in cancelled` | User cancelled - not an error |
| `No ID token` | Web client ID incorrect or not configured |

---

## EAS Secrets Setup

EAS (Expo Application Services) secrets allow you to securely store sensitive values for builds.

### Setting Up EAS Secrets

1. **Install EAS CLI** (if not already):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to EAS**:
   ```bash
   eas login
   ```

3. **Set secrets for the project**:

   ```bash
   # Stripe Publishable Key (for client app)
   eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value "pk_live_your_key_here"

   # YouTube API Key
   eas secret:create --scope project --name YOUTUBE_API_KEY --value "your_youtube_api_key"

   # API Base URL (if using external backend)
   eas secret:create --scope project --name API_BASE_URL --value "https://your-api.com"
   ```

4. **Verify secrets are set**:
   ```bash
   eas secret:list
   ```

### Using Secrets in Builds

The `eas.json` is already configured to use secrets. Make sure your build profiles include:

```json
{
  "build": {
    "production": {
      "env": {
        "STRIPE_PUBLISHABLE_KEY": "secret:STRIPE_PUBLISHABLE_KEY",
        "YOUTUBE_API_KEY": "secret:YOUTUBE_API_KEY",
        "API_BASE_URL": "secret:API_BASE_URL"
      }
    }
  }
}
```

---

## Firebase Cloud Functions Secrets

Firebase Cloud Functions use Google Secret Manager for sensitive values.

### Setting Up Function Secrets

1. **Navigate to your functions directory**:
   ```bash
   cd functions
   ```

2. **Set the Stripe Secret Key**:
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY
   ```
   - Paste your secret key when prompted (starts with `sk_live_` for production)

3. **Set the Stripe Webhook Secret**:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
   - Paste your webhook signing secret (starts with `whsec_`)

4. **Verify secrets are set**:
   ```bash
   firebase functions:secrets:access STRIPE_SECRET_KEY
   firebase functions:secrets:access STRIPE_WEBHOOK_SECRET
   ```

5. **Deploy functions with secrets**:
   ```bash
   firebase deploy --only functions
   ```

### Granting Access (if needed)

If you get permission errors, grant the Cloud Functions service account access:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Production Checklist

### Before Submitting to App Stores

#### Stripe
- [ ] Live products and prices created in Stripe
- [ ] `src/config/stripe.js` updated with live price IDs
- [ ] Live webhook endpoint created and configured
- [ ] `STRIPE_SECRET_KEY` secret set in Firebase (live key)
- [ ] `STRIPE_WEBHOOK_SECRET` secret set in Firebase (live webhook secret)
- [ ] Test a complete subscription flow in live mode with a real card

#### EAS Secrets
- [ ] `STRIPE_PUBLISHABLE_KEY` set (live key: `pk_live_...`)
- [ ] `YOUTUBE_API_KEY` set
- [ ] `API_BASE_URL` set (if applicable)
- [ ] `GOOGLE_SERVICES_INFO_PLIST` set (iOS Firebase config)
- [ ] `GOOGLE_SERVICES_JSON` set (Android Firebase config)

#### Firebase
- [ ] Firestore security rules reviewed and tightened
- [ ] Firebase Authentication providers enabled
- [ ] Cloud Functions deployed with secrets
- [ ] Webhook endpoint tested and receiving events

#### App Configuration
- [ ] `app.config.js` version number updated
- [ ] App icons and splash screens finalized
- [ ] Privacy policy URL configured
- [ ] Terms of service URL configured

#### Testing
- [ ] Full subscription flow tested (subscribe, upgrade, downgrade, cancel)
- [ ] Payment failure handling tested
- [ ] Push notifications tested on physical devices
- [ ] Deep links tested
- [ ] All features tested on both iOS and Android

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check the webhook endpoint URL is correct
2. Verify the Cloud Function is deployed: `firebase functions:list`
3. Check Cloud Functions logs: `firebase functions:log`
4. Verify webhook secret matches what's in Stripe Dashboard

### Subscription Not Updating in App

1. Check Firestore rules allow the update
2. Verify `firebaseUID` is in subscription metadata
3. Check webhook logs for errors
4. Verify price IDs match in `priceToTierMap`

### EAS Build Failing

1. Verify all secrets are set: `eas secret:list`
2. Check build logs for missing environment variables
3. Ensure `eas.json` references secrets correctly

---

## Quick Reference

| Key | Location | Format |
|-----|----------|--------|
| Publishable Key | Stripe Dashboard > Developers > API keys | `pk_test_...` or `pk_live_...` |
| Secret Key | Stripe Dashboard > Developers > API keys | `sk_test_...` or `sk_live_...` |
| Webhook Secret | Stripe Dashboard > Developers > Webhooks > [endpoint] | `whsec_...` |

| Secret | Where to Set | Command |
|--------|--------------|---------|
| STRIPE_PUBLISHABLE_KEY | EAS Secrets | `eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value "..."` |
| STRIPE_SECRET_KEY | Firebase Functions | `firebase functions:secrets:set STRIPE_SECRET_KEY` |
| STRIPE_WEBHOOK_SECRET | Firebase Functions | `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` |
