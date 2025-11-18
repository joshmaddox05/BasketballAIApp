
# Firebase Cloud Functions Deployment Guide

## Step-by-Step Instructions

### Step 1: Get Your Stripe Keys

First, get your Stripe keys from the dashboard:

1. Go to: https://dashboard.stripe.com/test/apikeys
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`) - for the app
   - **Secret key** (starts with `sk_test_`) - click "Reveal test key" to see it

Keep these handy - you'll need them in the next steps.

### Step 2: Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

This installs:
- `firebase-admin` - Firebase SDK for Cloud Functions
- `firebase-functions` - Cloud Functions framework
- `stripe` - Stripe SDK for Node.js

### Step 3: Add Your Stripe Publishable Key to the App

1. Open `src/App.js`
2. Find this line:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SNiC5PTDEZhEg0xYOUR_PUBLISHABLE_KEY_HERE';
   ```
3. Replace with your actual publishable key:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY';
   ```

### Step 4: Set Stripe Secret Key for Cloud Functions

You need to set environment variables for Cloud Functions:

```bash
# Set your Stripe secret key (the one that starts with sk_test_)
firebase functions:secrets:set STRIPE_SECRET_KEY
```

When prompted, paste your Stripe **secret key** and press Enter.

### Step 5: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This will:
- Upload your functions to Firebase
- Take about 2-3 minutes
- Show you the deployed function URLs when complete

**Expected Output:**
```
✔  functions[createSubscriptionPayment(us-central1)] Successful create operation.
Function URL (createSubscriptionPayment(us-central1)): https://us-central1-YOUR_PROJECT.cloudfunctions.net/createSubscriptionPayment

✔  functions[stripeWebhook(us-central1)] Successful create operation.
Function URL (stripeWebhook(us-central1)): https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
```

**Copy these URLs!** You'll need them for the next steps.

### Step 6: Update App with Cloud Function URL

1. Open `src/services/stripePaymentService.js`
2. Find this line (around line 12):
   ```javascript
   const response = await fetch('https://YOUR_CLOUD_FUNCTION_URL/createSubscriptionPayment', {
   ```
3. Replace with your actual Cloud Function URL:
   ```javascript
   const response = await fetch('https://us-central1-YOUR_PROJECT.cloudfunctions.net/createSubscriptionPayment', {
   ```

### Step 7: Configure Stripe Webhook

Now set up Stripe to send events to your webhook:

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: Paste your `stripeWebhook` function URL from Step 5
   ```
   https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```
4. **Description**: "Basketball AI subscription events"
5. **Events to send**: Click "Select events" and choose:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **"Add endpoint"**
7. You'll see a **Signing secret** (starts with `whsec_`) - **Copy this!**

### Step 8: Set Webhook Secret

```bash
# Set your webhook signing secret
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

When prompted, paste your webhook **signing secret** (the `whsec_` key from Step 7).

### Step 9: Redeploy Functions with Webhook Secret

```bash
firebase deploy --only functions
```

This ensures the webhook handler has access to the signing secret.

### Step 10: Test the Integration

Now test the end-to-end flow:

1. Run your app:
   ```bash
   npm start
   ```

2. Navigate to a premium feature or settings

3. Tap **"Upgrade to Premium"**

4. Select a plan (e.g., Premium)

5. The payment sheet should open **in the app**

6. Enter test card: `4242 4242 4242 4242`
   - Expiration: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

7. Complete payment

8. Check results:
   - Payment should succeed
   - Alert should show "Welcome to Premium!"
   - Check Firestore - user's subscription should update
   - Check Stripe Dashboard - subscription should appear

## Troubleshooting

### "Command not found: firebase"

Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
```

### "Error: Failed to load function definition"

Make sure you're in the project root directory and run:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### "Webhook signature verification failed"

1. Make sure you set the webhook secret: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`
2. Verify you copied the correct signing secret from Stripe Dashboard
3. Redeploy: `firebase deploy --only functions`

### "Payment sheet not appearing"

1. Check if publishable key is correct in `src/App.js`
2. Verify Cloud Function URL is correct in `stripePaymentService.js`
3. Check console logs for errors

### "Subscription not updating in Firestore"

1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Check "Events" tab to see if events are being sent
4. Check "Attempts" to see if they're succeeding
5. View Cloud Function logs: `firebase functions:log`

## Verification Checklist

After deployment, verify:

- [ ] Cloud Functions deployed successfully
- [ ] Got function URLs from deployment output
- [ ] Updated `stripePaymentService.js` with correct URL
- [ ] Stripe webhook endpoint created
- [ ] Webhook secret set in Firebase
- [ ] Test payment completes successfully
- [ ] Payment sheet opens in-app (not browser)
- [ ] Firestore updates with subscription data
- [ ] Stripe Dashboard shows new subscription
- [ ] Webhook events appearing in Stripe Dashboard

## Quick Commands Reference

```bash
# Install dependencies
cd functions && npm install && cd ..

# Set secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Deploy
firebase deploy --only functions

# View logs
firebase functions:log

# Test locally (optional)
firebase emulators:start --only functions

# List deployed functions
firebase functions:list
```

## Next Steps

Once everything is working:

1. Test all three subscription tiers (Basic, Premium, Pro)
2. Test failed payments with card `4000 0000 0000 0002`
3. Test subscription cancellation
4. Implement subscription management UI
5. Add error handling for edge cases
6. Plan for production deployment

---

**Need Help?**

- Check `firebase functions:log` for Cloud Function errors
- Check Stripe Dashboard → Webhooks for webhook delivery issues
- Review `STRIPE_IN_APP_SETUP.md` for detailed setup info
- Check `STRIPE_CONFIG_REFERENCE.md` for all configuration values
