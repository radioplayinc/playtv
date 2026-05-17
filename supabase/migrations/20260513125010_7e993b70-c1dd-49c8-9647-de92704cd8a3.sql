UPDATE public.tenants SET primary_color = '#9cdf2f' WHERE primary_color = '#e63946';
ALTER TABLE public.tenants ALTER COLUMN primary_color SET DEFAULT '#9cdf2f';