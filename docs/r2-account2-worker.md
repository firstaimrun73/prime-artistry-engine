# Account 2 R2 public delivery (assets2)

Worker project lives at `workers/motio2edit-assets2-proxy/`.

See that folder's `README.md` and `INTEGRATION.md` for deploy sequence.

Main app dual-host mapping: `src/lib/r2-catalog-hosts.ts` (disabled by default; existing `r2-catalog.ts` URLs unchanged until you enable and copy objects).

**Do not** deploy production Worker until staging verify passes.
