-- Idempotent ensure of public.app_settings (Admin ads + plan visibility).
-- Fixes production errors: Could not find the table 'public.app_settings' in the schema cache

CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  plan_visibility jsonb NOT NULL DEFAULT '{"free":true,"lite":true,"plus":true,"pro":true,"studio":true,"business":true}'::jsonb,
  ad_settings jsonb NOT NULL DEFAULT '{"enabled":false,"target":"all","placements":{"home":true,"history":true,"features":true,"pricing":true}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.app_settings (id, ad_settings)
VALUES (
  1,
  '{"enabled":false,"target":"all","placements":{"home":true,"history":true,"features":true,"pricing":true}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
