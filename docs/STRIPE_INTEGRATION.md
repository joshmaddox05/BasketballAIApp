# Stripe Subscription Integration Guide

## Overview
This app uses Stripe for handling subscription payments. The integration is set up with payment links for easy testing and implementation.

## Current Setup

### Products Created
1. **Basketball AI Basic** - $4.99/month
   - Product ID: `prod_TQdxZeJHJNYSHC`
   - Price ID: `price_1STmgCPTDEZhEg0xiJ70H58F`
   - Payment Link: https://buy.stripe.com/test_aFa00l4Gv5LlgfR8By18c00

2. **Basketball AI Premium** - $9.99/month
   - Product ID: `prod_TQdxkEqoP9CMhd`
   - Price ID: `price_1STmgJPTDEZhEg0xSK0Dsa9d`
   - Payment Link: https://buy.stripe.com/test_bJe5kF0qfc9J1kXg4018c01

3. **Basketball AI Pro** - $19.99/month
   - Product ID: `prod_TQdx4yxgSC9qWh`
   - Price ID: `price_1STmgLPTDEZhEg0xp3Srlc8i`
   - Payment Link: https://buy.stripe.com/test_eVqeVfdd13Dd7Jl8By18c02

## How It Works

### User Flow
1. User taps "Upgrade" button in the SubscriptionModal
2. App opens the Stripe payment link in the browser
3. User completes payment on Stripe's hosted checkout page
4. Stripe processes the payment and creates a subscription
5. **(TODO)** Webhook notifies your backend of successful subscription
6. **(TODO)** Backend updates user's subscription status in Firestore
7. App refreshes and shows updated subscription tier

## Files Structure

```
src/
├── config/
│   └── stripe.js                 # Stripe configuration (payment links, product IDs)
├── services/
│   └── subscriptionService.js    # Subscription management functions
├── components/
│   └── shared/
│       └── SubscriptionModal.js  # Subscription UI with Stripe integration
└── utils/
    └── subscription.js           # Subscription tiers and access control
```

## Testing Subscriptions

### Test Mode
All products and payment links are currently in **test mode**. Use these test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Requires authentication**: `4000 0027 6000 3184`
- **Declined**: `4000 0000 0000 0002`

Use any future expiration date, any 3-digit CVC, and any postal code.

### Testing the Flow
1. Open the app and navigate to a premium feature
2. Tap on "Upgrade to Premium"
3. Select a subscription tier
4. The payment link will open in your browser
5. Complete the test payment
6. Check Stripe Dashboard to verify subscription was created

## Production Setup (TODO)

To make this production-ready, you need to:

### 1. Create a Backend API
You'll need a backend server (Node.js, Python, etc.) to:
- Handle Stripe webhooks
- Verify subscription status
- Update user data in Firestore

### 2. Set Up Stripe Webhooks

#### Required Webhooks:
- `checkout.session.completed` - When user completes payment
- `customer.subscription.updated` - When subscription changes
- `customer.subscription.deleted` - When subscription is canceled
- `invoice.payment_succeeded` - When recurring payment succeeds
- `invoice.payment_failed` - When recurring payment fails

#### Webhook Handler Example (Node.js):
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Get user ID from metadata
      const userId = session.client_reference_id;

      // Update user subscription in Firestore
      await admin.firestore().collection('users').doc(userId).update({
        subscription: session.metadata.tier,
        subscriptionDetails: {
          tier: session.metadata.tier,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodEnd: new Date(session.subscription.current_period_end * 1000),
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        }
      });
      break;

    case 'customer.subscription.updated':
      // Handle subscription updates (upgrades, downgrades, cancellations)
      break;

    case 'customer.subscription.deleted':
      // Revert user to free tier
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

### 3. Add Customer Metadata to Payment Links

To properly link Stripe customers to app users, you need to:

1. Create a backend endpoint that generates Stripe Checkout Sessions
2. Include user ID in the `client_reference_id` field
3. Update `src/config/stripe.js` to call your backend instead of using payment links

Example backend endpoint:
```javascript
app.post('/create-checkout-session', async (req, res) => {
  const { userId, priceId, tier } = req.body;

  const session = await stripe.checkout.sessions.create({
    client_reference_id: userId,
    customer_email: req.user.email,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    metadata: {
      userId: userId,
      tier: tier,
    },
    success_url: 'yourapp://subscription-success',
    cancel_url: 'yourapp://subscription-cancel',
  });

  res.json({ sessionUrl: session.url });
});
```

### 4. Update Payment Links Configuration

Replace direct payment links with backend API calls:

```javascript
// In src/config/stripe.js
export const createCheckoutSession = async (userId, tier, userEmail) => {
  const response = await fetch('https://your-backend.com/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      priceId: getPriceId(tier),
      tier,
      email: userEmail,
    }),
  });

  const data = await response.json();
  return data.sessionUrl;
};
```

### 5. Enable Customer Portal

Allow users to manage their subscriptions:

```javascript
// Backend endpoint
app.post('/create-portal-session', async (req, res) => {
  const { customerId } = req.body;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: 'yourapp://settings',
  });

  res.json({ url: session.url });
});
```

## Security Considerations

1. **Never expose Stripe secret keys in the app** - They should only be on your backend
2. **Validate webhooks** - Always verify webhook signatures
3. **Use HTTPS** - All backend endpoints must use HTTPS
4. **Verify user identity** - Ensure users can only access their own subscription data
5. **Handle edge cases** - Failed payments, subscription changes during billing period, etc.

## Monitoring

### Stripe Dashboard
- Monitor subscriptions: https://dashboard.stripe.com/subscriptions
- View payments: https://dashboard.stripe.com/payments
- Check webhooks: https://dashboard.stripe.com/webhooks

### Important Metrics to Track
- Monthly Recurring Revenue (MRR)
- Churn rate
- Failed payment rate
- Subscription conversion rate

## Testing Checklist

- [ ] User can view subscription plans
- [ ] Payment link opens correctly
- [ ] Test payment completes successfully
- [ ] Subscription appears in Stripe Dashboard
- [ ] Webhook receives subscription event (when backend is ready)
- [ ] User subscription tier updates in Firestore
- [ ] App grants access to premium features
- [ ] User can cancel subscription
- [ ] Canceled subscription reverts to free tier at period end
- [ ] Failed payment handling works correctly

## Support

For Stripe-specific questions, refer to:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## Next Steps

1. ✅ Create Stripe products and prices
2. ✅ Generate payment links
3. ✅ Integrate payment links into app
4. ⬜ Set up backend server for webhook handling
5. ⬜ Configure Stripe webhooks
6. ⬜ Test end-to-end subscription flow
7. ⬜ Switch from test mode to live mode
8. ⬜ Implement subscription management UI (cancel, upgrade, downgrade)
9. ⬜ Add subscription analytics
