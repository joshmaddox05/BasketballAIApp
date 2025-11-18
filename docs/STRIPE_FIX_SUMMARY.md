# Stripe Subscription Fix Summary

## Issue Identified
The Firebase Cloud Function `createSubscriptionPayment` was failing with the error:
```
Error: Payment intent not expanded properly
```

This was causing payments to appear as "incomplete" in Stripe because the client secret couldn't be returned to the mobile app.

## Root Cause
When creating a Stripe subscription, the `expand: ['latest_invoice.payment_intent']` parameter wasn't reliably returning the fully expanded payment intent object. This is a known issue with Stripe's API where expansion can fail silently.

## Fix Applied
Updated `/functions/index.js` to handle all possible expansion scenarios:

1. ✅ If invoice wasn't expanded → retrieve it with expansion
2. ✅ If invoice was expanded but payment intent wasn't → retrieve payment intent separately
3. ✅ If everything was properly expanded → use the expanded object
4. ✅ Added proper error handling for missing client secrets

## Changes Made
- **File**: `functions/index.js:76-121`
- **Function**: `createSubscriptionPayment`
- **Status**: ✅ Deployed to Firebase (us-central1)

## Testing Instructions

### 1. Test the Subscription Flow
On your EAS dev build:

1. Navigate to a premium feature to trigger the subscription modal
2. Select a subscription tier (Basic, Premium, or Pro)
3. Complete payment with test card: `4242 4242 4242 4242`
   - Use any future expiration date
   - Use any 3-digit CVC
   - Use any postal code
4. Verify the payment sheet opens without errors
5. Complete the payment
6. Check that the payment shows as "succeeded" in your [Stripe Dashboard](https://dashboard.stripe.com/test/payments)

### 2. Verify Subscription Creation
After successful payment:

1. Check [Stripe Subscriptions](https://dashboard.stripe.com/test/subscriptions) for the new subscription
2. It should show status as "Active" (not "Incomplete")
3. Verify the correct price tier is selected

### 3. Check Firebase Logs
Monitor the function execution:

```bash
firebase functions:log --only createSubscriptionPayment
```

You should see successful execution logs without errors.

## Important: Webhook Setup Required

⚠️ **Critical Next Step**: The subscription will be created in Stripe, but your app won't automatically update the user's subscription tier until webhooks are configured.

### Setting Up Stripe Webhooks

1. Go to [Stripe Webhooks Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter webhook URL:
   ```
   https://us-central1-basketball-ai-app-db000.cloudfunctions.net/stripeWebhook
   ```
4. Select these events to listen to:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Save it to Firebase:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
7. Redeploy the webhook function:
   ```bash
   firebase deploy --only functions:stripeWebhook
   ```

### Testing Webhooks

After webhook setup:
1. Make a test subscription payment
2. Check [Stripe Events](https://dashboard.stripe.com/test/events) to see webhook delivery
3. Verify your Firestore user document updates with:
   - `subscription`: 'basic' | 'premium' | 'pro'
   - `subscriptionDetails.status`: 'active'
   - `subscriptionDetails.stripeSubscriptionId`
   - Other subscription metadata

## Current Configuration

### Stripe Test Mode
- ✅ Publishable Key: Configured in `src/App.js`
- ✅ Secret Key: Stored in Firebase Secret Manager
- ⚠️ Webhook Secret: **Needs to be configured**

### Subscription Tiers
| Tier | Price | Price ID |
|------|-------|----------|
| Basic | $4.99/mo | `price_1STmgCPTDEZhEg0xiJ70H58F` |
| Premium | $9.99/mo | `price_1STmgJPTDEZhEg0xSK0Dsa9d` |
| Pro | $19.99/mo | `price_1STmgLPTDEZhEg0xp3Srlc8i` |

## Troubleshooting

### If Payment Still Shows as Incomplete
1. Check Firebase logs: `firebase functions:log`
2. Verify the Stripe secret key is valid
3. Ensure the mobile app has internet connectivity
4. Check that the Stripe SDK version is compatible

### If Subscription Tier Doesn't Update in App
1. Verify webhooks are configured (see above)
2. Check webhook delivery in Stripe Dashboard
3. Verify Firestore security rules allow webhook updates
4. Check that user document has `firebaseUID` in Stripe metadata

### If Payment Sheet Doesn't Open
1. Verify `@stripe/stripe-react-native` is installed
2. Check that `StripeProvider` wraps the app (in `src/App.js`)
3. Ensure publishable key is valid
4. Rebuild the EAS dev build if needed

## Next Steps for Production

Before going live:
1. ☐ Set up webhooks (see above)
2. ☐ Test complete subscription lifecycle
3. ☐ Test subscription cancellation flow
4. ☐ Test failed payment handling
5. ☐ Switch from test to live Stripe keys
6. ☐ Move publishable key to environment variables
7. ☐ Add subscription management UI (cancel, upgrade, downgrade)
8. ☐ Implement proper error handling and user notifications
9. ☐ Add analytics tracking for subscription events

## Support Resources
- [Stripe Subscriptions Docs](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env#secret-manager)

---

**Status**: ✅ Function deployed and ready for testing
**Last Updated**: 2025-11-16
