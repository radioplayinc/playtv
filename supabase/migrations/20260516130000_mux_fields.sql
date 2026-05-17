ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS mux_upload_id text,
  ADD COLUMN IF NOT EXISTS mux_asset_id text,
  ADD COLUMN IF NOT EXISTS mux_playback_id text,
  ADD COLUMN IF NOT EXISTS mux_status text
    NOT NULL DEFAULT 'none'
    CHECK (mux_status IN ('none','waiting','processing','ready','errored'));

CREATE INDEX IF NOT EXISTS idx_content_mux_upload
  ON public.content (mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_content_mux_asset
  ON public.content (mux_asset_id);
