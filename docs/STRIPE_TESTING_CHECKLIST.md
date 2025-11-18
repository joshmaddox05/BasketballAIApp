# Stripe Subscription Testing Checklist

## 🎯 Quick Setup Checklist

- [ ] Stripe API keys configured in Firebase
  ```bash
  firebase functions:config:set stripe.secret_key="sk_test_..."
  ```

- [ ] Webhook secret configured
  ```bash
  firebase functions:config:set stripe.webhook_secret="whsec_..."
  ```

- [ ] Firebase Functions deployed
  ```bash
  firebase deploy --only functions
  ```

- [ ] Stripe webhook endpoint configured
  - URL: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
  - Events selected: subscription.*, invoice.*, payment_intent.*

- [ ] Price IDs verified in `src/config/stripe.js`

## ✅ Test Scenarios

### Scenario 1: Successful Subscription
**Steps:**
1. Open app and navigate to subscription modal
2. Select a premium plan (Basic, Premium, or Pro)
3. Enter test card: `4242 4242 4242 4242`
4. Expiry: Any future date (e.g., 12/25)
5. CVC: 123
6. Complete payment

**Expected Results:**
- [x] Payment Sheet closes
- [x] Success alert appears: "Welcome to [Plan]! Your subscription is now active."
- [x] Modal closes
- [x] User's subscription tier updates in Firestore
- [x] Stripe Dashboard shows new subscription
- [x] Webhook event `customer.subscription.created` received

**Verify in:**
- Firebase Console → Firestore → users → [uid] → subscription field
- Stripe Dashboard → Subscriptions

---

### Scenario 2: Declined Card
**Steps:**
1. Open subscription modal
2. Select a plan
3. Enter declined card: `4000 0000 0000 0002`
4. Complete form

**Expected Results:**
- [x] Error alert appears: "Payment Failed"
- [x] User remains on subscription modal
- [x] Can try again with different card
- [x] No subscription created in Stripe
- [x] User's tier remains unchanged

---

### Scenario 3: 3D Secure Authentication
**Steps:**
1. Open subscription modal
2. Select a plan
3. Enter 3DS card: `4000 0027 6000 3184`
4. Complete form

**Expected Results:**
- [x] Authentication modal appears
- [x] User completes authentication
- [x] Payment succeeds
- [x] Subscription activated

---

### Scenario 4: User Cancels Payment
**Steps:**
1. Open subscription modal
2. Select a plan
3. Payment Sheet opens
4. Click "X" to close

**Expected Results:**
- [x] Payment Sheet closes
- [x] No error message (user canceled)
- [x] Subscription modal still open
- [x] Can try again

---

### Scenario 5: Insufficient Funds
**Steps:**
1. Open subscription modal
2. Select a plan
3. Enter card: `4000 0000 0000 9995`
4. Complete form

**Expected Results:**
- [x] Error alert: "Payment Failed"
- [x] Specific error about insufficient funds
- [x] User can try with different card

---

## 🔍 Verification Steps

### Check Firebase Functions Logs
```bash
firebase functions:log --only createSubscriptionPayment,stripeWebhook
```

Look for:
- "Creating subscription payment intent..."
- "Payment intent created successfully"
- "Received webhook event: customer.subscription.created"
- "Updated subscription for user [uid]: [tier] (active)"

### Check Stripe Dashboard

**Subscriptions:**
1. Go to https://dashboard.stripe.com/test/subscriptions
2. Find your subscription
3. Verify:
   - Status: Active
   - Customer name/email
   - Plan/Price
   - Metadata: `firebaseUID` = your user's UID

**Customers:**
1. Go to https://dashboard.stripe.com/test/customers
2. Find your customer
3. Verify:
   - Email matches user's email
   - Has active subscription
   - Payment method saved

**Webhooks:**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click your webhook endpoint
3. Check "Events" tab
4. Verify recent events were delivered successfully

### Check Firestore Database

1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to: `users` → [user-uid]
4. Verify fields:
   ```javascript
   {
     subscription: "premium", // or "basic", "pro"
     subscriptionDetails: {
       tier: "premium",
       status: "active",
       stripeCustomerId: "cus_...",
       stripeSubscriptionId: "sub_...",
       currentPeriodStart: "2025-01-17T...",
       currentPeriodEnd: "2025-02-17T...",
       cancelAtPeriodEnd: false,
       canceledAt: null,
       updatedAt: "2025-01-17T..."
     }
   }
   ```

---

## 🧪 Test Cards

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| Success | 4242 4242 4242 4242 | 12/25 | 123 |
| Decline | 4000 0000 0000 0002 | 12/25 | 123 |
| 3D Secure | 4000 0027 6000 3184 | 12/25 | 123 |
| Insufficient Funds | 4000 0000 0000 9995 | 12/25 | 123 |
| Expired Card | 4000 0000 0000 0069 | 12/25 | 123 |
| Processing Error | 4000 0000 0000 0119 | 12/25 | 123 |

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to create payment intent"
**Check:**
- Firebase Functions config: `firebase functions:config:get`
- Stripe secret key is set correctly
- User is authenticated (Firebase Auth)
- Price ID exists in Stripe

**Fix:**
```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_KEY"
firebase deploy --only functions
```

---

### Issue: Payment succeeds but subscription not updated
**Check:**
- Webhook is configured correctly
- Webhook secret is set in Firebase config
- Functions logs: `firebase functions:log`
- Stripe webhook events dashboard

**Fix:**
```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
firebase deploy --only functions
```

---

### Issue: "Webhook signature verification failed"
**Check:**
- Webhook secret in Stripe Dashboard
- Firebase config: `firebase functions:config:get`
- Functions were redeployed after setting webhook secret

**Fix:**
1. Get webhook secret from Stripe Dashboard
2. Set in Firebase: `firebase functions:config:set stripe.webhook_secret="whsec_..."`
3. Redeploy: `firebase deploy --only functions`

---

### Issue: "Customer not found"
**This is handled automatically!** The code now:
1. Tries to retrieve existing customer
2. If not found or deleted, creates a new customer
3. Saves new customer ID to Firestore

---

### Issue: Payment Sheet won't initialize
**Check:**
- Stripe publishable key in `src/App.js`
- Firebase Cloud Function returns all required fields
- Console logs for specific error

**Debug:**
```javascript
// In stripePaymentService.js, check console logs:
console.log('Payment intent created successfully');
console.log('Payment sheet initialized successfully');
```

---

## 📱 Manual Testing Workflow

### Complete Flow Test (5-10 minutes)

1. **Setup** (1 min)
   - Ensure you have test Stripe account
   - Firebase project configured
   - App built with dev client

2. **Test New Subscription** (2 min)
   - Launch app
   - Navigate to subscription screen
   - Select "Premium" plan
   - Enter test card: 4242 4242 4242 4242
   - Complete payment
   - Verify success message

3. **Verify Backend** (2 min)
   - Check Firestore: user's subscription field
   - Check Stripe Dashboard: new subscription created
   - Check Functions logs: no errors

4. **Test Upgrade** (2 min)
   - Go back to subscription screen
   - Select "Pro" plan
   - Complete payment
   - Verify upgrade

5. **Test Error Handling** (2 min)
   - Select a plan
   - Enter declined card: 4000 0000 0000 0002
   - Verify error message
   - User can try again

---

## ✨ Success Indicators

You know it's working when:

- ✅ Payment Sheet opens and shows your subscription plans
- ✅ Test card payment completes successfully
- ✅ Success message appears
- ✅ Firestore shows updated subscription
- ✅ Stripe Dashboard shows new subscription
- ✅ Webhook events are delivered successfully
- ✅ Functions logs show no errors
- ✅ User's app reflects new subscription tier

---

## 📞 Need Help?

1. **Check logs first:**
   ```bash
   # Firebase Functions
   firebase functions:log

   # React Native
   npx react-native log-ios  # or log-android
   ```

2. **Check Stripe Dashboard:**
   - Events: See what's happening
   - Logs: API requests and responses

3. **Test webhook locally:**
   ```bash
   stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook
   ```

4. **Verify configuration:**
   ```bash
   firebase functions:config:get
   ```

---

**Last Updated**: 2025-01-17
**Version**: 1.0
**Status**: Ready for Testing ✅
