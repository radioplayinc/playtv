-- ============================================================
-- COMPREHENSIVE FEATURE UPDATE
-- External streaming, tenant contact, platform availability,
-- user notes, content markers
-- ============================================================

-- ===== EXTERNAL STREAMING SUPPORT =====
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS external_stream_url text,
  ADD COLUMN IF NOT EXISTS external_stream_type text
    CHECK (external_stream_type IN ('google_drive', 'dropbox', 'icloud', 'onedrive', 'direct', NULL)),
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS referer text;

COMMENT ON COLUMN public.content.external_stream_url IS 'Direct streaming URL from Google Drive, Dropbox, iCloud, OneDrive, or any external source';
COMMENT ON COLUMN public.content.external_stream_type IS 'Type of external streaming service for URL handling';
COMMENT ON COLUMN public.content.user_agent IS 'Optional User-Agent header for external stream requests';
COMMENT ON COLUMN public.content.referer IS 'Optional Referer header for external stream requests';

-- ===== TENANT CONTACT & PLATFORM FIELDS =====
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_website text,
  ADD COLUMN IF NOT EXISTS social_facebook text,
  ADD COLUMN IF NOT EXISTS social_twitter text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_youtube text,
  ADD COLUMN IF NOT EXISTS platform_web boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform_roku boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_firetv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_appletv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_androidtv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_ios boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_android boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_url_roku text,
  ADD COLUMN IF NOT EXISTS app_url_firetv text,
  ADD COLUMN IF NOT EXISTS app_url_appletv text,
  ADD COLUMN IF NOT EXISTS app_url_androidtv text,
  ADD COLUMN IF NOT EXISTS app_url_ios text,
  ADD COLUMN IF NOT EXISTS app_url_android text,
  ADD COLUMN IF NOT EXISTS privacy_policy_url text,
  ADD COLUMN IF NOT EXISTS terms_of_service_url text;

COMMENT ON COLUMN public.tenants.icon_url IS 'Square icon/favicon for tenant (separate from wide logo)';
COMMENT ON COLUMN public.tenants.contact_email IS 'Public contact email for tenant';
COMMENT ON COLUMN public.tenants.contact_phone IS 'Public contact phone for tenant';
COMMENT ON COLUMN public.tenants.platform_web IS 'Whether tenant has web platform available';
COMMENT ON COLUMN public.tenants.platform_roku IS 'Whether tenant has Roku app available';

-- ===== USER NOTES =====
CREATE TABLE IF NOT EXISTS public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notes_own_only" ON public.user_notes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_notes_user_content 
  ON public.user_notes(user_id, content_id);

COMMENT ON TABLE public.user_notes IS 'User-specific notes for content/channels';

-- ===== CONTENT MARKERS / CHAPTERS =====
CREATE TABLE IF NOT EXISTS public.content_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  timestamp_seconds integer NOT NULL CHECK (timestamp_seconds >= 0),
  label text NOT NULL,
  marker_type text NOT NULL DEFAULT 'chapter'
    CHECK (marker_type IN ('chapter', 'highlight', 'bookmark')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_id, timestamp_seconds)
);

ALTER TABLE public.content_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_markers_read_all" ON public.content_markers FOR SELECT USING (true);

CREATE POLICY "content_markers_tenant_admin_write" ON public.content_markers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.content c
      WHERE c.id = content_id 
        AND (public.is_tenant_admin_of(c.tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content c
      WHERE c.id = content_id 
        AND (public.is_tenant_admin_of(c.tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_markers_content 
  ON public.content_markers(content_id, timestamp_seconds);

COMMENT ON TABLE public.content_markers IS 'Timestamp markers for chapters, highlights, and bookmarks in content';

-- ===== UPDATED_AT TRIGGER FOR USER NOTES =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
