CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  plan_visibility jsonb NOT NULL DEFAULT '{"free":true,"lite":true,"plus":true,"pro":true,"studio":true,"business":true}'::jsonb,
  ad_settings jsonb NOT NULL DEFAULT '{"enabled":true,"target":"all","placements":{"home":true,"history":true,"features":true,"pricing":true}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  kind text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users can read active broadcasts" ON public.broadcasts FOR SELECT TO authenticated USING (active = true);
CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  path text,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_access_log TO service_role;
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to admin access log" ON public.admin_access_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS metadata jsonb;