# Motio2edit universal campaign engine

## Principles

- Guaranteed seasonal gift (e.g. Christmas) = **exactly 25 credits**, server 600s session, one claim.
- Independent of rewarded ads and prize draws.
- Configuration-driven: add future seasons via `campaign_config` rows, not new React seasonal forks.
- Global ads stay off until provider verification is complete.

## Production Supabase

Reported production project: `roaobgmdvizfxmteuxrd`  
Repo `supabase/config.toml` still lists `zuahlcwgmkjztuyxscts` — align env/docs carefully; do not apply SQL to the wrong project.

## RPC parity (client must match)

```
start_christmas_campaign_session(_campaign_id text)
get_christmas_campaign_status(_campaign_id text)
claim_christmas_gift_credits(_campaign_id text)
```

Never pass `user_id`. Identity is `auth.uid()` only.

Campaign id: `christmas-gift-2026`

## Profile security (after Claude permission migration)

Client must never UPDATE/UPSERT:

- `profiles.credits`
- `profiles.plan`
- `profiles.auto_edit_used_count`

Allowed client profile fields: display_name, avatar_url, currency preferences, marketing flags as product allows.

Credits only via service_role RPCs: deduct / refund / apply_payment / campaign claim.

## Placements

See `src/lib/campaign/placement-copy.ts` and `active-campaign.ts`.

## Coming soon (not activated)

- Rewarded ads completion verification
- High-value prize draw (legal + funding required)
- Admin UI to edit campaign_config without SQL
