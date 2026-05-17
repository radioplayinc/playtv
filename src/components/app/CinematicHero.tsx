import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import Hls from "hls.js";
import { Play, Info, VolumeX, Volume2 } from "lucide-react";

interface Hero {
  id: string; title: string; description: string | null;
  hero_url: string | null; thumbnail_url: string | null;
  trailer_hls_url?: string | null;
}

export function CinematicHero({ hero }: { hero: Hero }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

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
    } else { v.src = src; }
    const t = setTimeout(() => {
      v.play().then(() => setPlaying(true)).catch(() => {});
    }, 1200);
    return () => { clearTimeout(t); hls?.destroy(); };
  }, [hero.trailer_hls_url]);

  return (
    <section className="relative flex min-h-[60vh] md:min-h-[78vh] items-end overflow-hidden px-4 pb-12 pt-28 md:px-12">
      <div className="absolute inset-0 -z-10">
        <img src={hero.hero_url ?? hero.thumbnail_url ?? ""} alt=""
          className={`h-full w-full object-cover transition-opacity duration-700 ${playing ? "opacity-0" : "opacity-100"}`} />
        <video ref={vid} muted={muted} loop playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />
      </div>
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">{hero.title}</h1>
        {hero.description && (
          <p className="mt-4 line-clamp-3 text-base text-muted-foreground md:text-lg">
            {hero.description}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Link to="/watch/$id" params={{ id: hero.id }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 font-bold text-primary-foreground">
            <Play className="h-4 w-4 fill-current" /> Play
          </Link>
          <Link to="/app/title/$id" params={{ id: hero.id }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-6 py-3 font-semibold backdrop-blur">
            <Info className="h-4 w-4" /> More info
          </Link>
          {playing && (
            <button onClick={() => setMuted((m) => !m)}
              className="ml-2 rounded-full border border-border bg-black/40 p-3 backdrop-blur">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
