# Stripe Subscriptions Setup Guide

This guide explains how to set up and test the Stripe subscription feature in the Basketball AI Training app following the official Stripe React Native guide.

## ✅ What's Been Implemented

### 1. **Backend (Firebase Cloud Functions)**
- ✅ `createSubscriptionPayment` - Creates subscription with CustomerSession support
- ✅ `stripeWebhook` - Handles subscription lifecycle events
- ✅ Proper customer management with fallback for deleted customers
- ✅ Enhanced error handling and logging

### 2. **Frontend (React Native)**
- ✅ Updated Payment Sheet initialization with CustomerSession
- ✅ Improved error handling and user feedback
- ✅ Better UI states (loading, processing, errors)
- ✅ Support for both CustomerSession (new) and EphemeralKey (legacy)

### 3. **Webhook Handlers**
- ✅ `customer.subscription.created` - Activates subscription
- ✅ `customer.subscription.updated` - Updates subscription status
- ✅ `customer.subscription.deleted` - Reverts to free tier
- ✅ `invoice.payment_succeeded` - Confirms successful payment
- ✅ `invoice.payment_failed` - Handles payment failures

## 📋 Prerequisites

Before you start, make sure you have:

1. ✅ Firebase project set up
2. ✅ Stripe account (test mode)
3. ✅ Firebase CLI installed: `npm install -g firebase-tools`
4. ✅ Stripe CLI (optional, for testing webhooks locally)

## 🚀 Setup Instructions

### Step 1: Configure Stripe API Keys

1. **Get your Stripe API keys**:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Copy your **Secret key** (starts with `sk_test_`)

2. **Set the Firebase Cloud Function Stripe secret**:
   ```bash
   cd functions
   firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"
   ```

3. **Verify the configuration**:
   ```bash
   firebase functions:config:get
   ```

### Step 2: Deploy Firebase Cloud Functions

1. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Deploy the functions**:
   ```bash
   firebase deploy --only functions
   ```

   This will deploy:
   - `createSubscriptionPayment` - Main subscription creation function
   - `stripeWebhook` - Webhook handler for Stripe events

3. **Note the deployed URLs**:
   After deployment, you'll see URLs like:
   ```
   Function URL (createSubscriptionPayment): https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/createSubscriptionPayment
   Function URL (stripeWebhook): https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```

### Step 3: Configure Stripe Webhooks

1. **Go to Stripe Dashboard**:
   - Open https://dashboard.stripe.com/test/webhooks

2. **Add endpoint**:
   - Click "Add endpoint"
   - Endpoint URL: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
   - Description: "Basketball AI - Subscription events"

3. **Select events to listen to**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

4. **Get the webhook signing secret**:
   - After creating the endpoint, click to reveal the **Signing secret**
   - It will start with `whsec_`

5. **Configure webhook secret in Firebase**:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
   ```

6. **Redeploy functions with new webhook secret**:
   ```bash
   firebase deploy --only functions
   ```

### Step 4: Verify Products and Prices

1. **Check your Stripe products**:
   - Go to https://dashboard.stripe.com/test/products
   - Verify you have three products: Basic, Premium, Pro

2. **Verify price IDs** in `src/config/stripe.js`:
   ```javascript
   prices: {
     basic: 'price_1STmgCPTDEZhEg0xiJ70H58F',
     premium: 'price_1STmgJPTDEZhEg0xSK0Dsa9d',
     pro: 'price_1STmgLPTDEZhEg0xp3Srlc8i',
   }
   ```

3. **Update if needed**:
   - If your price IDs are different, update both:
     - `src/config/stripe.js`
     - `functions/createSubscriptionPayment.js` (in the `priceToTierMap`)

### Step 5: Build and Test the App

1. **Build the app with development client**:
   ```bash
   npx expo prebuild
   npm run ios  # or npm run android
   ```

2. **Test the subscription flow**:
   - Open the app
   - Navigate to a screen that shows the subscription modal
   - Click on a subscription plan (Basic, Premium, or Pro)
   - Enter test card details:
     - Card number: `4242 4242 4242 4242`
     - Expiry: Any future date
     - CVC: Any 3 digits
     - ZIP: Any 5 digits
   - Complete the payment

3. **Verify in Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/test/subscriptions
   - You should see your new subscription
   - Check https://dashboard.stripe.com/test/customers to see the customer

4. **Verify in Firestore**:
   - Open Firebase Console
   - Go to Firestore Database
   - Find your user document
   - Check that `subscription` and `subscriptionDetails` fields are updated

## 🧪 Testing

### Test Card Numbers

Use these test cards for different scenarios:

| Scenario | Card Number | Description |
|----------|-------------|-------------|
| Success | `4242 4242 4242 4242` | Payment succeeds |
| Decline | `4000 0000 0000 0002` | Card declined |
| 3D Secure | `4000 0027 6000 3184` | Requires authentication |
| Insufficient funds | `4000 0000 0000 9995` | Insufficient funds |

### Testing Webhooks Locally

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local functions**:
   ```bash
   stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook
   ```

4. **Trigger test events**:
   ```bash
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_succeeded
   stripe trigger invoice.payment_failed
   ```

### Common Test Scenarios

#### 1. New Subscription
```
1. User selects a plan
2. Enters card details (4242 4242 4242 4242)
3. Payment Sheet closes
4. Success message appears
5. User's Firestore document is updated
6. Webhook confirms subscription created
```

#### 2. Failed Payment
```
1. User selects a plan
2. Enters declined card (4000 0000 0000 0002)
3. Error message appears
4. User can try again
```

#### 3. Subscription Update
```
1. User already has Basic subscription
2. Upgrades to Premium
3. Stripe prorates the charge
4. Webhook updates the subscription
```

## 🔍 Troubleshooting

### Issue: "Functions config not found"
**Solution**: Make sure you've set the Stripe keys:
```bash
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

### Issue: "Authentication required"
**Solution**: Ensure the user is signed in with Firebase Auth before attempting payment.

### Issue: "Webhook signature verification failed"
**Solution**:
1. Make sure you've deployed functions AFTER setting the webhook secret
2. Verify the webhook secret in Stripe Dashboard matches your Firebase config
3. Check that the endpoint URL in Stripe matches your deployed function URL

### Issue: "Customer not found"
**Solution**: The code now handles this automatically by creating a new customer if the old one was deleted.

### Issue: Payment succeeds but subscription not updated
**Solution**:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify webhook is properly configured in Stripe Dashboard
3. Check that webhook events are being sent (view in Stripe Dashboard > Webhooks > Events)

### Issue: "Payment sheet fails to initialize"
**Solution**:
1. Check console logs for detailed error messages
2. Verify the Firebase Cloud Function returns all required fields
3. Ensure Stripe publishable key is correct in `src/App.js`

## 📊 Monitoring

### Firebase Functions Logs
```bash
firebase functions:log --only createSubscriptionPayment,stripeWebhook
```

### Stripe Dashboard Monitoring
1. **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
2. **Customers**: https://dashboard.stripe.com/test/customers
3. **Webhooks**: https://dashboard.stripe.com/test/webhooks
4. **Events**: https://dashboard.stripe.com/test/events

## 🚀 Going to Production

When you're ready to go live:

1. **Switch to live mode keys**:
   - Get live keys from https://dashboard.stripe.com/apikeys
   - Update `src/App.js` with live publishable key
   - Set live secret key: `firebase functions:config:set stripe.secret_key="sk_live_..."`

2. **Set up live webhook**:
   - Create webhook endpoint with live mode URL
   - Set live webhook secret: `firebase functions:config:set stripe.webhook_secret="whsec_live_..."`

3. **Update price IDs**:
   - Create live mode products and prices in Stripe Dashboard
   - Update `src/config/stripe.js` with live price IDs
   - Update `functions/createSubscriptionPayment.js` price map

4. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

5. **Test thoroughly** with real cards in test mode first!

## 📱 Additional Features to Consider

### Customer Portal
Allow users to manage their subscriptions:
- Cancel subscription
- Update payment method
- View billing history

Implementation: Use Stripe Customer Portal or build custom UI

### Promotional Codes
Add coupon support:
- Update Cloud Function to accept coupon codes
- Apply discounts during subscription creation

### Multiple Products
Support different product types:
- Monthly vs. Annual billing
- Add-ons and upgrades
- Trial periods

### Notifications
Notify users about subscription events:
- Payment successful
- Payment failed
- Subscription canceled
- Trial ending soon

## 📚 References

- [Stripe React Native SDK](https://github.com/stripe/stripe-react-native)
- [Stripe Subscriptions Guide](https://docs.stripe.com/billing/subscriptions/overview)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Payment Sheet Documentation](https://docs.stripe.com/payments/accept-a-payment?platform=react-native)

## 🆘 Support

If you encounter issues:

1. Check the [Stripe Dashboard](https://dashboard.stripe.com/test/events) for webhook events
2. Check [Firebase Functions logs](https://console.firebase.google.com/project/_/functions/logs)
3. Review console logs in React Native debugger
4. Search [Stripe API documentation](https://docs.stripe.com/api)
5. Ask for help in [Stripe Discord](https://discord.gg/stripe)

---

**Status**: ✅ Subscription feature is fully implemented and ready for testing!
