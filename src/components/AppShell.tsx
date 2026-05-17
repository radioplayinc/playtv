import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { LogOut, Menu, X } from "lucide-react";
import playtvLogo from "@/assets/playtv-logo-light.png";
import { GeoBadge } from "./GeoBadge";

export function AppShell({ children, nav }: { children: React.ReactNode; nav?: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-30 h-14 border-b border-white/10 bg-black/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            {nav && (
              <button
                onClick={() => setOpen((o) => !o)}
                className="rounded-lg border border-white/10 p-2 text-white/70 hover:text-white md:hidden"
                aria-label="Menu"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 truncate">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-auto object-contain" />
              ) : (
                <img src={playtvLogo} alt="Play TV" className="h-8 w-auto object-contain" />
              )}
            </Link>
            <div className="hidden md:block">{nav}</div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <GeoBadge />
            {user ? (
              <>
                <span className="hidden text-sm text-white/60 sm:inline truncate max-w-[180px]">{user.email}</span>
                <button
                  onClick={async () => { await signOut(); navigate({ to: "/" }); }}
                  className="rounded-full border border-white/10 p-2 text-white/70 hover:bg-white/[0.06] hover:text-white transition"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-white/70 hover:text-white transition">Sign in</Link>
                <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition">Get started</Link>
              </>
            )}
          </div>
        </div>
        {nav && open && (
          <div className="border-t border-white/10 bg-black md:hidden">
            <div className="px-4 py-3" onClick={() => setOpen(false)}>{nav}</div>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
