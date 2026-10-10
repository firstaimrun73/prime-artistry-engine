-- Ensure payment_transactions.metadata exists for plan_purchase / credit_topup bookkeeping.
-- Idempotent. Does not alter existing rows or balances.
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.payment_transactions.metadata IS
  'Server-written only. Plan purchases: { kind: plan_purchase, plan }. Top-ups: { kind: credit_topup, ... }.';
