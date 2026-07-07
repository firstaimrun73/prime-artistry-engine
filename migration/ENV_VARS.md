# Environment variables — self-owned deployment

After you create your own Supabase project and swap in your own hosting, set
these on your host (e.g. Vercel → Project → Settings → Environment Variables).

## Supabase (from your NEW project: Settings → API)

| Variable | Where used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser + build | `https://<your-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser + build | anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | build | your project ref |
| `SUPABASE_URL` | server | same URL as above |
| `SUPABASE_PUBLISHABLE_KEY` | server | anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — **secret** | service role key; never expose to browser |

## AI (now Anthropic-direct — no Lovable gateway)

| Variable | Where used | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | server | powers chat, prompt-enhance, and prompt expansion (model `claude-sonnet-4-5`) |
| `FAL_API_KEY` | server | image + video generation via fal.ai |

> `LOVABLE_API_KEY` is **no longer required** for AI or email after this change.

## Email (now Resend-direct — no Lovable gateway)

| Variable | Where used | Notes |
|---|---|---|
| `RESEND_API_KEY` | server | a **real** Resend API key (`re_...`) from resend.com, not the Lovable connector key |
| `SUPPORT_EMAIL` | server | verified Resend sender/recipient address |

## Payments (unchanged — your own keys)

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_API_URL`, `NOWPAYMENTS_IPN_SECRET`,
`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_URL`, `PAYPAL_WEBHOOK_ID`

## Misc (unchanged)

`FRONTEND_URL`, `BACKEND_URL`, `ADMIN_EMAIL`, `GOOGLE_ANALYTICS_ID`

## Post-setup in your Supabase project

1. Run `migration/schema.sql` in the SQL editor.
2. Authentication → Providers → enable **Email** and **Google**, and paste your
   Google OAuth Client ID + Secret.
3. Authentication → URL Configuration → Site URL `https://motio2edit.com`,
   Redirect URLs: `https://motio2edit.com/auth`, `https://motio2edit.com/**`,
   `https://motio2edit.com/reset-password`.
4. Google Cloud Console → Authorized redirect URI:
   `https://<your-ref>.supabase.co/auth/v1/callback`.
5. Create the 4 storage buckets (or run `migration/copy-storage.mjs`) and add
   storage RLS policies.
6. Repoint payment-gateway webhooks to your new domain.
