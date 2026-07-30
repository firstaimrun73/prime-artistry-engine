CREATE TABLE IF NOT EXISTS public.admin_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT 'Upgrade Your Plan',
  message text NOT NULL DEFAULT 'You have used all your credits. Upgrade to keep creating!',
  button_text text NOT NULL DEFAULT 'View Plans',
  target text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_popups TO authenticated;
GRANT ALL ON public.admin_popups TO service_role;

ALTER TABLE public.admin_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read popup"
  ON public.admin_popups FOR SELECT
  TO authenticated USING (true);

CREATE TRIGGER update_admin_popups_updated_at
  BEFORE UPDATE ON public.admin_popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.admin_popups (id, enabled)
VALUES ('00000000-0000-0000-0000-000000000001', false)
ON CONFLICT (id) DO NOTHING;