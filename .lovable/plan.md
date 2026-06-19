# MOTIO2EDIT — Feature Additions (No Redesign)

All changes reuse existing components, colors, and layout. No homepage, hero, branding, or visual changes.

## 1. Database migration
- Add `avatar_url` (text) to `profiles`.
- Extend `ticket_category` enum with: `technical`, `feature_request`, `bug_report`, `other` (keep existing payment/credits/generation/account; map "Billing"→payment, "Account Issue"→account, "Technical Issue"→technical).
- Extend `ticket_status` enum with: `waiting_user`, `closed` (in_progress already exists).
- Create public `avatars` storage bucket + RLS policies (users manage own folder, public read).

## 2. Security page (NEW) — `src/routes/security.tsx`
Reuses `Header` + existing card styles. Six security cards with lucide icons:
Data Encryption, Account Protection, Secure Payments, Privacy Protection, AI Processing Security, Platform Monitoring. Adds `head()` SEO meta.

## 3. FAQ page — rework `src/routes/faq.tsx`
- Group questions into 5 categories (Account & Login, Credits & Billing, AI Video Editing, Privacy & Security, Subscription Plans) using all listed questions.
- Add a search bar that filters questions live.
- Keep existing `Accordion` (smooth open/close already built in).

## 4. Support page — extend `src/routes/support.tsx`
- Add fields: Full Name, Email (prefilled from profile), Priority dropdown (Low/Medium/High/Critical), Attachment upload (to `ticket-attachments` bucket), expanded Category list.
- Add "Submit Ticket" + "Clear Form" buttons.
- On submit: show generated ticket number + success toast, refresh history.
- Status badges support all 5 statuses (Open, In Progress, Waiting for User, Resolved, Closed).

## 5. Settings — `src/routes/_authenticated.settings.tsx`
- Add Profile Picture section (upload / change / remove to `avatars` bucket, save `avatar_url`).
- Add Notification Preferences section (toggles persisted to localStorage).
- Logout already present in Settings; keep it.

## 6. Profile picture display
- Show avatar in `Header` (account area), Dashboard greeting, and Settings.
- Add `avatar_url` to `Profile` type and the auth profile query in `src/lib/auth.tsx`.

## 7. Header nav — `src/components/Header.tsx`
- Add "Security" link; rename "FAQ" → "FAQs".
- Add avatar thumbnail next to Account.

## 8. Pricing — `src/lib/plans.ts`
- Remove support-related feature lines ("Basic support", "priority support", "team support"); replace with platform features (e.g., Faster rendering, Higher-resolution export, Advanced AI models, Commercial license). Pricing values and card layout unchanged.

## Technical notes
- Migration runs first (adds column + enum values + bucket/RLS); types regenerate before code that reads `avatar_url`.
- Avatar upload uses the browser supabase client with RLS-scoped paths (`{user_id}/...`).
- No changes to routing structure beyond adding `security.tsx`.
