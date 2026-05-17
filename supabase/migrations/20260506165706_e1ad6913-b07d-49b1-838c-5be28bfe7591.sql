ALTER TABLE public.content ADD COLUMN IF NOT EXISTS countries text[];
CREATE INDEX IF NOT EXISTS content_countries_gin ON public.content USING GIN (countries);