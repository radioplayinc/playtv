import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info } from "lucide-react";

interface Title {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; progress_pct?: number;
}

export function TitleCard({ c }: { c: Title }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative w-32 shrink-0 sm:w-44 md:w-52"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link to="/app/title/$id" params={{ id: c.id }}>
        <div className="overflow-hidden rounded-lg border border-border bg-black aspect-[2/3] flex items-center justify-center p-2">
          {c.thumbnail_url
            ? <img src={c.thumbnail_url} alt={c.title}
                className="max-h-full max-w-full object-contain" loading="lazy" />
            : <span className="text-xs text-muted-foreground">{c.title}</span>}
        </div>
      </Link>

      {typeof c.progress_pct === "number" && c.progress_pct > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded bg-surface">
          <div className="h-full bg-primary"
            style={{ width: `${Math.min(100, c.progress_pct)}%` }} />
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
            {c.thumbnail_url && (
              <img src={c.thumbnail_url} alt=""
                className="mb-2 h-32 w-full rounded-lg object-cover" />
            )}
            <div className="font-semibold">{c.title}</div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {c.description}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link to="/watch/$id" params={{ id: c.id }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                <Play className="h-3 w-3 fill-current" /> Play
              </Link>
              <Link to="/app/title/$id" params={{ id: c.id }}
                className="rounded-lg border border-border p-1.5">
                <Info className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
