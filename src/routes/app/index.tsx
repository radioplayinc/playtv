import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { applyGeoFilter, useEffectiveCountry, useGeo } from "@/contexts/GeoContext";
import { TitleCard } from "@/components/app/TitleCard";
import { RowSkeleton } from "@/components/app/RowSkeleton";
import { CinematicHero } from "@/components/app/CinematicHero";

export const Route = createFileRoute("/app/")({ component: AppHome });

interface Content {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; hero_url: string | null;
  trailer_hls_url?: string | null;
  category: string | null; is_trending: boolean;
  duration_seconds?: number | null;
  progress_pct?: number;
}

function AppHome() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const country = useEffectiveCountry();
  const { showAll } = useGeo();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);

  useEffect(() => {
    if (!tenant) return;
    setLoading(true);
    const base = supabase.from("content").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false });
    applyGeoFilter(base, country, showAll)
      .then(({ data }) => {
        setItems((data as Content[]) ?? []);
        setLoading(false);
      });
  }, [tenant?.id, country, showAll]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("watch_history")
      .select("position_seconds, content(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const list = ((data ?? []) as any[]).map((r) => ({
          ...r.content,
          progress_pct: r.content?.duration_seconds
            ? (r.position_seconds / r.content.duration_seconds) * 100
            : 0,
        })).filter(Boolean);
        setContinueWatching(list);
      });
  }, [user?.id]);

  const hero = items.find((c) => c.is_trending) ?? items[0];
  const trending = items.filter((c) => c.is_trending);
  const byCategory = items.reduce<Record<string, Content[]>>((acc, c) => {
    const k = c.category ?? "General";
    (acc[k] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div>
      {loading && items.length === 0 ? (
        <div className="px-4 py-8 md:px-12 space-y-10">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : (
        <>
          {hero && <CinematicHero hero={hero} />}

          {items.length === 0 && (
            <div className="mx-auto max-w-2xl px-4 md:px-6 py-24 text-center">
              <h2 className="font-display text-3xl font-bold">No content yet</h2>
              <p className="mt-2 text-muted-foreground">{tenant?.name} hasn't published any titles yet. Check back soon.</p>
            </div>
          )}

          <div className="space-y-8 md:space-y-10 px-4 py-8 md:px-12 md:py-10">
            {continueWatching.length > 0 && <Row title="Continue watching" items={continueWatching} />}
            {trending.length > 0 && <Row title="Trending now" items={trending} />}
            {Object.entries(byCategory).map(([cat, list]) => (
              <Row key={cat} title={cat} items={list} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Row({ title, items }: { title: string; items: Content[] }) {
  return (
    <section>
      {title && <h2 className="mb-3 md:mb-4 font-display text-xl md:text-2xl font-bold">{title}</h2>}
      <div className="scrollbar-hide -mx-4 flex gap-3 md:gap-4 overflow-x-auto px-4 md:-mx-12 md:px-12">
        {items.map((c) => (
          <TitleCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}
