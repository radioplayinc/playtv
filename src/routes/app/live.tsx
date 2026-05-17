import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Tv, Play } from "lucide-react";

export const Route = createFileRoute("/app/live")({ component: LivePage });

interface Channel { id: string; name: string; description: string | null; logo_url: string | null; }
interface Sched { id: string; channel_id: string; start_time: string; end_time: string; content: { id: string; title: string; thumbnail_url: string | null } | null; }

function LivePage() {
  const { tenant } = useTenant();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [schedule, setSchedule] = useState<Record<string, { now?: Sched; next?: Sched }>>({});

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const { data: ch } = await supabase.from("channels").select("*").eq("tenant_id", tenant.id);
      setChannels((ch as Channel[]) ?? []);
      const now = new Date().toISOString();
      const map: Record<string, { now?: Sched; next?: Sched }> = {};
      await Promise.all(((ch as Channel[]) ?? []).map(async (c) => {
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
    })();
  }, [tenant?.id]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-12 md:py-10">
      <h1 className="mb-6 md:mb-8 font-display text-3xl md:text-4xl font-bold">Live channels</h1>
      {channels.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 md:p-12 text-center text-muted-foreground">
          No live channels yet for {tenant?.name}.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => {
            const sched = schedule[c.id];
            return (
              <div key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-4">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded object-contain bg-black/40 p-1" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/15 text-primary"><Tv className="h-5 w-5" /></div>
                  )}
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-primary">On now</div>
                    <div className="text-sm font-medium">{sched?.now?.content?.title ?? "Off air"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Up next</div>
                    <div className="text-sm">{sched?.next?.content?.title ?? "—"}</div>
                  </div>
                  {sched?.now?.content && (
                    <Link to="/watch/$id" params={{ id: sched.now.content.id }}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">
                      <Play className="h-4 w-4 fill-current" /> Watch live
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
