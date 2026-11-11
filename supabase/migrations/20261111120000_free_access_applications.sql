-- Access Assistance Programme: applications + optional complimentary profile fields.
-- Approval is always manual (admin). Submission never grants access.

-- Expand ticket categories if enum exists (ignore if already present).
DO $$ BEGIN
  ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'free_access_request';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS complimentary_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS complimentary_tools text[] NULL;

CREATE TABLE IF NOT EXISTS public.free_access_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NULL REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NULL,
  reason text NOT NULL,
  intended_use text NOT NULL,
  tools_requested text[] NOT NULL DEFAULT '{}',
  usage_frequency text NULL,
  extra_info text NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  admin_note text NULL,
  credits_granted integer NULL CHECK (credits_granted IS NULL OR credits_granted >= 0),
  tools_granted text[] NULL,
  expires_at timestamptz NULL,
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_access_applications_user_id_idx
  ON public.free_access_applications (user_id);
CREATE INDEX IF NOT EXISTS free_access_applications_status_idx
  ON public.free_access_applications (status);

ALTER TABLE public.free_access_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own free access apps" ON public.free_access_applications;
CREATE POLICY "Users select own free access apps"
  ON public.free_access_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own free access apps" ON public.free_access_applications;
CREATE POLICY "Users insert own free access apps"
  ON public.free_access_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No user UPDATE/DELETE — reviews go through service role / admin server fns.

GRANT SELECT, INSERT ON public.free_access_applications TO authenticated;
GRANT ALL ON public.free_access_applications TO service_role;
