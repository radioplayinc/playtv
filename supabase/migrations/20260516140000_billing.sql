-- ===== Plans defined per tenant =====
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents int NOT NULL,
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- ===== One subscription row per (user, tenant) =====
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive','trialing','active','past_due','canceled')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ===== Entitlement helper (same style as has_role) =====
CREATE OR REPLACE FUNCTION public.has_active_subscription(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND status IN ('active','trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

-- ===== RLS =====
CREATE POLICY "plans readable by all"
  ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans writable by tenant admin"
  ON public.plans FOR ALL
  USING (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.is_tenant_admin_of(tenant_id) OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "users read own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid()
    OR public.is_tenant_admin_of(tenant_id)
    OR public.has_role(auth.uid(),'super_admin'));
-- writes happen only via service role in the webhook; no INSERT/UPDATE policy
