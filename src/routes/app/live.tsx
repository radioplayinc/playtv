import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Tv, Play, Radio } from "lucide-react";

export const Route = createFileRoute("/app/live")({ component: LivePage });

interface Channel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

interface Sched {
  id: string;
  channel_id: string;
  start_time: string;
  end_time: string;
  content: { id: string; title: string; thumbnail_url: string | null } | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function progressPct(sched: Sched) {
  const now = Date.now();
  const start = new Date(sched.start_time).getTime();
  const end = new Date(sched.end_time).getTime();
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}

function LivePage() {
  const { tenant } = useTenant();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [schedule, setSchedule] = useState<Record<string, { now?: Sched; next?: Sched }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const { data: ch } = await supabase.from("channels").select("*").eq("tenant_id", tenant.id);
      const list = (ch as Channel[]) ?? [];
      setChannels(list);
      if (list.length > 0) setSelectedChannel(list[0].id);
      const now = new Date().toISOString();
      const map: Record<string, { now?: Sched; next?: Sched }> = {};
      await Promise.all(list.map(async (c) => {
        const { data: nowItem } = await supabase.from("channel_schedule")
          .select("*, content(id, title, thumbnail_url)")
          .eq("channel_id", c.id).lte("start_time", now).gte("end_time", now)
          .maybeSingle();
        const { data: nextItem } = await supabase.from("channel_schedule")
          .select("*, content(id, title, thumbnail_url)")
          .eq("channel_id", c.id).gt("start_time", now)
          .order("start_time", { ascending: true }).limit(1).maybeSingle();
        map[c.id] = { now: (nowItem as Sched) ?? undefined, next: (nextItem as Sched) ?? undefined };
      }));
      setSchedule(map);
      setLoading(false);
    })();
  }, [tenant?.id]);

  const selected = channels.find((c) => c.id === selectedChannel);
  const selectedSched = selectedChannel ? schedule[selectedChannel] : undefined;

  if (loading) {
    return (
      <div className="px-4 pt-14 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.07)" }}>
          <Tv className="w-7 h-7 text-white/30" />
        </div>
        <p className="text-white/40 text-sm">No live channels yet for {tenant?.name}.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh" }}>
      {/* Now playing hero */}
      {selected && selectedSched?.now?.content && (
        <div className="relative w-full" style={{ height: "38vh", minHeight: 240 }}>
          <div className="absolute inset-0">
            {selectedSched.now.content.thumbnail_url ? (
              <img
                src={selectedSched.now.content.thumbnail_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }} />
            )}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.6) 50%, rgba(10,10,10,0.2) 100%)" }}
            />
          </div>

          {/* Live pill */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "#ef4444" }}>
            <Radio className="w-3 h-3 text-white animate-pulse" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">Live</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <p className="text-xs text-white/50 mb-1">{selected.name}</p>
            <h2 className="font-bold text-white text-lg leading-tight mb-3" style={{ letterSpacing: "-0.01em" }}>
              {selectedSched.now.content.title}
            </h2>
            {/* Progress bar */}
            <div className="h-0.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${progressPct(selectedSched.now)}%`, background: "#ef4444" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/watch/$id"
                params={{ id: selectedSched.now.content.id }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-black"
                style={{ background: "#facc15" }}
              >
                <Play className="w-4 h-4 fill-black" />
                Watch now
              </Link>
              <span className="text-xs text-white/40">
                Until {formatTime(selectedSched.now.end_time)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="px-4 pt-4 pb-4">
        <h2 className="text-base font-bold text-white mb-3" style={{ letterSpacing: "-0.01em" }}>All Channels</h2>
      </div>

      <div ref={scrollRef} className="space-y-2 px-4 pb-28">
        {channels.map((ch) => {
          const sched = schedule[ch.id];
          const isSelected = ch.id === selectedChannel;
          const pct = sched?.now ? progressPct(sched.now) : 0;

          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.99]"
              style={{
                background: isSelected ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.04)",
                border: isSelected ? "1px solid rgba(250,204,21,0.3)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Channel logo */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {ch.logo_url ? (
                    <img src={ch.logo_url} alt={ch.name} className="w-full h-full object-cover" />
                  ) : (
                    <Tv className="w-5 h-5" style={{ color: isSelected ? "#facc15" : "rgba(255,255,255,0.4)" }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-white truncate">{ch.name}</span>
                    {sched?.now && (
                      <span className="flex-shrink-0 ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                        LIVE
                      </span>
                    )}
                  </div>

                  {sched?.now?.content ? (
                    <>
                      <p className="text-xs text-white/60 truncate">{sched.now.content.title}</p>
                      <div className="mt-1.5 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: isSelected ? "#facc15" : "#ef4444" }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-white/30">Off air</p>
                  )}

                  {sched?.next?.content && (
                    <p className="text-[10px] text-white/30 mt-0.5 truncate">
                      Up next: {sched.next.content.title} at {formatTime(sched.next.start_time)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
