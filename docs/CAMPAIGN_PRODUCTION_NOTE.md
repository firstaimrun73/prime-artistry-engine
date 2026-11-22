# Campaign production note

Production may already contain:

- Migration history for christmas gift campaign
- Tables `campaign_config`, `christmas_campaign_sessions`
- RPCs `start_christmas_campaign_session`, `get_christmas_campaign_status`, `claim_christmas_gift_credits`
- `protect_profile_credits` / ledger protections

**Do not blindly re-run** `20261123010000_christmas_gift_campaign.sql` without preflight.

1. Run `docs/supabase-campaign-preflight.sql`
2. If objects exist, only apply **deltas** (CREATE OR REPLACE function bodies) after review
3. Never weaken `protect_profile_credits`
4. Christmas reward remains **exactly 25** credits / **600** seconds in application code (`CHRISTMAS_FIXED_REWARD`)

Rewarded ads stay **disabled** (`REWARDED_ADS_ENABLED = false`) until provider credentials + signed callbacks are configured.
