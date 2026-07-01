# Motio2Edit — Full Migration off Lovable (Self-Ownership Runbook)

This document is the complete, project-specific guide to move Motio2Edit into
**your own accounts** (GitHub, Supabase, storage, auth, hosting, domain,
payments, email) so it runs with **zero dependency on Lovable-managed
infrastructure**.

> Important reality check: A large part of this migration is *account-ownership
> actions* that only you can perform (creating repos, projects, entering secret
> values). Lovable Cloud deliberately hides the service-role key and DB password,
> and secret **values** are never exposed to the build agent — so those steps are
> yours to run. This runbook makes every step mechanical.

---

## 0. Architecture Overview (what you are migrating)

| Layer | Today (Lovable-managed) | Target (yours) |
|-------|-------------------------|----------------|
| Source code | Lovable project | Your private GitHub repo |
| Framework | TanStack Start (Vite 7, React 19), SSR on Cloudflare Workers | Same — deploy to Vercel/Netlify/Cloudflare/Node |
| Database | Lovable Cloud (Supabase) | Your own Supabase project |
| Auth | Lovable Cloud Supabase Auth + Lovable managed OAuth | Your Supabase Auth + your OAuth apps |
| Storage | Lovable Cloud Supabase Storage (buckets: `avatars`, `uploads`, `outputs`, `ticket-attachments`) | Your Supabase Storage |
| AI (chat, prompt enhance) | Lovable AI Gateway (`ai.gateway.lovable.dev`) via `LOVABLE_API_KEY` | Your OpenAI/Anthropic/Gemini key (direct) |
| Email | Lovable Email queue (`connector-gateway.lovable.dev/resend`) via `LOVABLE_API_KEY` | Your Resend account (direct API) |
| Payments | Razorpay + NOWPayments + PayPal (already YOUR keys) | Unchanged — already yours |
| Hosting/domain | `*.lovable.app` + custom domain | Your Vercel + your domain |

**Code that is Lovable-coupled and must be changed** (details in §6):
- `src/integrations/lovable/index.ts` — Lovable managed OAuth
- `src/lib/chat.functions.ts`, `src/lib/prompt-enhance.server.ts` — AI Gateway
- `src/lib/email.server.ts` — email via connector gateway
- `src/routes/lovable/email/**` — Lovable email queue/webhook routes
- `src/lib/lovable-error-reporting.ts` — Lovable error reporting
- `src/integrations/supabase/*` — auto-generated for the Lovable Cloud project

---

## 1. Export the Source Code → Your GitHub

1. In Lovable: `+` menu (bottom-left of chat) → **GitHub** → **Connect project** → authorize the Lovable GitHub App → choose your account/org → **Create Repository**.
2. This creates a repo with the full codebase and keeps a two-way sync while you still use Lovable.
3. To fully detach later, just clone it and push to a new remote you control:
   ```bash
   git clone https://github.com/<you>/motio2edit.git
   cd motio2edit
   git remote set-url origin https://github.com/<you>/motio2edit-owned.git
   git push -u origin main
   ```
Alternative (no GitHub): Code Editor → **Download codebase** (paid workspace) to get a ZIP.

---

## 2. Create Your Own Supabase Project (DB + Auth + Storage)

1. Sign up at supabase.com → **New project**. Pick a region close to your users. Save the DB password.
2. Note these from Project Settings → API:
   - `Project URL` → becomes `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never client)

### 2a. Migrate the database schema
The full schema lives in this repo's migration history. Recreate it in your project:
- Install the Supabase CLI: `npm i -g supabase`
- `supabase link --project-ref <your-new-ref>`
- Apply the SQL migrations from `supabase/migrations/` (this repo). If migrations
  aren't checked in, use the dump approach in §2b which carries schema + data.

Tables to expect (20): `credit_audit_log, credit_ledger, credit_transactions,
email_send_log, email_send_state, email_unsubscribe_tokens, feedback,
generation_history, generations, payment_attempts, payment_transactions,
payments, profiles, subscriptions, support_tickets, suppressed_emails,
usage_tracking, user_credits, user_settings, webhook_events`.

Plus DB functions: `handle_new_user, handle_new_user_credits, deduct_credits,
refund_credits, apply_payment_credits, protect_profile_sensitive_columns,
update_updated_at_column` and the email-queue functions.

### 2b. Migrate the data (records) — preserving everything
Get a full dump of the current Lovable Cloud DB **from inside Lovable**:
Cloud → **Advanced settings → Export data**. Lovable prepares an export you
download. Then restore into your Supabase:
```bash
# schema + data restore into your own DB
psql "postgresql://postgres:<your-db-pass>@db.<your-ref>.supabase.co:5432/postgres" \
  -f lovable_export.sql
```
> Note: `pg_dump` of the Lovable-managed DB is not offered from the agent shell;
> use the Cloud **Export data** feature for the authoritative dump.

### 2c. Migrate Auth users (preserve all accounts)
Supabase stores users in `auth.users`. The **Export data** dump includes the
`auth` schema. When restoring:
- Restore `auth.users` and `auth.identities` **with their existing UUIDs** so every
  `profiles.id` / `user_id` foreign relationship stays valid.
- Password hashes (`encrypted_password`) migrate as-is — users keep their passwords.
- OAuth identities (Google/Apple) will re-link on next login as long as the
  provider `sub`/email match your newly-configured OAuth apps (§7).
- After restore, verify: `select count(*) from auth.users;` matches the source.

### 2d. Storage: migrate every uploaded file
Buckets: `avatars`, `uploads`, `outputs`, `ticket-attachments` (all private).
1. Recreate the buckets in your project (same names, same public/private setting).
2. Copy objects with a script using both projects' service-role keys:
   ```bash
   # pseudo: list from source, download, upload to target
   # uses @supabase/supabase-js with SOURCE_* and TARGET_* env vars
   node scripts/migrate-storage.mjs
   ```
   A ready-to-run script template is in Appendix A.
3. Re-apply RLS policies on `storage.objects` (they come across in the dump).
4. Because paths/keys are preserved, existing DB rows that reference storage
   paths keep working with no rewrite.

---

## 3. Environment Variables & Secrets → Your Project

I can see secret **names** but never their **values**, so you must re-enter each
in your new host. Full list to configure (from current project):

**Supabase (regenerate for YOUR project):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`

**Payments (already yours — reuse the same values):**
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_API_URL`, `NOWPAYMENTS_IPN_SECRET`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_URL`, `PAYPAL_WEBHOOK_ID`

**AI / media (already yours):**
- `ANTHROPIC_API_KEY`, `FAL_KEY`, `FAL_API_KEY`

**Email (already yours):**
- `RESEND_API_KEY`, `SUPPORT_EMAIL`, `ADMIN_EMAIL`

**App config:**
- `FRONTEND_URL`, `BACKEND_URL` (set to your new domain)
- `GOOGLE_ANALYTICS_ID`

**Must be REPLACED (Lovable-managed — not portable):**
- `LOVABLE_API_KEY` → replace with a direct provider key (see §6). This one key
  currently powers chat AI, prompt enhancement, and email delivery. After the
  code changes in §6 it is no longer referenced.

---

## 4. Deploy to Your Own Hosting (Vercel example)

TanStack Start builds to a serverless target. For Vercel:
1. Push the repo to your GitHub (done in §1).
2. In Vercel → **New Project** → import the repo.
3. Set the Nitro/output preset for Vercel. In `vite.config.ts` the Nitro target
   currently defaults to Cloudflare; switch it to `vercel`:
   ```ts
   // via @lovable.dev/vite-tanstack-config the nitro target is cloudflare by default.
   // For Vercel, replace the config with the stock TanStack Start + nitro 'vercel' preset.
   ```
   See §6.7 for the exact config swap (removes the Lovable vite wrapper).
4. Add **all** env vars from §3 in Vercel → Project → Settings → Environment Variables.
5. Build command `vite build`, output handled by Nitro's Vercel preset.
6. Deploy. Vercel gives you a `*.vercel.app` URL.

Netlify / Cloudflare Pages / a Node server (`node .output/server/index.mjs`)
all work too — just pick the matching Nitro preset.

---

## 5. Domain

`motio2edit.com` / `www.motio2edit.com` are yours (registrar-controlled). Repoint:
1. In Vercel → Project → **Domains** → add `motio2edit.com` and `www.motio2edit.com`.
2. At your registrar, update DNS to Vercel's records (A `76.76.21.21` / CNAME
   `cname.vercel-dns.com`) — replacing the current Lovable A record `185.158.133.1`.
3. Remove the `_lovable` TXT verification record once fully cut over.
4. SSL is auto-provisioned by Vercel.

---

## 6. Code Changes to Drop Lovable-Managed Services

### 6.1 AI chat — `src/lib/chat.functions.ts`
Replace the `ai.gateway.lovable.dev` call + `LOVABLE_API_KEY` with a direct
Anthropic call (you already have `ANTHROPIC_API_KEY`) or OpenAI. Keep the same
function signature and return `{ reply }`.

### 6.2 Prompt enhance — `src/lib/prompt-enhance.server.ts`
Same swap: point to Anthropic/OpenAI directly instead of the Lovable gateway.

### 6.3 Email — `src/lib/email.server.ts`
Currently posts to `connector-gateway.lovable.dev/resend` with `LOVABLE_API_KEY`.
Replace with a direct Resend API call:
```ts
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from, to, subject, html }),
});
```

### 6.4 Auth emails — `src/routes/lovable/email/**`
These implement the Lovable email queue + Supabase auth webhook. On your own
Supabase you have two options:
- **Simplest:** use Supabase's built-in auth emails (configure SMTP with your
  Resend credentials in Supabase → Auth → SMTP). Then delete the
  `src/routes/lovable/email/**` routes and the pgmq/cron functions.
- **Keep custom templates:** re-host the queue processor on your infra and set
  the Supabase Auth Hook URL to your new `/…/webhook` endpoint.

### 6.5 OAuth — `src/integrations/lovable/index.ts` + `src/routes/auth.tsx`
Replace `lovable.auth.signInWithOAuth(...)` with direct Supabase OAuth:
```ts
await supabase.auth.signInWithOAuth({
  provider: "google", // or "apple"
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```
Delete `src/integrations/lovable/index.ts` afterward.

### 6.6 Error reporting — `src/lib/lovable-error-reporting.ts`
Remove or replace with Sentry/your logger. Drop imports from `src/server.ts`
and `__root.tsx` as needed.

### 6.7 Build config — `vite.config.ts`
The config imports `@lovable.dev/vite-tanstack-config` (Lovable's wrapper that
bundles the TanStack Start + Nitro Cloudflare setup). Replace with the stock
plugins so there's no Lovable package dependency:
```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite"; // set preset: 'vercel'
// ...assemble plugins; set the @ alias to ./src
```
Also remove `@lovable.dev/*` packages from `package.json`
(`@lovable.dev/vite-tanstack-config`, `@lovable.dev/cloud-auth-js`,
`@lovable.dev/email-js`, `@lovable.dev/webhooks-js`) and the componentTagger.

### 6.8 Regenerate Supabase client files
`src/integrations/supabase/{client,client.server,types}.ts` are generated for the
Lovable Cloud project. Regenerate types against your project:
```bash
supabase gen types typescript --project-id <your-ref> > src/integrations/supabase/types.ts
```
The client files read from env vars, so they work once §3 env is set.

---

## 7. Reconfigure Integrations with Your Credentials

| Integration | Action |
|-------------|--------|
| **Google OAuth** | Create OAuth client in Google Cloud Console. Add authorized redirect `https://<your-supabase-ref>.supabase.co/auth/v1/callback`. Enable Google in Supabase → Auth → Providers with your client ID/secret. |
| **Apple OAuth** | Create Service ID + key in Apple Developer. Configure in Supabase → Auth → Providers → Apple. |
| **Razorpay** | Already your keys. Update webhook URL to `https://motio2edit.com/api/public/webhooks/razorpay`. |
| **NOWPayments** | Already yours. Update IPN callback URL to `https://motio2edit.com/api/public/webhooks/nowpayments`. |
| **PayPal** | Already yours. Update webhook URL to `https://motio2edit.com/api/public/webhooks/paypal` and re-create the webhook (new `PAYPAL_WEBHOOK_ID`). |
| **Resend (email)** | Already yours. Verify your sending domain in Resend; set as Supabase SMTP if using built-in auth emails. |
| **fal.ai (image/video)** | Already yours (`FAL_KEY`). No change. |
| **Anthropic (AI)** | Already yours. Now used directly after §6.1–6.2. |
| **Google Analytics** | Already yours. No change. |

After changing webhook URLs, do a small test transaction per gateway.

---

## 8. Post-Migration Testing Checklist

Run against your new deployment:
- [ ] Sign up (new user) → 60 signup credits granted; `profiles` + `credit_ledger` rows created.
- [ ] Login with email/password (migrated user) → password works.
- [ ] Login with Google, Login with Apple.
- [ ] Image enhancement generation → credits deducted, output stored in `outputs` bucket.
- [ ] AI editor (identity preservation) generation.
- [ ] Video generation (fal.ai async).
- [ ] Prompt expansion (Anthropic direct).
- [ ] Chat assistant reply.
- [ ] Checkout: Razorpay (INR) end-to-end → webhook credits applied.
- [ ] Checkout: PayPal (USD card) end-to-end → webhook credits applied.
- [ ] Checkout: NOWPayments (crypto) end-to-end → IPN credits applied.
- [ ] Support ticket create + email notification via Resend.
- [ ] Admin dashboard stats load.
- [ ] Existing uploaded avatars/outputs render (storage migration).
- [ ] Auth emails (signup confirm, password reset) deliver.
- [ ] RLS: users can only read their own rows.

---

## 9. Appendix A — Storage copy script template

```js
// scripts/migrate-storage.mjs  —  run with: node scripts/migrate-storage.mjs
import { createClient } from "@supabase/supabase-js";
const src = createClient(process.env.SOURCE_URL, process.env.SOURCE_SERVICE_KEY);
const dst = createClient(process.env.TARGET_URL, process.env.TARGET_SERVICE_KEY);
const buckets = ["avatars", "uploads", "outputs", "ticket-attachments"];
for (const b of buckets) {
  // recursively list; for each object download from src and upload to dst
  const { data: files } = await src.storage.from(b).list("", { limit: 1000 });
  for (const f of files ?? []) {
    const { data: blob } = await src.storage.from(b).download(f.name);
    if (blob) await dst.storage.from(b).upload(f.name, blob, { upsert: true });
    console.log(b, f.name);
  }
}
```
(Extend with recursion for nested folders.)

---

## 10. Final Ownership Checklist

Mark each once complete — when all are checked, the app is fully independent of
Lovable and will keep running even if you never open Lovable again.

- [ ] **GitHub** — code in your private repo, remote points to your account.
- [ ] **Hosting** — deployed on your Vercel (or chosen host), building from your repo.
- [ ] **Domain** — `motio2edit.com` DNS points to your host; `_lovable` TXT removed.
- [ ] **Database** — schema + all records restored to your Supabase project.
- [ ] **Storage** — all four buckets + every object copied to your Supabase.
- [ ] **Authentication** — `auth.users`/identities migrated with original UUIDs; passwords + OAuth links preserved.
- [ ] **Environment variables** — every secret re-entered in your host; `LOVABLE_API_KEY` removed.
- [ ] **AI** — chat + prompt enhance call Anthropic/OpenAI directly (no Lovable gateway).
- [ ] **Email** — Resend called directly / via your Supabase SMTP (no Lovable gateway).
- [ ] **Payments** — Razorpay, NOWPayments, PayPal webhooks repointed to your domain, using your keys.
- [ ] **Google/Apple OAuth** — your own OAuth apps configured in your Supabase.
- [ ] **Code** — `@lovable.dev/*` packages and `src/integrations/lovable`, `src/routes/lovable/**`, `lovable-error-reporting` removed/replaced.
- [ ] **Testing** — §8 checklist all green on the new deployment.

**Independence statement:** Once the above are checked, no request path in the
application touches `*.lovable.app`, `*.lovable.dev`, or any Lovable-managed key.
The app is 100% owned and operated by you.
