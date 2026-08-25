import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { applyGeoFilter, useEffectiveCountry, useGeo } from "@/contexts/GeoContext";
import { TitleCard } from "@/components/app/TitleCard";
import { RowSkeleton } from "@/components/app/RowSkeleton";
import { CinematicHero } from "@/components/app/CinematicHero";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/")({ component: AppHome });

interface Content {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; hero_url: string | null;
  trailer_hls_url?: string | null;
  category: string | null; is_trending: boolean;
  duration_seconds?: number | null;
  progress_pct?: number;
}

const FILTER_TABS = ["All", "TV Shows", "Movies", "Kids"];

function AppHome() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const country = useEffectiveCountry();
  const { showAll } = useGeo();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant) return;
    setLoading(true);
    const base = supabase.from("content").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false });
    applyGeoFilter(base, country, showAll).then(({ data }) => {
      setItems((data as Content[]) ?? []);
      setLoading(false);
    });
  }, [tenant?.id, country, showAll]);

  useEffect(() => {
    if (!user) return;
    supabase.from("watch_history")
      .select("position_seconds, content(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const list = ((data ?? []) as any[]).map((r) => ({
          ...r.content,
          progress_pct: r.content?.duration_seconds
            ? (r.position_seconds / r.content.duration_seconds) * 100 : 0,
        })).filter(Boolean);
        setContinueWatching(list);
      });
  }, [user?.id]);

  const filtered = activeFilter === "All"
    ? items
    : items.filter((c) => {
        if (activeFilter === "TV Shows") return c.category?.toLowerCase().includes("series") || c.category?.toLowerCase().includes("show") || c.category?.toLowerCase().includes("tv");
        if (activeFilter === "Movies") return c.category?.toLowerCase().includes("movie") || c.category?.toLowerCase().includes("film");
        if (activeFilter === "Kids") return c.category?.toLowerCase().includes("kid") || c.category?.toLowerCase().includes("family");
        return true;
      });

  const hero = filtered.find((c) => c.is_trending) ?? filtered[0];
  const trending = filtered.filter((c) => c.is_trending);
  const byCategory = filtered.reduce<Record<string, Content[]>>((acc, c) => {
    const k = c.category ?? "General";
    (acc[k] ||= []).push(c);
    return acc;
  }, {});

  if (loading && items.length === 0) {
    return (
      <div className="space-y-8 px-4 pt-14 pb-4">
        <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  return (
    <div>
      {/* Category filter tabs — fixed at top */}
      <div
        ref={filterRef}
        className="sticky top-0 z-20 px-4 pt-3 pb-2 flex gap-2 overflow-x-auto hide-scrollbar"
        style={{ background: "rgba(10,10,10,0.9)", backdropFilter: "blur(16px)" }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
            style={
              activeFilter === tab
                ? { background: "#facc15", color: "#0a0a0a" }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-8">
          <p className="text-white/40">No content available yet.</p>
        </div>
      ) : (
        <>
          {/* Hero billboard */}
          {hero && <CinematicHero hero={hero} />}

          {/* Content rows */}
          <div className="space-y-8 py-6">
            {continueWatching.length > 0 && (
              <ContentRow title="Continue watching" items={continueWatching} />
            )}
            {trending.length > 0 && (
              <ContentRow title="Trending now" items={trending} accent />
            )}
            {Object.entries(byCategory).map(([cat, list]) => (
              <ContentRow key={cat} title={cat} items={list} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ContentRow({
  title,
  items,
  accent = false,
}: {
  title: string;
  items: Content[];
  accent?: boolean;
}) {
  return (
    <section>
      <div className="flex items-center justify-between px-4 mb-3">
        <h2
          className="text-base font-bold text-white"
          style={{ letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
        {items.length > 5 && (
          <button className="flex items-center gap-0.5 text-xs font-medium" style={{ color: accent ? "#facc15" : "rgba(255,255,255,0.4)" }}>
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 hide-scrollbar"
      >
        {items.map((c) => (
          <TitleCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}

/* Legacy export for search page compatibility */
export function Row({ title, items }: { title: string; items: Content[] }) {
  return <ContentRow title={title} items={items} />;
}
