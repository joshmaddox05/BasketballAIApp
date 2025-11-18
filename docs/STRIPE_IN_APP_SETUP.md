# Stripe In-App Payment Setup Guide

## Overview
This guide will help you set up in-app Stripe payments for subscriptions using Stripe's Payment Sheet. Users will complete payments directly in the app without being redirected to a browser.

## ✅ What's Already Done

1. **Stripe React Native SDK installed** - `@stripe/stripe-react-native`
2. **Payment Sheet integration created** - `src/services/stripePaymentService.js`
3. **SubscriptionModal updated** - Now uses in-app payments
4. **Cloud Function template created** - `functions/createSubscriptionPayment.js`
5. **Stripe products and prices created** - Ready in your Stripe account

## 🔧 Required Setup Steps

### Step 1: Get Your Stripe Publishable Key

1. Go to [Stripe Dashboard API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Open `src/App.js`
4. Replace this line:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SNiC5PTDEZhEg0xYOUR_PUBLISHABLE_KEY_HERE';
   ```
   with your actual key:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_ACTUAL_KEY';
   ```

### Step 2: Set Up Firebase Cloud Functions

#### Initialize Firebase Functions (if not already done):

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize functions in your project
firebase init functions
```

When prompted:
- Choose **JavaScript** (or TypeScript if you prefer)
- Choose **Yes** to install dependencies

#### Install Stripe in Functions:

```bash
cd functions
npm install stripe firebase-admin
cd ..
```

#### Copy the Cloud Function Code:

The function code is already in `functions/createSubscriptionPayment.js`. Move it to your functions directory:

```bash
# If using JavaScript
cp functions/createSubscriptionPayment.js functions/index.js

# Or add it to your existing functions/index.js
```

#### Set Stripe Secret Key:

```bash
# Get your secret key from: https://dashboard.stripe.com/test/apikeys
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY_HERE"
```

#### Deploy Functions:

```bash
firebase deploy --only functions
```

After deployment, you'll get a URL like:
```
https://us-central1-YOUR_PROJECT.cloudfunctions.net/createSubscriptionPayment
```

### Step 3: Update Payment Service URL

1. Open `src/services/stripePaymentService.js`
2. Find this line:
   ```javascript
   const response = await fetch('https://YOUR_CLOUD_FUNCTION_URL/createSubscriptionPayment', {
   ```
3. Replace with your actual Cloud Function URL:
   ```javascript
   const response = await fetch('https://us-central1-YOUR_PROJECT.cloudfunctions.net/createSubscriptionPayment', {
   ```

### Step 4: Set Up Stripe Webhooks

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Enter your Cloud Function webhook URL:
   ```
   https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Set it in Firebase:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
   ```
8. Redeploy functions:
   ```bash
   firebase deploy --only functions
   ```

## 🧪 Testing

### Test Cards

Use these test card numbers in the app:

- **Success**: `4242 4242 4242 4242`
- **Requires 3D Secure**: `4000 0027 6000 3184`
- **Declined**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

Use any:
- Future expiration date (e.g., 12/34)
- 3-digit CVC (e.g., 123)
- 5-digit ZIP code (e.g., 12345)

### Test Flow

1. Run your app
2. Navigate to a feature that shows the subscription modal
3. Tap "Upgrade to Premium" (or any tier)
4. Select a plan
5. The Stripe Payment Sheet should appear **in the app**
6. Enter test card details
7. Complete payment
8. Check Firestore to see updated subscription status

### Verify in Stripe Dashboard

- [Customers](https://dashboard.stripe.com/test/customers) - Should show new customer
- [Subscriptions](https://dashboard.stripe.com/test/subscriptions) - Should show active subscription
- [Logs](https://dashboard.stripe.com/test/logs) - Check webhook events

## 📱 iOS Configuration (Important!)

For iOS, you need to add URL schemes to handle return URLs from Stripe:

1. Open `app.json`
2. Add this to the `expo` section:
   ```json
   "scheme": "basketballai",
   "ios": {
     "bundleIdentifier": "com.yourcompany.basketballai",
     "infoPlist": {
       "CFBundleURLTypes": [
         {
           "CFBundleURLSchemes": ["basketballai"]
         }
       ]
     }
   }
   ```

## 🤖 Android Configuration

For Android, the return URL scheme should work automatically, but verify in `app.json`:

```json
"android": {
  "package": "com.yourcompany.basketballai",
  "intentFilters": [
    {
      "action": "VIEW",
      "data": [
        {
          "scheme": "basketballai"
        }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
}
```

## 🔒 Security Best Practices

### ✅ DO:
- Keep your secret key on the backend only
- Validate webhook signatures
- Use HTTPS for all endpoints
- Implement proper authentication
- Test thoroughly before going live

### ❌ DON'T:
- Never put secret keys in the app code
- Don't skip webhook signature verification
- Don't trust client-side data for pricing

## 🚀 Going to Production

When you're ready to go live:

1. **Switch to Live Mode in Stripe**:
   - Get live API keys from [Dashboard](https://dashboard.stripe.com/apikeys)
   - Update both publishable and secret keys
   - Update webhook endpoint to production URL

2. **Create Live Products**:
   - Recreate products in live mode
   - Update `src/config/stripe.js` with live price IDs

3. **Update Cloud Functions**:
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_YOUR_LIVE_SECRET_KEY"
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET"
   firebase deploy --only functions
   ```

4. **Test with Real Cards**:
   - Start with small amounts
   - Test all flows (subscribe, cancel, failed payment)
   - Verify webhooks are working

## 📊 Monitoring

### Important Metrics
- Subscription conversion rate
- Payment success rate
- Webhook delivery success rate
- Customer lifetime value

### Stripe Dashboard Sections
- **Home** - Overview of payments and subscriptions
- **Payments** - All payment transactions
- **Subscriptions** - Active and canceled subscriptions
- **Customers** - Customer profiles and payment methods
- **Webhooks** - Webhook delivery logs
- **Logs** - API request logs

## 🐛 Troubleshooting

### Payment Sheet Not Appearing
- Check if Stripe publishable key is correct
- Verify Cloud Function is deployed and accessible
- Check browser/device console for errors

### Payment Fails with "Payment method is invalid"
- Test card might not work in test mode
- Check if you're using correct test card numbers

### Webhook Not Receiving Events
- Verify webhook URL is correct
- Check webhook signing secret is set
- View webhook attempts in Stripe Dashboard

### Subscription Not Updating in App
- Check Firestore rules allow writes
- Verify webhook handler is processing events
- Check Cloud Function logs for errors

## 📚 Additional Resources

- [Stripe React Native Docs](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [Payment Sheet Guide](https://stripe.com/docs/payments/accept-a-payment?platform=react-native&ui=payment-sheet)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)

## ✅ Setup Checklist

- [ ] Stripe publishable key added to `src/App.js`
- [ ] Firebase Functions initialized
- [ ] Stripe package installed in functions
- [ ] Stripe secret key configured in Firebase
- [ ] Cloud Functions deployed
- [ ] Cloud Function URL updated in `stripePaymentService.js`
- [ ] Stripe webhook endpoint created
- [ ] Webhook secret configured in Firebase
- [ ] iOS URL scheme configured (if building for iOS)
- [ ] Android intent filters configured (if building for Android)
- [ ] Test payment completed successfully
- [ ] Firestore subscription status updates correctly
- [ ] Webhook events processing correctly

## 🎉 You're Ready!

Once all the steps above are complete, users can:
1. Select a subscription plan
2. Enter payment details in-app
3. Complete subscription without leaving the app
4. Get instant access to premium features
5. Manage subscriptions through Stripe Customer Portal (optional feature to add later)

## Need Help?

If you run into issues:
1. Check Cloud Function logs: `firebase functions:log`
2. Check Stripe Dashboard logs
3. Review the troubleshooting section above
4. Consult Stripe documentation

Good luck with your subscription implementation! 🚀
