ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS trailer_hls_url text;
