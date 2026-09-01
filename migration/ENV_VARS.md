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

## Cloudflare R2 (media delivery + Circle sample binaries)

Server-only secrets (never expose to the browser / never prefix with `VITE_`):

| Variable | Where used | Notes |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | server | R2 S3 endpoint |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | server | API token access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | server | API token secret |
| `CLOUDFLARE_R2_BUCKET_NAME` | server | Bucket name |

Public delivery (safe for browser when it is a public/custom domain base URL only):

| Variable | Where used | Notes |
|---|---|---|
| `VITE_R2_PUBLIC_URL` | browser + server | Preferred public base, no trailing slash. Sample cards resolve as `{VITE_R2_PUBLIC_URL}/{r2Key}` |
| `CLOUDFLARE_R2_PUBLIC_URL` | server fallback | Same public base if `VITE_R2_PUBLIC_URL` is unset |

Circle sample object key prefixes: `circle/samples/add/`, `circle/samples/remove/`, `circle/samples/info/`.
User outputs: `users/{userId}/outputs/`. Do not store sample binaries in Supabase or Git.

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
