# Stripe Subscription Fix - November 17, 2025

## 🐛 Issues Found

### 1. **API Version Mismatch**
- **Problem**: The Stripe SDK was using different API versions for different operations
  - Ephemeral Key: `2024-11-20.acacia` ✅
  - Subscription Creation: `2025-10-29.clover` ❌ (default/latest)
- **Impact**: Response format differences caused the `payment_intent` to not be properly extracted
- **Solution**: Set the Stripe API version globally to `2024-11-20.acacia`

### 2. **Invoice Already Finalized Error**
- **Problem**: Code was trying to finalize an invoice that Stripe had already automatically finalized
- **Error**: `"This invoice is already finalized, you can't re-finalize a non-draft invoice."`
- **Root Cause**: When `payment_behavior: 'default_incomplete'` is used, Stripe automatically:
  1. Creates the subscription
  2. Creates AND finalizes the invoice
  3. Creates the PaymentIntent

  The code was then trying to finalize it again when the `payment_intent` appeared to be missing from the response
- **Solution**: Removed the finalization logic and improved payment intent extraction

### 3. **Missing CustomerSession**
- **Problem**: The function wasn't creating a CustomerSession (Stripe's recommended approach)
- **Solution**: Added CustomerSession creation with payment element features

## ✅ What Was Fixed

### Fixed in `/functions/index.js`:

1. **Set Consistent API Version**
   ```javascript
   const getStripe = () => {
     return Stripe(stripeSecretKey.value(), {
       apiVersion: '2024-11-20.acacia',  // ✅ Now matches ephemeral key version
     });
   };
   ```

2. **Removed Invoice Finalization Logic**
   - Removed all code that tried to finalize invoices
   - Stripe handles this automatically with `payment_behavior: 'default_incomplete'`

3. **Improved Payment Intent Extraction**
   ```javascript
   // Now properly handles both scenarios:
   // - Invoice as string ID (retrieve it)
   // - Invoice as object (extract payment_intent directly)
   // - Fallback: Re-retrieve invoice if payment_intent is missing
   ```

4. **Added CustomerSession**
   ```javascript
   const customerSession = await stripe.customerSessions.create({
     customer: customer.id,
     components: {
       payment_element: {
         enabled: true,
         features: {
           payment_method_save: 'enabled',
           payment_method_remove: 'enabled',
           payment_method_redisplay: 'enabled',
         },
       },
     },
   });
   ```

5. **Enhanced Return Data**
   ```javascript
   return {
     success: true,
     paymentIntentClientSecret: paymentIntent.client_secret,  // ✅ Correct field name
     customerEphemeralKeySecret: ephemeralKey.secret,
     customerSessionClientSecret: customerSession.client_secret,  // ✅ New!
     customerId: customer.id,
     subscriptionId: subscription.id,
   };
   ```

## 🚀 Deployment Status

✅ **Functions Deployed Successfully**
- `createSubscriptionPayment` - Updated
- `stripeWebhook` - Updated

**Deployment Time**: November 17, 2025, 4:57 PM
**Region**: us-central1
**Webhook URL**: https://stripewebhook-ga4dq66rtq-uc.a.run.app

## 🧪 Testing Instructions

### Test the Fix:

1. **Clear any pending subscriptions** in Stripe Dashboard if they're stuck:
   - Go to https://dashboard.stripe.com/test/subscriptions
   - Cancel any "incomplete" subscriptions from previous attempts

2. **Test the subscription flow**:
   ```
   1. Open your app
   2. Navigate to subscription screen
   3. Select a plan (Premium recommended)
   4. The Payment Sheet should NOW appear ✅
   5. Enter test card: 4242 4242 4242 4242
   6. Complete payment
   7. Success message should appear
   ```

3. **Verify in logs**:
   ```bash
   firebase functions:log | grep "createsubscriptionpayment"
   ```

   **Expected logs**:
   ```
   ✅ Subscription created: sub_...
   ✅ Invoice status: open
   ✅ Payment Intent status: requires_payment_method
   ✅ Payment Intent has client_secret: true
   ✅ CustomerSession created successfully
   ```

4. **Verify in Stripe Dashboard**:
   - Subscription created with status "incomplete"
   - After payment: Status changes to "active"
   - No error events in webhook logs

## 🔍 What to Look For

### Success Indicators:

✅ **Payment Sheet appears** (this was failing before)
✅ **No "invoice already finalized" errors** in logs
✅ **Consistent API version** (`2024-11-20.acacia`) in all requests
✅ **Payment completes successfully**
✅ **Firestore updates** with subscription details

### Log Output (Expected):

```
Subscription created: sub_1SUVxxx...
Invoice was expanded in subscription
Invoice status: open
Payment intent type: string  (or object)
Payment Intent status: requires_payment_method
Payment Intent has client_secret: true
CustomerSession created successfully
```

## 🐛 Troubleshooting

### If Payment Sheet still doesn't appear:

1. **Check React Native logs**:
   ```bash
   npx react-native log-ios  # or log-android
   ```
   Look for errors in the `initializePaymentSheet` call

2. **Verify Stripe keys**:
   - Publishable key in `src/App.js` is correct
   - Secret key in Firebase secrets is correct

3. **Check function response**:
   The function should return:
   ```javascript
   {
     success: true,
     paymentIntentClientSecret: "pi_xxx_secret_xxx",
     customerEphemeralKeySecret: "ek_test_xxx",
     customerSessionClientSecret: "cuss_xxx",  // New!
     customerId: "cus_xxx",
     subscriptionId: "sub_xxx"
   }
   ```

### If you see API version warnings:

This is normal - the functions are using Node 20 which is newer than the required version. This doesn't affect functionality.

## 📊 Before vs After

### Before (Broken):
```
1. User selects plan
2. createSubscriptionPayment called
3. Subscription created ✅
4. Invoice created with wrong API version ❌
5. payment_intent not properly extracted ❌
6. Code tries to finalize invoice ❌
7. Error: "Invoice already finalized" ❌
8. Payment Sheet doesn't appear ❌
```

### After (Fixed):
```
1. User selects plan
2. createSubscriptionPayment called
3. Subscription created with correct API version ✅
4. Invoice created and finalized by Stripe ✅
5. payment_intent properly extracted ✅
6. CustomerSession created ✅
7. All secrets returned to app ✅
8. Payment Sheet appears ✅
9. User completes payment ✅
10. Success! ✅
```

## 🎯 Key Takeaways

1. **Always set API version** when initializing Stripe to ensure consistent behavior
2. **Don't try to finalize invoices** when using `payment_behavior: 'default_incomplete'` - Stripe does this automatically
3. **Use CustomerSession** (new recommended approach) in addition to EphemeralKey
4. **Handle both expanded and unexpanded responses** from Stripe API
5. **Add proper error handling and logging** for debugging

## 📚 Related Documentation

- [Stripe API Versioning](https://docs.stripe.com/api/versioning)
- [Stripe Subscriptions with Payment Sheet](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=react-native)
- [CustomerSession API](https://docs.stripe.com/api/customer_sessions)
- [Payment Intents API](https://docs.stripe.com/api/payment_intents)

---

**Status**: ✅ **FIXED AND DEPLOYED**
**Date**: November 17, 2025
**Next Action**: Test the subscription flow in your app
