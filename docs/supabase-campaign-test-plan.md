# Christmas Gift Campaign — Controlled Test Plan

**Reward:** exactly **25** credits  
**Session:** exactly **600** seconds  
**Identity:** `auth.uid()` only  

Use a dedicated test account. Do not modify real customer balances.

## Tests

### T1 Unauthenticated — RPCs denied, no session row
### T2 Start — ok true, rewardCredits 25, sessionSeconds 600
### T3 Early claim — too_early, credits unchanged
### T4 Status — hasSession true, eligible false until 600s
### T5 Claim after 600s — creditsGranted 25, ledger CAMPAIGN-christmas-gift-2026-<uid>
### T6 Duplicate claim — already_claimed
### T7 Concurrent — net +25 once
### T8 Inactive window — campaign_inactive
### T9 Cross-user isolation

## Cleanup (test UUID only)

```sql
DELETE FROM public.credit_ledger
WHERE transaction_id = 'CAMPAIGN-christmas-gift-2026-' || '<TEST_USER_UUID>';
DELETE FROM public.christmas_campaign_sessions
WHERE user_id = '<TEST_USER_UUID>' AND campaign_id = 'christmas-gift-2026';
```
