# Stripe Integration Setup Guide

## Overview
This guide covers the complete Stripe integration for RecruitAI, including payment link integration, webhook configuration, subscription plans, and testing.

## ✅ What's Been Implemented

### 1. **Payment Link Integration**
- Created `/dashboard/billing` page with plan selection UI
- Integrated Stripe Checkout via `/api/stripe/checkout` API route
- Your test payment link: `https://buy.stripe.com/test_aFadR96VRah2aOOdngfnO00`

### 2. **Subscription Plans Configuration**
Three plans are configured in `src/config/plans.ts`:
- **Free**: $0/month - 100 NIM credits, 5 jobs, 1 seat
- **Pro**: $99/month - 5,000 NIM credits, unlimited jobs, 10 seats
- **Enterprise**: $499/month - 50,000 NIM credits, unlimited everything

### 3. **Webhook Handler**
- Webhook endpoint: `/api/webhooks/stripe`
- Handles events:
  - `checkout.session.completed` - Creates subscription record
  - `customer.subscription.updated` - Updates subscription status
  - `customer.subscription.deleted` - Marks subscription as canceled

### 4. **Billing UI**
- Settings page "Upgrade Plan" button links to `/dashboard/billing`
- Billing page shows current plan, available plans, and upgrade buttons
- Success/cancel messages after Stripe redirect

---

## 🔧 Setup Steps

### Step 1: Configure Stripe Price IDs

1. **Go to Stripe Dashboard** → [https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)

2. **Create Products & Prices** for each plan:
   - Create "Pro Plan" product → Add recurring price ($99/month)
   - Create "Enterprise Plan" product → Add recurring price ($499/month)

3. **Copy Price IDs** (format: `price_xxxxx`)

4. **Update `.env.local`**:
   ```env
   STRIPE_PRICE_ID_PRO=price_1234567890
   STRIPE_PRICE_ID_ENTERPRISE=price_0987654321
   ```

### Step 2: Configure Stripe Webhook

1. **Install Stripe CLI** (for local testing):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (using scoop)
   scoop install stripe
   
   # Or download from: https://github.com/stripe/stripe-cli
   ```

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Start Webhook Forwarding**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the Webhook Secret** (starts with `whsec_`)

5. **Update `.env.local`**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

### Step 3: Test the Payment Flow

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**:
   - Settings page: `http://localhost:3000/dashboard/settings`
   - Click "Upgrade Plan" button

3. **Or go directly to**:
   - `http://localhost:3000/dashboard/billing`

4. **Select a plan** (Pro or Enterprise)

5. **Complete checkout** using Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Authentication required**: `4000 0025 0000 3155`

6. **Verify webhook events** in your terminal (from `stripe listen`)

### Step 4: Verify Database Updates

After successful payment, check Supabase:

```sql
-- Check subscription was created
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;

-- Check organization was updated
SELECT id, name, stripe_customer_id FROM organizations;
```

---

## 🎯 Using Your Payment Link Directly

If you want to use the payment link directly (`https://buy.stripe.com/test_aFadR96VRah2aOOdngfnO00`):

### Option 1: Redirect Users Directly
Update the billing page to redirect to the payment link:

```typescript
// In billing-page-client.tsx
const handleUpgrade = async (planId: string) => {
  // Direct link to Stripe Payment Page
  window.location.href = 'https://buy.stripe.com/test_aFadR96VRah2aOOdngfnO00'
}
```

### Option 2: Use as Embedded Checkout
Add the payment link as a button:

```tsx
<a 
  href="https://buy.stripe.com/test_aFadR96VRah2aOOdngfnO00"
  target="_blank"
  rel="noopener noreferrer"
>
  <Button>Subscribe Now</Button>
</a>
```

**Note**: Payment links bypass your API route, so you'll need to:
1. Configure the payment link's redirect URL in Stripe Dashboard
2. Ensure webhooks still update your database properly

---

## 🔍 Testing Checklist

- [ ] Stripe CLI is running and forwarding webhooks
- [ ] `.env.local` has all required Stripe variables
- [ ] Price IDs are configured for Pro and Enterprise plans
- [ ] Can navigate to `/dashboard/billing`
- [ ] Can select a plan and redirect to Stripe Checkout
- [ ] Test card payment succeeds
- [ ] Webhook events are received and processed
- [ ] Subscription record created in database
- [ ] User sees success message after payment
- [ ] Can access `/dashboard/settings` and see upgrade button

---

## 🚨 Common Issues & Solutions

### Issue: "Plan not configured"
**Solution**: Add Price IDs to `.env.local` and restart server

### Issue: Webhook not received
**Solution**: 
1. Check Stripe CLI is running
2. Verify webhook URL in `.env.local`
3. Check server logs for errors

### Issue: "No Stripe customer ID"
**Solution**: Customer is created on first successful checkout

### Issue: TypeScript errors on Stripe types
**Solution**: Already fixed with `as any` for API version compatibility

---

## 📚 Additional Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Reference](https://stripe.com/docs/cli)
- [Test Card Numbers](https://stripe.com/docs/testing#cards)

---

## 🎉 Next Steps

After testing is complete:

1. **Switch to Live Mode**:
   - Update all Stripe keys to live versions
   - Create live products and prices
   - Configure live webhook endpoint

2. **Add Customer Portal**:
   ```typescript
   // Allow users to manage subscriptions
   const portal = await createCustomerPortalSession(customerId, returnUrl)
   ```

3. **Add Usage Tracking**:
   - Monitor NIM credit usage
   - Implement overage billing
   - Add usage alerts

4. **Add Trial Periods**:
   ```typescript
   // In stripe.ts
   subscription_data: {
     trial_period_days: 14
   }
   ```

---

**Need help?** Check the webhook logs in Stripe Dashboard or review the API route error handling.
