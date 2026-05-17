import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Users, Building2, Film, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const { role, user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Wait for auth + role context to finish loading before deciding
    if (loading) return;
    if (!user) return;
    if (role === "super_admin") { setAllowed(true); return; }
    // Fallback: query directly in case context role load failed
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setCheckError(error.message);
          setAllowed(false);
        } else {
          setAllowed(!!data);
        }
      });
  }, [role, user, loading]);

  if (allowed === false) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">Super Admin only</h1>
          <p className="mt-2 text-muted-foreground">
            Your account doesn't have super-admin access. Ask an existing super admin to grant you the role,
            or run this SQL once to bootstrap yourself:
          </p>
          <pre className="mt-4 overflow-auto rounded-lg border border-border bg-card p-4 text-left text-xs">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${user?.id}', 'super_admin');`}
          </pre>
          {checkError && (
            <p className="mt-4 text-xs text-destructive">Lookup error: {checkError}</p>
          )}
        </div>
      </AppShell>
    );
  }

  if (loading || allowed === null) {
    return <AppShell><div className="p-12 text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell
      nav={
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/admin" active={path === "/admin"}><Building2 className="h-4 w-4" />Tenants</NavLink>
        </nav>
      }
    >
      <Outlet />
    </AppShell>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
}

export { Users, Film };
