import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { applyGeoFilter, useEffectiveCountry, useGeo } from "@/contexts/GeoContext";
import { TitleCard } from "@/components/app/TitleCard";
import { RowSkeleton } from "@/components/app/RowSkeleton";
import { CinematicHero } from "@/components/app/CinematicHero";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/")({ component: AppHome });

// Netflix-style category display order
const CATEGORY_ORDER = [
  "Sports", "News", "Hip-Hop & Urban", "Movies - Action", "Music",
  "Movies - Comedy", "True Crime", "Movies - Drama", "TV Shows",
  "Documentary", "Movies - Horror", "Kids", "Movies - Sci-Fi",
  "History & Science", "Food & Cooking", "Movies - Western",
  "Nature & Animals", "Entertainment", "Health & Fitness",
  "Faith & Inspiration", "Home & Lifestyle", "International",
  "Gaming", "Weather", "Movies - Romance",
];

interface Content {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; hero_url: string | null;
  trailer_hls_url?: string | null; hls_url?: string | null;
  category: string | null; is_trending: boolean;
  content_kind?: string | null;
  duration_seconds?: number | null;
  progress_pct?: number;
}

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function AppHome() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const country = useEffectiveCountry();
  const { showAll } = useGeo();
  const [tenantItems, setTenantItems] = useState<Content[]>([]);
  const [platformCategories, setPlatformCategories] = useState<Record<string, Content[]>>({});
  const [loading, setLoading] = useState(true);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);

  // Load tenant-specific content
  useEffect(() => {
    if (!tenant) return;
    setLoading(true);
    const base = supabase.from("content").select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    applyGeoFilter(base, country, showAll).then(({ data }) => {
      setTenantItems((data as Content[]) ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tenant?.id, country, showAll]);

  // Load platform channels in category batches
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Load first 8 categories worth of content (50 per category)
        const cats: Record<string, Content[]> = {};
        await Promise.all(
          CATEGORY_ORDER.slice(0, 12).map(async (cat) => {
            const { data } = await supabase
              .from("content")
              .select("id, title, description, thumbnail_url, hero_url, hls_url, category, is_trending, content_kind")
              .eq("tenant_id", PLATFORM_TENANT_ID)
              .eq("category", cat)
              .limit(24);
            if (data && data.length > 0) cats[cat] = data as Content[];
          })
        );
        setPlatformCategories(cats);
      } catch {
        // silently fail
      }
    };
    loadCategories();
  }, []);

  // Load continue watching
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

  const hero = tenantItems.find((c) => c.is_trending) ?? tenantItems[0];
  const trending = tenantItems.filter((c) => c.is_trending);
  const tenantByCategory = tenantItems.reduce<Record<string, Content[]>>((acc, c) => {
    const k = c.category ?? "General";
    (acc[k] ||= []).push(c);
    return acc;
  }, {});

  // Merge tenant + platform categories in order
  const allCategories: Array<{ title: string; items: Content[] }> = [];

  if (continueWatching.length > 0) allCategories.push({ title: "Continue Watching", items: continueWatching });
  if (trending.length > 0) allCategories.push({ title: "Trending Now", items: trending });

  // Tenant categories first
  Object.entries(tenantByCategory).forEach(([cat, items]) => {
    allCategories.push({ title: cat, items });
  });

  // Platform categories in Netflix order
  CATEGORY_ORDER.forEach((cat) => {
    if (platformCategories[cat]?.length > 0) {
      allCategories.push({ title: cat, items: platformCategories[cat] });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {loading && tenantItems.length === 0 && Object.keys(platformCategories).length === 0 ? (
        <div className="px-4 py-8 md:px-12 space-y-10">
          {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {hero && <CinematicHero hero={hero} />}

          {tenantItems.length === 0 && Object.keys(platformCategories).length === 0 && (
            <div className="mx-auto max-w-2xl px-4 md:px-6 py-24 text-center">
              <h2 className="font-display text-3xl font-bold">Loading channels...</h2>
              <p className="mt-2 text-muted-foreground">Connecting to 6,000+ free channels.</p>
            </div>
          )}

          <div className="space-y-8 md:space-y-10 px-4 py-8 md:px-12 md:py-10">
            {allCategories.map(({ title, items }) => (
              <ScrollRow key={title} title={title} items={items} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Netflix-style horizontal scroll row with arrow buttons
export function ScrollRow({ title, items }: { title: string; items: Content[] }) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section className="group/row">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="font-display text-lg md:text-2xl font-bold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity">
          {items.length} channels
        </span>
      </div>
      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full w-10 flex items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-6 w-6 text-white drop-shadow" />
        </button>

        {/* Channel row */}
        <div
          ref={rowRef}
          className="scrollbar-hide -mx-4 flex gap-2 md:gap-3 overflow-x-auto px-4 md:-mx-12 md:px-12 scroll-smooth"
        >
          {items.map((c) => (
            <TitleCard key={c.id} c={c} />
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full w-10 flex items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-6 w-6 text-white drop-shadow" />
        </button>
      </div>
    </section>
  );
}

// Keep Row export for other files that use it
export function Row({ title, items }: { title: string; items: Content[] }) {
  return <ScrollRow title={title} items={items} />;
}
