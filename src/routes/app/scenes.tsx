import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { applyGeoFilter, useEffectiveCountry, useGeo } from "@/contexts/GeoContext";
import { Link } from "@tanstack/react-router";
import Hls from "hls.js";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, Bookmark } from "lucide-react";

export const Route = createFileRoute("/app/scenes")({ component: ScenesPage });

interface SceneItem {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  trailer_hls_url?: string | null;
  category: string | null;
  duration_seconds?: number | null;
}

function SceneCard({
  item,
  active,
  globalMuted,
  onToggleMute,
}: {
  item: SceneItem;
  active: boolean;
  globalMuted: boolean;
  onToggleMute: () => void;
}) {
  const vid = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;

    if (!active) {
      v.pause();
      setPlaying(false);
      return;
    }

    if (!item.trailer_hls_url) return;

    const b64 = btoa(item.trailer_hls_url)
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const src = `/api/public/hls/${b64}`;

    if (Hls.isSupported()) {
      hlsRef.current?.destroy();
      const hls = new Hls({ autoStartLoad: true });
      hls.loadSource(src);
      hls.attachMedia(v);
      hlsRef.current = hls;
    } else {
      v.src = src;
    }

    const t = setTimeout(() => {
      v.play().then(() => setPlaying(true)).catch(() => {});
    }, 300);

    return () => {
      clearTimeout(t);
    };
  }, [active, item.trailer_hls_url]);

  useEffect(() => {
    return () => { hlsRef.current?.destroy(); };
  }, []);

  const togglePlay = useCallback(() => {
    const v = vid.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const likeCount = Math.floor(Math.random() * 900 + 100) * 100;
  const commentCount = Math.floor(Math.random() * 500 + 20);

  return (
    <div className="relative w-full flex-shrink-0" style={{ height: "100dvh" }}>
      {/* Background */}
      <div className="absolute inset-0 bg-black">
        {item.thumbnail_url && (
          <img
            src={item.thumbnail_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {item.trailer_hls_url && (
          <video
            ref={vid}
            muted={globalMuted}
            loop
            playsInline
            onClick={togglePlay}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Gradient overlays */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)" }}
        />
      </div>

      {/* Play/pause tap zone */}
      {!item.trailer_hls_url ? null : (
        <button
          onClick={togglePlay}
          className="absolute inset-0 w-full h-full"
          style={{ background: "transparent" }}
        >
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </button>
      )}

      {/* Right action buttons */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        <ActionBtn
          icon={<Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />}
          label={formatCount(likeCount)}
          onClick={() => setLiked((l) => !l)}
        />
        <ActionBtn
          icon={<MessageCircle className="w-6 h-6 text-white" />}
          label={formatCount(commentCount)}
          onClick={() => {}}
        />
        <ActionBtn
          icon={<Share2 className="w-6 h-6 text-white" />}
          label="Share"
          onClick={() => {}}
        />
        <ActionBtn
          icon={<Bookmark className={`w-6 h-6 ${saved ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />}
          label="Save"
          onClick={() => setSaved((s) => !s)}
        />
        {/* Mute button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          {globalMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 px-4 pb-24">
        {item.category && (
          <span
            className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(250,204,21,0.2)", color: "#facc15", border: "1px solid rgba(250,204,21,0.4)" }}
          >
            {item.category}
          </span>
        )}
        <h3 className="font-bold text-white text-base leading-tight mb-1">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-white/70 leading-relaxed line-clamp-2">{item.description}</p>
        )}
        <Link
          to="/app/title/$id"
          params={{ id: item.id }}
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold"
          style={{ color: "#facc15" }}
        >
          Watch full episode →
        </Link>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      {icon}
      <span className="text-[10px] font-medium text-white">{label}</span>
    </button>
  );
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function ScenesPage() {
  const { tenant } = useTenant();
  const country = useEffectiveCountry();
  const { showAll } = useGeo();
  const [items, setItems] = useState<SceneItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant) return;
    const base = supabase.from("content").select("*").eq("tenant_id", tenant.id).limit(20);
    applyGeoFilter(base, country, showAll).then(({ data }) => {
      setItems((data as SceneItem[]) ?? []);
    });
  }, [tenant?.id, country, showAll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { threshold: 0.6 }
    );

    const children = container.querySelectorAll("[data-idx]");
    children.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(250,204,21,0.15)" }}>
            <Play className="w-6 h-6" style={{ color: "#facc15" }} />
          </div>
          <p className="text-white/40 text-sm">No scenes yet</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-scroll"
      style={{
        height: "100dvh",
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {items.map((item, idx) => (
        <div key={item.id} data-idx={idx} style={{ scrollSnapAlign: "start" }}>
          <SceneCard
            item={item}
            active={idx === activeIdx}
            globalMuted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        </div>
      ))}
    </div>
  );
}
