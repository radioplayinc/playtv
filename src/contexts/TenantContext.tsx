import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  icon_url: string | null;
  primary_color: string;
  accent_color: string;
}

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  setTenantBySlug: (slug: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

// Convert hex like #9cdf2f to OKLCH-ish CSS var. We'll just feed hex directly via color-mix fallback.
function applyBranding(t: Tenant | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!t) return;
  // Use hex directly — modern browsers accept hex in CSS custom props.
  root.style.setProperty("--primary", t.primary_color);
  root.style.setProperty("--accent", t.primary_color);
  root.style.setProperty("--ring", t.primary_color);
  // Update favicon to tenant icon if provided
  if (t.icon_url) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = t.icon_url;
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveSlug = (): string => {
    if (typeof window === "undefined") return "default";
    const url = new URL(window.location.href);
    const q = url.searchParams.get("tenant");
    if (q) return q;
    const host = url.hostname.split(".");
    if (host.length > 2 && host[0] !== "www" && host[0] !== "id-preview--600ce7ac-343f-457b-a2da-d1288ac74251") {
      return host[0];
    }
    return "default";
  };

  const loadBySlug = async (slug: string) => {
    const { data } = await supabase.from("tenants").select("*").eq("slug", slug).maybeSingle();
    if (data) {
      setTenant(data as Tenant);
      applyBranding(data as Tenant);
    }
  };

  const loadById = async (id: string) => {
    const { data } = await supabase.from("tenants").select("*").eq("id", id).maybeSingle();
    if (data) {
      setTenant(data as Tenant);
      applyBranding(data as Tenant);
    }
  };

  const search = useRouterState({ select: (s) => s.location.search as { tenant?: string } });
  const tenantParam = search?.tenant;

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (tenantId) {
        await loadById(tenantId);
      } else {
        await loadBySlug(tenantParam ?? resolveSlug());
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, tenantParam]);

  const setTenantBySlug = async (slug: string) => {
    await loadBySlug(slug);
  };
  const refresh = async () => {
    if (tenant) await loadById(tenant.id);
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, setTenantBySlug, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
