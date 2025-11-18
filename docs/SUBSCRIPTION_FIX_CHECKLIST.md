# Subscription Fix Checklist

## ✅ Issues Fixed

### 1. **Missing `upgradeSubscription` Function**
- **Status**: ✅ FIXED
- **What was wrong**: Function didn't exist in AppContext
- **Fix**: Added `upgradeSubscription` function to AppContext.js
- **Location**: `src/context/AppContext.js:552-577`

### 2. **Wrong Subscription Tier Displayed**
- **Status**: 🔄 IN PROGRESS
- **Issue**: App shows "pro" but user paid for "premium"
- **Likely cause**: Webhook not firing or old data in Firestore

---

## 🔍 Diagnosis

### Payment Sheet Working ✅
- Payment Sheet now loads correctly
- Customer can enter card details
- Payment processes successfully

### Subscription Update Not Working ❌
- Error: `upgradeSubscription is not a function`
- Fixed by adding the function to AppContext

### Wrong Tier Showing ❌
- User paid for "premium"
- App shows "pro"
- Webhook logs show no subscription update

---

## 🛠️ Next Steps to Fix

### Step 1: Verify Webhook is Configured

Check if webhook secret is set:
```bash
firebase functions:config:get
```

Should show:
```json
{
  "stripe": {
    "secret_key": "sk_test_...",
    "webhook_secret": "whsec_..."
  }
}
```

If `webhook_secret` is missing:
```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
firebase deploy --only functions
```

### Step 2: Test the Webhook

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint
3. Click "Send test webhook"
4. Select `customer.subscription.created`
5. Check if it delivers successfully

### Step 3: Manual Fix (Temporary)

If webhook isn't working yet, you can manually update Firestore:

1. Go to Firebase Console → Firestore
2. Find your user document (users/YOUR_USER_ID)
3. Update the fields:
   ```
   subscription: "premium"
   subscriptionDetails: {
     tier: "premium",
     status: "active",
     ...other fields
   }
   ```

### Step 4: Check Subscription in Stripe

1. Go to https://dashboard.stripe.com/test/subscriptions
2. Find the subscription you just created
3. Click on it
4. Check:
   - Status: Should be "Active"
   - Price: Should be `price_1STmgJPTDEZhEg0xSK0Dsa9d` (Premium)
   - Customer: Should match your user

### Step 5: Trigger Webhook Manually (If Needed)

If webhook didn't fire automatically:

1. In Stripe Dashboard → Subscriptions → Your subscription
2. Click "Send test webhook"
3. Select `customer.subscription.updated`
4. This should trigger your webhook and update Firestore

---

## 🧪 Testing After Fix

### Test Sequence:

1. **Check Current State**:
   - Open app
   - Go to Settings → Subscription
   - Current tier should show correctly

2. **Test Another Subscription**:
   - Select a different plan (e.g., Basic if you have Premium)
   - Complete payment
   - Check if tier updates correctly
   - Look for webhook logs

3. **Verify Webhook Logs**:
   ```bash
   firebase functions:log | grep "Updated subscription"
   ```

   Should see:
   ```
   Updated subscription for user [uid]: premium (active)
   ```

---

## 🎯 Expected Behavior (After Fix)

### Successful Flow:

```
1. User selects "Premium" plan
2. Enters payment details
3. Payment Sheet closes
4. Success alert appears
5. SubscriptionModal closes
6. Webhook fires within 1-2 seconds
7. Firestore updates with:
   - subscription: "premium"
   - subscriptionDetails.tier: "premium"
   - subscriptionDetails.status: "active"
8. App UI refreshes and shows "Premium"
```

### What You'll See in Logs:

**App Logs:**
```
AppContext - Upgrading subscription to: premium
AppContext - Subscription updated locally to: premium
AppContext - Waiting for webhook to confirm in Firestore...
```

**Function Logs:**
```
Received webhook event: customer.subscription.created
Subscription created: sub_...
Updated subscription for user [...]: premium (active)
```

---

## 🐛 Common Issues & Fixes

### Issue: Webhook not firing

**Symptoms**:
- Payment succeeds
- No webhook logs
- Firestore not updated

**Fix**:
1. Check webhook endpoint URL is correct
2. Verify webhook secret is set
3. Check webhook events are selected
4. Test webhook manually from Stripe Dashboard

---

### Issue: Wrong tier still showing

**Symptoms**:
- Webhook fired
- Firestore shows correct tier
- App still shows wrong tier

**Fix**:
1. Close and reopen the app
2. The Firestore listener should pick up the change
3. If not, check if listener is working:
   ```javascript
   // In AppContext.js, check listenToUserProfile
   ```

---

### Issue: "upgradeSubscription is not a function"

**Symptoms**:
- Error after payment succeeds
- Modal doesn't close

**Fix**:
✅ Already fixed! Function now exists in AppContext

---

## 📊 Price ID Reference

Make sure these match in:
- `src/config/stripe.js`
- `functions/index.js` (priceToTierMap)

```javascript
prices: {
  basic: 'price_1STmgCPTDEZhEg0xiJ70H58F',
  premium: 'price_1STmgJPTDEZhEg0xSK0Dsa9d',  // ← User paid for this
  pro: 'price_1STmgLPTDEZhEg0xp3Srlc8i',
}
```

---

## ✅ Quick Verification

Run these commands to verify everything:

```bash
# 1. Check webhook secret is set
firebase functions:config:get | grep webhook_secret

# 2. Check recent subscriptions
# Go to: https://dashboard.stripe.com/test/subscriptions

# 3. Check webhook delivery
# Go to: https://dashboard.stripe.com/test/webhooks
#        Click your endpoint → Events tab

# 4. Check function logs
firebase functions:log | tail -50
```

---

**Status**:
- ✅ Payment Sheet: WORKING
- ✅ upgradeSubscription function: FIXED
- 🔄 Webhook & Tier Update: NEEDS TESTING

**Next Action**: Verify webhook is configured and test again
