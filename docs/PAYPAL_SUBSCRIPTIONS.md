# PayPal Subscriptions — Motio2edit

## Root cause (fixed in code)

Monthly plans previously used **PayPal Orders API** (`intent: CAPTURE`) which is **one-time only**.
True recurring billing requires the **PayPal Subscriptions / Billing Plans API**.

Credit top-ups remain **one-time** (Orders API). Monthly plans use Subscriptions when configured.

## What the code does now

| Product | API |
|---------|-----|
| Lite / Plus / Pro / AI Studio / Master Studio monthly | Subscriptions API (when `PAYPAL_PLAN_*` set) |
| Credit top-ups (incl. Halloween) | Orders API (one-time) |
| Legacy plan purchase if plan IDs missing | Orders API fallback (no live break) |

### Files changed
- `src/lib/payments.server.ts` — `createPaypalSubscription`, get/suspend/activate, plan ID map
- `src/lib/payments.functions.ts` — `createPaypalSubscription`, `getPaypalSubscriptionMode`
- `src/routes/api/public/webhooks/paypal.ts` — subscription lifecycle + `PAYMENT.SALE.COMPLETED` renewals
- `supabase/migrations/20261101170000_paypal_subscriptions_support.sql`

### Existing customers
**Not auto-converted.** Historical one-time purchases stay as-is. No re-charge without a new PayPal approval.

---

## Required PayPal dashboard setup (you must do this)

### 1. Create a Product (Catalog)
PayPal Developer → Products → Create product  
Type: Service · Name: Motio2edit Subscription

### 2. Create Billing Plans (one per Motio plan)
For each plan create a **monthly** billing plan with fixed price matching `DISPLAY_PRICES`:

| Motio plan | USD | Credits |
|------------|-----|--------|
| Lite | 4.99 | 350 |
| Plus | 9.99 | 800 |
| Pro | 29.99 | 2500 |
| AI Studio | 55.00 | 5000 |
| Master Studio (business) | 110.00 | 10000 |

Copy each Billing Plan ID (`P-...`).

### 3. Environment variables (Vercel)
```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_API_URL=https://api-m.paypal.com   # or api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=...

PAYPAL_PLAN_LITE=P-...
PAYPAL_PLAN_PLUS=P-...
PAYPAL_PLAN_PRO=P-...
PAYPAL_PLAN_STUDIO=P-...
PAYPAL_PLAN_BUSINESS=P-...
FRONTEND_URL=https://motio2edit.com
```

Until `PAYPAL_PLAN_*` are set, checkout keeps the **legacy one-time** path (safe for live users).

### 4. Webhook events to subscribe
URL: `https://<your-domain>/api/public/webhooks/paypal`

Subscribe at minimum:
- `BILLING.SUBSCRIPTION.CREATED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.EXPIRED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
- `PAYMENT.SALE.COMPLETED`
- `PAYMENT.CAPTURE.COMPLETED` (keep for one-time top-ups)

### 5. Run migration
Apply `20261101170000_paypal_subscriptions_support.sql` on Supabase.

---

## Checkout UI (remaining)

Backend can create subscriptions. Checkout still defaults to one-time Buttons until you:
1. Set `PAYPAL_PLAN_*`
2. Switch the PayPal Buttons `createOrder` path to `createPaypalSubscription` + `approve` redirect (or SDK `createSubscription`)

Recommended next step: when `getPaypalSubscriptionMode({ plan }).mode === "subscription"`, call `createPaypalSubscription` and redirect the user to `approveUrl`.

## Sandbox test checklist
1. New subscription approve → ACTIVATED → credits + plan
2. Wait for / simulate renewal → SALE.COMPLETED → credits again (idempotent sale id)
3. Cancel in app → CANCELLED webhook → auto_renew false
4. Top-up still one-time capture
5. Duplicate webhook → no double credits

**Do not claim recurring works in production until a real sandbox renewal has been observed.**
