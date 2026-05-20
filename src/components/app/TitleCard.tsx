import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Radio } from "lucide-react";

interface Title {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; progress_pct?: number;
  content_kind?: string | null; category?: string | null;
}

// Generate a deterministic gradient color from channel title
function titleToGradient(title: string): string {
  const gradients = [
    "from-violet-900 to-indigo-900",
    "from-blue-900 to-cyan-900",
    "from-emerald-900 to-teal-900",
    "from-orange-900 to-red-900",
    "from-pink-900 to-rose-900",
    "from-amber-900 to-yellow-900",
    "from-sky-900 to-blue-900",
    "from-purple-900 to-violet-900",
    "from-red-900 to-orange-900",
    "from-teal-900 to-emerald-900",
  ];
  const idx = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  return gradients[idx];
}

// Get initials from channel title
function getInitials(title: string): string {
  return title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function TitleCard({ c }: { c: Title }) {
  const [hover, setHover] = useState(false);
  const isLive = c.content_kind === "live";
  const gradient = titleToGradient(c.title);

  return (
    <div
      className="relative w-36 shrink-0 sm:w-44 md:w-52"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link to={isLive ? "/watch/$id" : "/app/title/$id"} params={{ id: c.id }}>
        <div className={`overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${gradient} aspect-video flex items-center justify-center relative group`}>
          {c.thumbnail_url ? (
            <img
              src={c.thumbnail_url}
              alt={c.title}
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 p-3">
              <span className="text-2xl font-black text-white/80">{getInitials(c.title)}</span>
              <span className="text-[10px] text-white/50 text-center line-clamp-2">{c.title}</span>
            </div>
          )}
          {/* Live badge */}
          {isLive && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </div>
          )}
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-8 w-8 fill-white text-white drop-shadow-lg" />
          </div>
        </div>
        <div className="mt-1.5 px-0.5">
          <p className="text-xs font-medium text-foreground line-clamp-1">{c.title}</p>
          {c.category && <p className="text-[10px] text-muted-foreground">{c.category}</p>}
        </div>
      </Link>

      {typeof c.progress_pct === "number" && c.progress_pct > 0 && (
        <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded bg-surface">
          <div className="h-full bg-primary" style={{ width: `${Math.min(100, c.progress_pct)}%` }} />
        </div>
      )}

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="absolute -top-4 left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-2xl"
          >
            <div className={`mb-2 h-28 w-full overflow-hidden rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt="" className="h-full w-full object-contain p-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <span className="text-3xl font-black text-white/70">{getInitials(c.title)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm flex-1 line-clamp-1">{c.title}</span>
              {isLive && (
                <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0">
                  <Radio className="h-2.5 w-2.5" /> LIVE
                </span>
              )}
            </div>
            {c.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Link
                to="/watch/$id"
                params={{ id: c.id }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Play className="h-3 w-3 fill-current" /> {isLive ? "Watch Live" : "Play"}
              </Link>
              {!isLive && (
                <Link to="/app/title/$id" params={{ id: c.id }} className="rounded-lg border border-border p-1.5">
                  <Info className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
