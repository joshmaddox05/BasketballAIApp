# Stripe Integration - Deployment Complete ✅

**Date**: 2025-11-16
**Status**: All functions deployed and ready for testing

## Issues Fixed

### 1. Payment Intent Expansion Error ✅
**Problem**: Function was throwing "Could not retrieve payment intent from subscription" or "Payment intent not expanded properly"

**Root Cause**: Stripe's expand parameter wasn't reliably returning the fully expanded payment_intent object in all cases.

**Solution**:
- Added comprehensive handling for all expansion scenarios
- Added explicit retrieval of invoice and payment intent when needed
- Added detailed logging to track the expansion flow
- Proper null/undefined checks at each step

**Files Changed**: `functions/index.js:76-141`

### 2. Invalid Time Value in Webhook ✅
**Problem**: Webhook was failing with `RangeError: Invalid time value` when converting dates

**Root Cause**: When subscriptions are first created with `payment_behavior: 'default_incomplete'`, the `current_period_end` is null until the first payment succeeds.

**Solution**:
- Added null checks before converting timestamps to dates
- Gracefully handle missing dates by storing null instead of throwing error

**Files Changed**: `functions/index.js:228-232`

### 3. Webhook Secret Configured ✅
**Secret**: `whsec_eRUPMxY3J9b489yi3DaQGmONEWxKwycz`
**Status**: Deployed as version 3 in Firebase Secret Manager

## Deployed Functions

### createSubscriptionPayment
- **URL**: https://us-central1-basketball-ai-app-db000.cloudfunctions.net/createSubscriptionPayment
- **Type**: Callable function (for app to call)
- **Secrets**: STRIPE_SECRET_KEY
- **Purpose**: Creates Stripe subscription and returns payment intent for in-app payment sheet

### stripeWebhook
- **URL**: https://stripewebhook-ga4dq66rtq-uc.a.run.app
- **Type**: HTTP endpoint (for Stripe to call)
- **Secrets**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- **Purpose**: Receives Stripe events and updates Firestore user subscriptions

## Testing Instructions

### Step 1: Verify Webhook in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Check if webhook endpoint exists with URL:
   ```
   https://stripewebhook-ga4dq66rtq-uc.a.run.app
   ```
   OR
   ```
   https://us-central1-basketball-ai-app-db000.cloudfunctions.net/stripeWebhook
   ```

3. Ensure these events are selected:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. If not configured, add a new endpoint with the URL above

### Step 2: Test In-App Payment Flow

On your EAS dev build device:

1. **Open the app** and navigate to a premium feature
2. **Tap "Upgrade"** - this should open the subscription modal
3. **Select a tier** (Basic, Premium, or Pro)
4. **Wait for payment sheet** - It should open IN THE APP (not browser)
   - You should see the Stripe payment form with card input
   - This is the native payment sheet from `@stripe/stripe-react-native`

5. **Enter test card details**:
   ```
   Card: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

6. **Complete payment**
   - Should show success message in app
   - Modal should close

### Step 3: Verify in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/payments
2. Find your payment - should show **"Succeeded"** status
3. Go to https://dashboard.stripe.com/test/subscriptions
4. Find your subscription - should show **"Active"** status (not "Incomplete")

### Step 4: Verify in Firestore

1. Go to Firebase Console > Firestore Database
2. Navigate to `users/{your-user-id}`
3. Check these fields were updated:
   ```
   subscription: "basic" | "premium" | "pro"
   subscriptionDetails: {
     tier: "basic" | "premium" | "pro",
     status: "active",
     stripeCustomerId: "cus_...",
     stripeSubscriptionId: "sub_...",
     currentPeriodEnd: "2025-12-16T...",  // Should be ~30 days from now
     cancelAtPeriodEnd: false,
     updatedAt: "2025-11-16T..."
   }
   ```

### Step 5: Verify App Shows Premium Access

1. Restart the app or navigate to profile
2. Subscription tier should display correctly
3. Premium features should now be unlocked

## Monitoring

### Check Function Logs

View real-time logs:
```bash
# Watch createSubscriptionPayment logs
firebase functions:log --only createSubscriptionPayment

# Watch webhook logs
firebase functions:log --only stripeWebhook

# Watch both
firebase functions:log --only createSubscriptionPayment,stripeWebhook
```

### What to Look For

**Successful createSubscriptionPayment logs**:
```
Subscription created: sub_xxxxx
Latest invoice type: object
Payment intent retrieved successfully: pi_xxxxx
```

**Successful webhook logs**:
```
(No error messages should appear)
```

**In Stripe Dashboard > Events**:
- Look for successful webhook deliveries
- All should show green checkmarks

## Troubleshooting

### Payment Sheet Doesn't Open

**Possible Issues**:
1. Function is erroring before returning clientSecret
2. Network connectivity issue

**Debug**:
```bash
firebase functions:log --only createSubscriptionPayment
```
Look for the error message.

### Payment Succeeds but Subscription Not Active in Firestore

**Possible Issues**:
1. Webhook not configured in Stripe
2. Webhook secret mismatch
3. Firestore security rules blocking update

**Debug**:
1. Check Stripe Dashboard > Webhooks > Endpoint > Recent deliveries
2. Look for failed deliveries and error messages
3. Check webhook logs:
   ```bash
   firebase functions:log --only stripeWebhook
   ```

### Still Getting "Incomplete" Subscriptions

**Possible Issues**:
1. Payment is failing silently
2. Stripe test mode issue

**Debug**:
1. Check Stripe Dashboard > Payments for failure reason
2. Check function logs for errors
3. Verify test card number is exactly: `4242 4242 4242 4242`

## Key Differences from Before

### Before (Payment Links)
- User was redirected to browser
- Had to complete payment on Stripe's hosted page
- Manual process to update Firestore

### Now (In-App Payment Sheet)
- ✅ Payment sheet opens inside the app
- ✅ Better user experience (no browser redirect)
- ✅ Automatic Firestore updates via webhooks
- ✅ Real-time subscription status
- ✅ Supports Apple Pay / Google Pay (when configured)

## Production Checklist

Before going live:

- [ ] Test complete subscription lifecycle
- [ ] Test payment failures
- [ ] Test subscription cancellation
- [ ] Switch Stripe from test to live mode
- [ ] Update secret keys:
  ```bash
  firebase functions:secrets:set STRIPE_SECRET_KEY
  # (use live secret key: sk_live_...)
  ```
- [ ] Update webhook secret in Stripe live mode
- [ ] Update publishable key in `src/App.js`
- [ ] Move publishable key to environment variables
- [ ] Configure production webhook URL in Stripe
- [ ] Test with real card (small amount)
- [ ] Set up subscription management UI
- [ ] Add analytics tracking
- [ ] Set up error monitoring (Sentry, etc.)

## Support

- Stripe Dashboard: https://dashboard.stripe.com/test
- Firebase Console: https://console.firebase.google.com/project/basketball-ai-app-db000
- Stripe Docs: https://stripe.com/docs/payments/accept-a-payment
- Firebase Functions Logs: `firebase functions:log`

---

**Status**: ✅ Ready for Testing
**Next Step**: Test the payment flow on your device!
