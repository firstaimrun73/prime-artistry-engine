# PayPal billing — Motio2edit (current)

## Product decision (Nov 2026)

**Public plans (Starter / Pro / Ultra) are one-time only.**  
No PayPal Billing Plans / Subscriptions API for new customers. No autopay.

| Product | API | Notes |
|---------|-----|--------|
| Starter / Pro / Ultra (monthly or yearly) | **Orders API** (`intent: CAPTURE`) | One-time charge. Plan valid 30 or 365 days. Manual renew from Pricing. |
| Credit top-ups | Orders API | Unchanged |
| Legacy Lite / Plus / Studio / Business | Orders API for new; old recurring rows left alone | Not offered on public pricing |

`PAYPAL_PLAN_*` environment variables are **not required** for public checkout.  
If they are missing, checkout still works (one-time Orders path).

## What the user gets

- Pay once → credits + plan activated with `plan_expires_at`
- **Renewal time kept** (30 days monthly / 365 days annual)
- Annual: credits still granted every ~30 days via cron (not all upfront)
- **Email on purchase** (`sendPlanPurchasedEmail`)
- **Email when plan expires** (`sendPlanExpiredEmail` via `/api/cron/plan-lifecycle`)
- **No automatic re-charge** (`auto_renew: false`, `billing_model: "one_time"`)

## Code map

| File | Role |
|------|------|
| `src/lib/payments.handlers.ts` | `getPaypalSubscriptionMode` always returns `mode: "order"`; `createPaypalSubscription` rejects public plans |
| `src/lib/payments.server.ts` | `createPaypalOrder` / capture; legacy `PAYPAL_BILLING_PLAN_IDS` kept but unused for public |
| `src/components/CheckoutPage.tsx` | Always one-time PayPal Buttons + clear "no automatic renewal" copy |
| `src/lib/plan-lifecycle.server.ts` | `activateOneTimePlan`, expire + expiration email, annual monthly credit grants |
| `src/routes/api/cron/plan-lifecycle.ts` | Hourly cron: grants + expire + emails |
| `src/routes/api/public/webhooks/paypal.ts` | `PAYMENT.CAPTURE.COMPLETED` activates one-time plan |

## Environment variables (required for live PayPal)

```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_API_URL=https://api-m.paypal.com   # or api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=...   # optional but recommended for capture webhook
FRONTEND_URL=https://motio2edit.com
CRON_SECRET=...         # for /api/cron/plan-lifecycle
```

**Do not set** `PAYPAL_PLAN_STARTER` / `_PRO` / `_ULTRA` / `_*_ANNUAL` unless you intentionally revive recurring for a non-public path. Public checkout ignores them.

## Webhook events (minimum)

URL: `https://<your-domain>/api/public/webhooks/paypal`

- `PAYMENT.CAPTURE.COMPLETED` — one-time plan purchases + top-ups
- Keep legacy subscription events only if you still support old recurring rows:
  - `BILLING.SUBSCRIPTION.*`
  - `PAYMENT.SALE.COMPLETED`

## Ops checklist after deploy

1. Redeploy latest `main` on Vercel (the error "Billing plan IDs … missing" only appears on older intermediate commits).
2. Confirm `CRON_SECRET` is set and cron hits `/api/cron/plan-lifecycle` hourly.
3. Sandbox: complete one monthly + one yearly PayPal order → profile has `plan_expires_at`, purchase email arrives.
4. Do **not** create PayPal Billing Plans for Starter/Pro/Ultra unless product direction changes back to autopay.

## Why the error appeared

Earlier the same day, intermediate commits forced Subscriptions API for public plans and **failed closed** when `PAYPAL_PLAN_*` were unset ("We will not charge a different plan"). That path was removed: public plans always use one-time Orders.
