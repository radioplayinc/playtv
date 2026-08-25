import { Link } from "@tanstack/react-router";

interface Title {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category?: string | null;
  progress_pct?: number;
}

/* Wide card — landscape 16:9 with text overlay, used in horizontal rows */
export function TitleCard({ c }: { c: Title }) {
  return (
    <Link to="/app/title/$id" params={{ id: c.id }} className="group block flex-shrink-0 w-40 sm:w-52">
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ aspectRatio: "16/10" }}
      >
        {/* Background image */}
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt={c.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-active:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
            <span className="text-xs text-white/40 text-center px-2">{c.title}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
          }}
        />

        {/* Category badge */}
        {c.category && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)" }}
          >
            {c.category}
          </div>
        )}

        {/* Title */}
        <div className="absolute bottom-0 inset-x-0 px-2 pb-2">
          <div className="text-xs font-semibold text-white leading-tight line-clamp-2">{c.title}</div>
        </div>

        {/* Progress bar */}
        {typeof c.progress_pct === "number" && c.progress_pct > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, c.progress_pct)}%`, background: "#facc15" }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

/* Portrait card — 2:3 aspect ratio for "poster" style */
export function PosterCard({ c }: { c: Title }) {
  return (
    <Link to="/app/title/$id" params={{ id: c.id }} className="group block flex-shrink-0 w-28 sm:w-36">
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "2/3" }}>
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt={c.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-active:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-3 bg-white/5">
            <span className="text-xs text-white/40 text-center">{c.title}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
        <div className="absolute bottom-0 inset-x-0 px-2 pb-2">
          <div className="text-[11px] font-semibold text-white leading-tight line-clamp-2">{c.title}</div>
        </div>
      </div>
    </Link>
  );
}

/* Square genre card — used in 2x grid for genre discovery */
export function GenreCard({ title, coverUrl, onClick }: { title: string; coverUrl?: string | null; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl w-full active:scale-95 transition-transform"
      style={{ aspectRatio: "16/9" }}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 100%)" }}
      />
      <div className="absolute bottom-3 left-3">
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
    </button>
  );
}
