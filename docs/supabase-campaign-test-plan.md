# Christmas Gift Campaign — Controlled Test Plan

**Reward:** exactly **25** credits  
**Session:** exactly **600** seconds  
**Identity:** `auth.uid()` only  

Do **not** run destructive tests against real customer balances. Use a dedicated test account.

## Prerequisites

1. Production migration applied and verification SQL green.
2. Test user signed in via the Motio2edit app (or Supabase Auth).
3. Note starting `profiles.credits` for the test user.

## Tests

### T1 — Unauthenticated access
Call RPCs without JWT. Expect NOT_AUTHENTICATED / denied. No session row.

### T2 — Start campaign
Expect `ok: true`, `rewardCredits: 25`, `sessionSeconds: 600`. Re-start returns same session.

### T3 — Early claim
Expect `ok: false`, `reason: too_early`. Credits unchanged.

### T4 — Status
`hasSession: true`, `eligible: false` until 600s, `campaignActive: true`.

### T5 — Claim after 600s
Expect `ok: true`, `creditsGranted: 25`, ledger `CAMPAIGN-christmas-gift-2026-<uid>`.

### T6 — Duplicate claim
Expect `already_claimed`. Balance unchanged.

### T7 — Concurrent claims
Net +25 once (FOR UPDATE + unique ledger).

### T8 — Inactive window
Expect `campaign_inactive` for start/claim.

### T9 — Cross-user isolation
User B cannot claim User A session.

## Cleanup (test UUID only)

```sql
DELETE FROM public.credit_ledger
WHERE transaction_id = 'CAMPAIGN-christmas-gift-2026-' || '<TEST_USER_UUID>';
DELETE FROM public.christmas_campaign_sessions
WHERE user_id = '<TEST_USER_UUID>' AND campaign_id = 'christmas-gift-2026';
```
