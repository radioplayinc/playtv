import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Home, Search, Tv, Bookmark, Zap } from "lucide-react";

const NAV_ITEMS = [
  { to: "/app" as const, label: "Home", icon: Home },
  { to: "/app/search" as const, label: "Explore", icon: Search },
  { to: "/app/scenes" as const, label: "Scenes", icon: Zap },
  { to: "/app/live" as const, label: "Live TV", icon: Tv },
  { to: "/app/my-list" as const, label: "My Stuff", icon: Bookmark },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const items = user
    ? NAV_ITEMS
    : NAV_ITEMS.filter((i) => i.to !== "/app/my-list");

  return (
    <div
      className="min-h-dvh text-white"
      style={{ background: "#0a0a0a", fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Tenant color accent strip */}
      {tenant?.primary_color && (
        <div
          className="fixed top-0 inset-x-0 h-0.5 z-50"
          style={{ background: tenant.primary_color }}
        />
      )}

      {/* Content area — padded at bottom for nav bar */}
      <main className="pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around px-2"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
          height: "calc(56px + env(safe-area-inset-bottom, 8px))",
        }}
      >
        {items.map((item) => {
          const active = path === item.to || (item.to !== "/app" && path.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-0"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all"
                style={active ? { background: "rgba(250,204,21,0.15)" } : {}}
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={{ color: active ? "#facc15" : "rgba(255,255,255,0.45)" }}
                  strokeWidth={active ? 2.5 : 1.75}
                />
              </div>
              <span
                className="text-[10px] font-medium tracking-tight leading-none truncate max-w-[52px] text-center"
                style={{ color: active ? "#facc15" : "rgba(255,255,255,0.4)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
