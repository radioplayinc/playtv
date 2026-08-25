import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import Hls from "hls.js";
import { Play, Info, VolumeX, Volume2, Star } from "lucide-react";

interface Hero {
  id: string;
  title: string;
  description: string | null;
  hero_url: string | null;
  thumbnail_url: string | null;
  trailer_hls_url?: string | null;
  category?: string | null;
  duration_seconds?: number | null;
}

function formatDuration(secs?: number | null) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function CinematicHero({ hero }: { hero: Hero }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const dur = formatDuration(hero.duration_seconds);

  useEffect(() => {
    const v = vid.current;
    if (!v || !hero.trailer_hls_url) return;
    let hls: Hls | null = null;
    const b64 = btoa(hero.trailer_hls_url)
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const src = `/api/public/hls/${b64}`;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(v);
    } else {
      v.src = src;
    }
    const t = setTimeout(() => {
      v.play().then(() => setPlaying(true)).catch(() => {});
    }, 1200);
    return () => { clearTimeout(t); hls?.destroy(); };
  }, [hero.trailer_hls_url]);

  return (
    <div className="relative w-full" style={{ height: "68vh", minHeight: 420, maxHeight: 700 }}>
      {/* Media background */}
      <div className="absolute inset-0 overflow-hidden rounded-b-none">
        <img
          src={hero.hero_url ?? hero.thumbnail_url ?? ""}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing ? "opacity-0" : "opacity-100"}`}
        />
        <video
          ref={vid}
          muted={muted}
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`}
        />
        {/* Bottom fade — strongest at bottom for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.85) 30%, rgba(10,10,10,0.3) 60%, transparent 100%)",
          }}
        />
        {/* Subtle left-side fade */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(10,10,10,0.5) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 flex flex-col gap-3">
        {/* Metadata pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {hero.category && (
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              {hero.category}
            </span>
          )}
          {hero.category && dur && <span className="w-1 h-1 rounded-full bg-white/40" />}
          {dur && (
            <span className="text-xs text-white/70">{dur}</span>
          )}
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span className="flex items-center gap-0.5 text-xs text-yellow-400 font-medium">
            <Star className="w-3 h-3 fill-yellow-400" />
            Featured
          </span>
        </div>

        {/* Title */}
        <h1
          className="font-bold leading-tight text-white"
          style={{ fontSize: "clamp(1.5rem, 6vw, 2.5rem)", letterSpacing: "-0.02em" }}
        >
          {hero.title}
        </h1>

        {/* Description */}
        {hero.description && (
          <p className="text-sm text-white/70 leading-relaxed line-clamp-2 max-w-sm">
            {hero.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-1">
          <Link
            to="/watch/$id"
            params={{ id: hero.id }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-black transition-all active:scale-95"
            style={{ background: "#facc15" }}
          >
            <Play className="h-4 w-4 fill-black" />
            Play
          </Link>
          <Link
            to="/app/title/$id"
            params={{ id: hero.id }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white border border-white/30 backdrop-blur-sm active:scale-95"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <Info className="h-4 w-4" />
            More info
          </Link>
          {playing && (
            <button
              onClick={() => setMuted((m) => !m)}
              className="ml-auto flex items-center justify-center w-9 h-9 rounded-full border border-white/20 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.4)" }}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
