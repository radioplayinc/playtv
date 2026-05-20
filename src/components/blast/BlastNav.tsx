import { Link } from "@tanstack/react-router";
import { Zap, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function BlastNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/10 backdrop-blur-2xl bg-[#080812]/80">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/blast" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500 blur-lg opacity-50 group-hover:opacity-80 transition-opacity rounded-full" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            BLAST
          </span>
          <span className="hidden sm:block text-xs text-white/40 font-normal tracking-widest uppercase mt-0.5">
            by Radio Play
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          <Link
            to="/blast/campaigns"
            className="px-4 py-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            Campaigns
          </Link>
          <a
            href="/blast#how-it-works"
            className="px-4 py-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            How it works
          </a>
          <a
            href="/blast#creators"
            className="px-4 py-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            For Creators
          </a>
          {user && (
            <Link
              to="/blast/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Link
              to="/blast/dashboard"
              className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
            >
              My Earnings
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
              >
                Start earning
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-white/70 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-[#0d0d1a] border-b border-white/10 p-4 flex flex-col gap-1">
          <Link to="/blast/campaigns" className="px-4 py-3 text-white/70 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setOpen(false)}>
            Campaigns
          </Link>
          {user && (
            <Link to="/blast/dashboard" className="px-4 py-3 text-white/70 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
          )}
          <div className="pt-2 border-t border-white/10 mt-2">
            {user ? (
              <Link to="/blast/dashboard" className="block w-full text-center px-5 py-2.5 rounded-full bg-violet-600 text-white font-medium text-sm">
                My Earnings
              </Link>
            ) : (
              <Link to="/signup" className="block w-full text-center px-5 py-2.5 rounded-full bg-violet-600 text-white font-medium text-sm">
                Start earning free
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
