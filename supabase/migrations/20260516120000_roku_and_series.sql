-- ===== Roku feed fields on content =====
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS content_kind text NOT NULL DEFAULT 'movie'
    CHECK (content_kind IN ('movie','short','episode','live')),
  ADD COLUMN IF NOT EXISTS release_year int,
  ADD COLUMN IF NOT EXISTS rating text DEFAULT 'NR',
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS roku_enabled boolean NOT NULL DEFAULT true;

-- ===== Series / season / episode hierarchy =====
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  hero_url text,
  release_year int,
  rating text DEFAULT 'NR',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  season_number int NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series_id, season_number)
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- link existing content rows to a season as episodes
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS episode_number int;

-- ===== RLS: public read, tenant-admin write (mirrors existing content policy) =====
CREATE POLICY "series readable by all"
  ON public.series FOR SELECT USING (true);
CREATE POLICY "series writable by tenant admin"
  ON public.series FOR ALL
  USING (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "seasons readable by all"
  ON public.seasons FOR SELECT USING (true);
CREATE POLICY "seasons writable by tenant admin"
  ON public.seasons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.series s
    WHERE s.id = series_id AND (public.is_tenant_admin_of(s.tenant_id)
    OR public.has_role(auth.uid(),'super_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.series s
    WHERE s.id = series_id AND (public.is_tenant_admin_of(s.tenant_id)
    OR public.has_role(auth.uid(),'super_admin'))));

-- helpful indexes
CREATE INDEX IF NOT EXISTS idx_content_tenant_kind
  ON public.content (tenant_id, content_kind);
CREATE INDEX IF NOT EXISTS idx_seasons_series ON public.seasons (series_id);
