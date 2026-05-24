import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PaywallGate } from "@/components/PaywallGate";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, PictureInPicture, RotateCcw, RotateCw, AlertTriangle } from "lucide-react";
import { convertExternalUrl } from "@/lib/externalStreamUtils";

export const Route = createFileRoute("/_authenticated/watch/$id")({ component: WatchPage });

function WatchPage() {
  const { id } = useParams({ from: "/_authenticated/watch/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [content, setContent] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("content").select("*").eq("id", id).maybeSingle();
      setContent(data);
    })();
  }, [id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !content) return;
    
    // Determine stream source
    let src: string | null = null;
    let useExternalDirect = false;
    
    if (content.external_stream_url) {
      // Use external streaming URL
      src = convertExternalUrl(content.external_stream_url, content.external_stream_type);
      useExternalDirect = true;
    } else {
      // Use HLS or MP4
      src = content.hls_url ?? content.mp4_url;
    }
    
    if (!src) return;

    setStreamError(null);

    const proxify = (u: string) => {
      const b64 = btoa(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const params = new URLSearchParams();
      if (content.user_agent) params.set("ua", content.user_agent);
      if (content.referer) params.set("ref", content.referer);
      const qs = params.toString();
      return `/api/public/hls/${b64}${qs ? `?${qs}` : ""}`;
    };

    let hls: Hls | null = null;
    if (!useExternalDirect && content.hls_url && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(proxify(content.hls_url));
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (!data.fatal) return;
        const msg =
          data.type === Hls.ErrorTypes.NETWORK_ERROR
            ? "This channel is currently unavailable (network or geo block)."
            : data.type === Hls.ErrorTypes.MEDIA_ERROR
            ? "Playback error — the stream codec may not be supported in this browser."
            : "Playback failed.";
        setStreamError(msg);
      });
    } else {
      // For external URLs or direct MP4, use native video player
      video.src = useExternalDirect ? src : (content.hls_url ? proxify(content.hls_url) : src);
    }
    const onVideoErr = () => {
      if (!hls) setStreamError("This channel is currently unavailable.");
    };
    video.addEventListener("error", onVideoErr);

    if (user) {
      supabase.from("watch_history").select("position_seconds").eq("user_id", user.id).eq("content_id", id).maybeSingle()
        .then(({ data }) => {
          if (data?.position_seconds && video) {
            video.currentTime = data.position_seconds;
          }
        });
    }
    video.play().catch(() => {});

    return () => { video.removeEventListener("error", onVideoErr); hls?.destroy(); };
  }, [content, id, user?.id]);

  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused) return;
      supabase.from("watch_history").upsert(
        { user_id: user.id, content_id: id, position_seconds: Math.floor(v.currentTime), updated_at: new Date().toISOString() },
        { onConflict: "user_id,content_id" }
      );
    }, 10000);
    return () => {
      clearInterval(iv);
      const v = videoRef.current;
      if (v && user) {
        supabase.from("watch_history").upsert(
          { user_id: user.id, content_id: id, position_seconds: Math.floor(v.currentTime), updated_at: new Date().toISOString() },
          { onConflict: "user_id,content_id" }
        );
      }
    };
  }, [user?.id, id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => { setProgress(v.currentTime); setDuration(v.duration || 0); };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onTime);
    return () => {
      v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onTime);
    };
  }, [content]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(t);
  }, [playing, showControls]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current; if (!v) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); v.paused ? v.play() : v.pause(); }
      if (e.key === "ArrowRight") v.currentTime = Math.min(v.duration, v.currentTime + 10);
      if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 10);
      if (e.key === "f" || e.key === "F") toggleFs();
      if (e.key === "m" || e.key === "M") { v.muted = !v.muted; setMuted(v.muted); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFs = () => {
    const el = videoRef.current?.parentElement;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  const togglePip = async () => {
    const v = videoRef.current; if (!v) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if ((v as any).requestPictureInPicture) await (v as any).requestPictureInPicture();
  };
  const skip = (s: number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + s));
  };
  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <PaywallGate>
      <div className="relative h-dvh w-full overflow-hidden bg-black"
        onMouseMove={() => setShowControls(true)}
        onClick={() => setShowControls(true)}>
        <video ref={videoRef} className="h-full w-full" playsInline />

        {streamError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6">
            <div className="max-w-md rounded-2xl border border-white/10 bg-card/90 p-6 text-center backdrop-blur">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-primary" />
              <h2 className="font-display text-xl font-semibold text-foreground">Stream unavailable</h2>
              <p className="mt-2 text-sm text-muted-foreground">{streamError}</p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => navigate({ to: "/app/live" })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Browse channels
                </button>
                <button onClick={() => window.location.reload()} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-foreground hover:bg-white/5">
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent p-5 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
          <button onClick={() => navigate({ to: "/app" })} className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-white backdrop-blur">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="font-display text-xl font-bold text-white">{content?.title}</h1>
          <div className="w-20" />
        </div>

        <div className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-5 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
          <input type="range" min={0} max={duration || 100} value={progress} step={0.1}
            onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
            className="w-full accent-[var(--primary)]" />
          <div className="mt-3 flex items-center gap-4 text-white">
            <button onClick={() => { const v = videoRef.current!; v.paused ? v.play() : v.pause(); }} aria-label="Play/Pause"
              className="rounded-full bg-white/15 p-3 backdrop-blur hover:bg-white/25">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button onClick={() => skip(-10)} aria-label="Back 10s" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={() => skip(10)} aria-label="Forward 10s" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><RotateCw className="h-5 w-5" /></button>
            <button onClick={() => { const v = videoRef.current!; v.muted = !v.muted; setMuted(v.muted); }} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="ml-2 text-sm font-mono">{fmt(progress)} / {fmt(duration)}</span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={togglePip} aria-label="Picture in picture" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><PictureInPicture className="h-5 w-5" /></button>
              <button onClick={toggleFs} aria-label="Fullscreen" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><Maximize className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      </div>
    </PaywallGate>
  );
}
