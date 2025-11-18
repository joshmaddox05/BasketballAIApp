# Stripe Configuration Quick Reference

## Stripe Account
- **Account ID**: `acct_1SNiC5PTDEZhEg0x`
- **Display Name**: Basketball AI Ecosystem sandbox
- **Mode**: Test Mode

## Products & Prices

### Basketball AI Basic - $4.99/month
- **Product ID**: `prod_TQdxZeJHJNYSHC`
- **Price ID**: `price_1STmgCPTDEZhEg0xiJ70H58F`
- **Features**: Unlimited workouts, no ads, basic AI analysis

### Basketball AI Premium - $9.99/month
- **Product ID**: `prod_TQdxkEqoP9CMhd`
- **Price ID**: `price_1STmgJPTDEZhEg0xSK0Dsa9d`
- **Features**: Advanced AI, mentor sessions, exclusive challenges

### Basketball AI Pro - $19.99/month
- **Product ID**: `prod_TQdx4yxgSC9qWh`
- **Price ID**: `price_1STmgLPTDEZhEg0xp3Srlc8i`
- **Features**: Personalized training, unlimited mentors, priority support

## API Keys (Get from Stripe Dashboard)

### Test Mode Keys
📍 Get from: https://dashboard.stripe.com/test/apikeys

- **Publishable Key** (for app): `pk_test_...` ← Add to `src/App.js`
- **Secret Key** (for backend): `sk_test_...` ← Add to Firebase Functions config

### Webhook Configuration
📍 Configure at: https://dashboard.stripe.com/test/webhooks

- **Webhook URL**: `https://YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
- **Webhook Secret**: `whsec_...` ← You'll get this after creating the endpoint

## Files to Update

### 1. src/App.js
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE';
```

### 2. src/services/stripePaymentService.js
```javascript
const response = await fetch('https://YOUR_PROJECT.cloudfunctions.net/createSubscriptionPayment', {
```

### 3. Firebase Functions Config
```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_KEY"
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
```

## Test Cards

### Successful Payment
- **Card**: 4242 4242 4242 4242
- **Exp**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

### Additional Test Cards
- **3D Secure**: 4000 0027 6000 3184
- **Declined**: 4000 0000 0000 0002
- **Insufficient Funds**: 4000 0000 0000 9995

More at: https://stripe.com/docs/testing

## Important Links

- **Dashboard**: https://dashboard.stripe.com/test
- **API Keys**: https://dashboard.stripe.com/test/apikeys
- **Products**: https://dashboard.stripe.com/test/products
- **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
- **Customers**: https://dashboard.stripe.com/test/customers
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Logs**: https://dashboard.stripe.com/test/logs

## Command Reference

### Initialize Firebase Functions
```bash
firebase init functions
```

### Install Dependencies
```bash
cd functions
npm install stripe firebase-admin
```

### Configure Stripe Keys
```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_KEY"
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
```

### Deploy Functions
```bash
firebase deploy --only functions
```

### View Logs
```bash
firebase functions:log
```

## Price Mapping (for Cloud Function)

Update this in `functions/createSubscriptionPayment.js`:

```javascript
const priceToTierMap = {
  'price_1STmgCPTDEZhEg0xiJ70H58F': 'basic',
  'price_1STmgJPTDEZhEg0xSK0Dsa9d': 'premium',
  'price_1STmgLPTDEZhEg0xp3Srlc8i': 'pro',
};
```

## Return URL Schemes

### iOS (app.json)
```json
"scheme": "basketballai"
```

### Android (app.json)
```json
"intentFilters": [
  {
    "action": "VIEW",
    "data": [{ "scheme": "basketballai" }],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

## Quick Setup Steps

1. ✅ Get publishable key from Stripe Dashboard
2. ✅ Add to `src/App.js`
3. ✅ Initialize Firebase Functions
4. ✅ Set secret key in Firebase config
5. ✅ Deploy functions
6. ✅ Update Cloud Function URL in `stripePaymentService.js`
7. ✅ Create webhook endpoint in Stripe
8. ✅ Set webhook secret in Firebase config
9. ✅ Redeploy functions
10. ✅ Test with test card

## Need These Keys?

Go get them now:
1. **Publishable Key**: https://dashboard.stripe.com/test/apikeys
2. **Secret Key**: https://dashboard.stripe.com/test/apikeys (click "Reveal test key")
3. **Webhook Secret**: Create endpoint first at https://dashboard.stripe.com/test/webhooks

---

**Note**: All the above are TEST mode keys. When going to production, get the LIVE mode equivalents and update accordingly.
