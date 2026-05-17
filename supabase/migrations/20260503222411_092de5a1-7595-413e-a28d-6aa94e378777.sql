
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'tenant_admin', 'end_user');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#e63946',
  accent_color text NOT NULL DEFAULT '#f7f7f7',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES (separate table to prevent privilege escalation) ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin_of(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND role = 'tenant_admin'
  )
$$;

-- ============ AUTO PROFILE + ROLE TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'end_user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CONTENT ============
CREATE TABLE public.content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  hero_url text,
  hls_url text,
  mp4_url text,
  duration_seconds integer,
  category text DEFAULT 'General',
  is_trending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_content_tenant ON public.content(tenant_id);

-- ============ CHANNELS ============
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- ============ CHANNEL SCHEDULE ============
CREATE TABLE public.channel_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channel_schedule ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_schedule_channel_time ON public.channel_schedule(channel_id, start_time);

-- ============ WATCH HISTORY ============
CREATE TABLE public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- ============ WATCHLIST ============
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- ============ SUBSCRIPTIONS (Stripe-ready) ============
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  plan text,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- TENANTS: anyone can read (needed for branding lookup); only super_admin writes
CREATE POLICY "tenants_read_all" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "tenants_super_admin_all" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- PROFILES
CREATE POLICY "profiles_read_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_super_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES: read self; only super_admin manages
CREATE POLICY "user_roles_read_self" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_super_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- CONTENT: public read (end users browsing); tenant_admin/super_admin write
CREATE POLICY "content_read_all" ON public.content FOR SELECT USING (true);
CREATE POLICY "content_tenant_admin_write" ON public.content FOR ALL TO authenticated
  USING (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- CHANNELS
CREATE POLICY "channels_read_all" ON public.channels FOR SELECT USING (true);
CREATE POLICY "channels_tenant_admin_write" ON public.channels FOR ALL TO authenticated
  USING (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- CHANNEL SCHEDULE
CREATE POLICY "schedule_read_all" ON public.channel_schedule FOR SELECT USING (true);
CREATE POLICY "schedule_tenant_admin_write" ON public.channel_schedule FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id
      AND (public.is_tenant_admin_of(c.tenant_id) OR public.has_role(auth.uid(), 'super_admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id
      AND (public.is_tenant_admin_of(c.tenant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

-- WATCH HISTORY: only owner
CREATE POLICY "watch_history_own" ON public.watch_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- WATCHLIST: only owner
CREATE POLICY "watchlist_own" ON public.watchlist FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SUBSCRIPTIONS: read own, super_admin all
CREATE POLICY "subs_read_own" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "subs_super_admin_all" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('tenant-assets', 'tenant-assets', true),
  ('content-thumbnails', 'content-thumbnails', true),
  ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, authenticated upload, owner manage
CREATE POLICY "public_read_tenant_assets" ON storage.objects FOR SELECT
  USING (bucket_id IN ('tenant-assets', 'content-thumbnails', 'content-media'));

CREATE POLICY "authenticated_upload_tenant_assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('tenant-assets', 'content-thumbnails', 'content-media'));

CREATE POLICY "authenticated_update_own_tenant_assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('tenant-assets', 'content-thumbnails', 'content-media') AND owner = auth.uid());

CREATE POLICY "authenticated_delete_own_tenant_assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('tenant-assets', 'content-thumbnails', 'content-media') AND owner = auth.uid());

-- ============ DEFAULT TENANT (for fallback branding) ============
INSERT INTO public.tenants (slug, name, primary_color, accent_color)
VALUES ('default', 'Play TV', '#e63946', '#f7f7f7')
ON CONFLICT (slug) DO NOTHING;
