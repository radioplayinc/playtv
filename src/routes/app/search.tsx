import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { applyGeoFilter, useEffectiveCountry, useGeo } from "@/contexts/GeoContext";
import { TitleCard, GenreCard } from "@/components/app/TitleCard";
import { Search, X } from "lucide-react";

export const Route = createFileRoute("/app/search")({ component: SearchPage });

interface Content {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; category: string | null;
}

const GENRES = [
  { title: "Action", color: "#ef4444" },
  { title: "Drama", color: "#8b5cf6" },
  { title: "Comedy", color: "#f59e0b" },
  { title: "Sci-Fi", color: "#06b6d4" },
  { title: "Horror", color: "#dc2626" },
  { title: "Romance", color: "#ec4899" },
  { title: "Thriller", color: "#64748b" },
  { title: "Animation", color: "#10b981" },
  { title: "Documentary", color: "#3b82f6" },
  { title: "Sports", color: "#f97316" },
];

function SearchPage() {
  const { tenant } = useTenant();
  const country = useEffectiveCountry();
  const { showAll } = useGeo();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Content[]>([]);
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenant) return;
    const base = supabase.from("content").select("id,title,description,thumbnail_url,category").eq("tenant_id", tenant.id).limit(40);
    applyGeoFilter(base, country, showAll).then(({ data }) => {
      setAllContent((data as Content[]) ?? []);
    });
  }, [tenant?.id, country, showAll]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      const lower = q.toLowerCase();
      setResults(allContent.filter((c) => c.title.toLowerCase().includes(lower)));
    }, 150);
    return () => clearTimeout(t);
  }, [q, allContent]);

  const byCategory = allContent.reduce<Record<string, Content>>((acc, c) => {
    const k = c.category ?? "General";
    if (!acc[k]) acc[k] = c;
    return acc;
  }, {});
  const genreCovers = byCategory;

  const hasQuery = q.trim().length > 0;

  return (
    <div className="min-h-dvh" style={{ background: "#0a0a0a" }}>
      {/* Header with gradient */}
      <div
        className="sticky top-0 z-20 px-4 pt-12 pb-4"
        style={{
          background: "linear-gradient(180deg, rgba(109,40,217,0.4) 0%, rgba(10,10,10,0.95) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <h1 className="text-xl font-bold text-white mb-3" style={{ letterSpacing: "-0.02em" }}>
          Explore
        </h1>
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setSearching(true)}
            onBlur={() => !q && setSearching(false)}
            placeholder="Search titles, genres, creators…"
            className="w-full rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          {q && (
            <button
              onClick={() => { setQ(""); setSearching(false); inputRef.current?.blur(); }}
              className="absolute right-3"
            >
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-24">
        {hasQuery ? (
          /* Search results */
          <>
            <p className="text-xs text-white/40 mb-4 mt-2">
              {results.length} result{results.length !== 1 ? "s" : ""} for "{q}"
            </p>
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-white/30 text-sm">Nothing found.</p>
                <p className="text-white/20 text-xs mt-1">Try a different title or genre</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {results.map((c) => <TitleCard key={c.id} c={c} />)}
              </div>
            )}
          </>
        ) : (
          /* Discovery view */
          <>
            {/* Genre grid */}
            <div className="mt-4 mb-6">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Browse by genre</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {GENRES.map((g) => (
                  <GenreCard
                    key={g.title}
                    title={g.title}
                    coverUrl={genreCovers[g.title]?.thumbnail_url}
                    onClick={() => { setQ(g.title); inputRef.current?.focus(); }}
                  />
                ))}
              </div>
            </div>

            {/* Trending picks */}
            {allContent.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Popular right now</h2>
                <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
                  {allContent.slice(0, 10).map((c) => <TitleCard key={c.id} c={c} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
