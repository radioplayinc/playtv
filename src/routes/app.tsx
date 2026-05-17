import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Search, Tv, Heart } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
  validateSearch: (s: Record<string, unknown>) => ({ tenant: typeof s.tenant === "string" ? s.tenant : undefined }),
});

function AppLayout() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/app", label: "Home", icon: Home },
    { to: "/app/live", label: "Live", icon: Tv },
    { to: "/app/search", label: "Search", icon: Search },
    ...(user ? [{ to: "/app/my-list", label: "My List", icon: Heart }] : []),
  ];
  return (
    <AppShell
      nav={
        <nav className="flex flex-col md:flex-row md:items-center gap-1">
          {items.map((i) => (
            <Link key={i.to} to={i.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${path === i.to ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <i.icon className="h-4 w-4" />{i.label}
            </Link>
          ))}
        </nav>
      }
    >
      <Outlet />
    </AppShell>
  );
}
