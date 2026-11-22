# Claude — Production Supabase SQL execution (Motio2edit Christmas campaign)

## Critical rules

1. **Verify the production Supabase project ID first.** It must match Vercel production `SUPABASE_URL` project ref.
2. Do **not** apply SQL solely because earlier reports named `zuahlcwgmkjztuyxscts` or `roaobgmdvizfxmteuxrd`.
3. Repo `supabase/config.toml` lists `zuahlcwgmkjztuyxscts` — treat as repo default, not proof of production.
4. Do not weaken RLS or grant clients UPDATE on `profiles.credits`.

## Steps

1. Identify production project from Vercel `motio2edit-web` env.
2. Run `docs/supabase-campaign-preflight.sql` (read-only).
3. Compare to `docs/supabase-campaign-production-migration.sql`.
4. If `credit_ledger.transaction_id` still FKs to payments, STOP and report.
5. Apply migration after comparison approval.
6. Run `docs/supabase-campaign-verification.sql`.
7. Follow `docs/supabase-campaign-test-plan.md` on a test account only.
8. Report: project ref, preflight summary, migration yes/no, verification, test results.

## Product rules

- Exactly **25** credits after **600** seconds
- One claim per user per campaign
- No client-authorized rewards
