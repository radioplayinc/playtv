import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CampaignCard, type Campaign } from "@/components/blast/CampaignCard";

export const Route = createFileRoute("/blast/campaigns")({
  head: () => ({
    meta: [{ title: "Blast — Browse Campaigns" }],
  }),
  component: CampaignsPage,
});

const GENRES = ["All", "Hip-Hop", "Pop", "R&B", "EDM", "Rap", "Indie Pop"];
const SORT_OPTIONS = [
  { value: "views", label: "Most views" },
  { value: "reward", label: "Highest reward" },
  { value: "newest", label: "Newest" },
  { value: "ending", label: "Ending soon" },
];

const reveal = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("views");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    let q = (supabase as any)
      .from("blast_campaigns")
      .select("*")
      .in("status", ["active"]);

    if (genre !== "All") q = q.eq("genre", genre);

    if (sort === "views") q = q.order("total_verified_views", { ascending: false });
    else if (sort === "reward") q = q.order("reward_per_1k_views", { ascending: false });
    else if (sort === "newest") q = q.order("created_at", { ascending: false });
    else if (sort === "ending") q = q.order("ends_at", { ascending: true });

    q.limit(24).then(({ data }: { data: Campaign[] | null }) => {
      let results = data ?? [];
      if (search.trim()) {
        const q = search.toLowerCase();
        results = results.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.artist_name.toLowerCase().includes(q) ||
            c.genre.toLowerCase().includes(q)
        );
      }
      setCampaigns(results);
      setLoading(false);
    });
  }, [genre, sort, search]);

  return (
    <div className="pt-16 min-h-dvh">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div {...reveal}>
            <div className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-2">Live campaigns</div>
            <h1 className="text-3xl md:text-5xl font-bold -tracking-[0.02em] text-white">Browse campaigns</h1>
            <p className="mt-3 text-white/55 text-lg max-w-xl">
              Pick a campaign, share your clip, and earn for every verified view.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-30 border-b border-white/10 bg-[#080812]/95 backdrop-blur-xl py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artist or song…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-violet-500/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Genre tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 hide-scrollbar flex-1">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  genre === g
                    ? "bg-violet-600 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort + filter toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0d0d1a]">
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${showFilters ? "bg-violet-600 border-violet-600 text-white" : "border-white/10 text-white/50 hover:text-white hover:bg-white/5"}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>
        </div>

        {/* Extended filters panel */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-4 text-sm text-white/60 pt-3 border-t border-white/10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-violet-500" />
              <span>Featured only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-violet-500" />
              <span>Ending soon</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-violet-500" />
              <span>Budget {`>`} 50% remaining</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-violet-500" />
              <span>TikTok allowed</span>
            </label>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-6 bg-white/10 rounded w-3/4" />
                  <div className="h-14 bg-white/5 rounded-xl" />
                  <div className="h-2 bg-white/10 rounded-full" />
                  <div className="h-10 bg-white/10 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Zap className="w-7 h-7 text-white/20" />
            </div>
            <div className="text-white/50 text-lg font-medium">No campaigns found</div>
            <div className="text-white/30 text-sm mt-1">Try different filters or check back soon.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
              >
                <CampaignCard campaign={c} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Result count */}
        {!loading && campaigns.length > 0 && (
          <div className="text-center mt-10 text-sm text-white/30">
            Showing {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
