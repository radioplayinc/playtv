ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS playable boolean,
  ADD COLUMN IF NOT EXISTS last_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_check_error text,
  ADD COLUMN IF NOT EXISTS referer text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS content_playable_idx ON public.content (playable);