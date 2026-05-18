import { Link } from "@tanstack/react-router";
import { Clock, Users, Eye, TrendingUp, Play } from "lucide-react";

export interface Campaign {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  audio_preview_url: string | null;
  description: string | null;
  genre: string;
  hashtags: string[];
  total_budget: number;
  budget_used: number;
  reward_per_1k_views: number;
  min_clip_length_secs: number;
  max_clip_length_secs: number;
  starts_at: string;
  ends_at: string;
  total_verified_views: number;
  participant_count: number;
  clip_count: number;
  status: string;
  featured: boolean;
  allowed_platforms: string[];
  label_name: string | null;
  creator_id: string | null;
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatBudget(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const GENRE_COLORS: Record<string, string> = {
  "Hip-Hop": "from-orange-500/20 to-red-600/20 border-orange-500/30",
  "Pop": "from-pink-500/20 to-rose-600/20 border-pink-500/30",
  "EDM": "from-cyan-500/20 to-blue-600/20 border-cyan-500/30",
  "R&B": "from-purple-500/20 to-violet-600/20 border-purple-500/30",
  "Rap": "from-yellow-500/20 to-amber-600/20 border-yellow-500/30",
  "Indie Pop": "from-green-500/20 to-emerald-600/20 border-green-500/30",
};

const GENRE_BADGE: Record<string, string> = {
  "Hip-Hop": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Pop": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "EDM": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "R&B": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Rap": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Indie Pop": "bg-green-500/20 text-green-300 border-green-500/30",
};

interface Props {
  campaign: Campaign;
  featured?: boolean;
}

export function CampaignCard({ campaign, featured = false }: Props) {
  const budgetPct = Math.min(100, (campaign.budget_used / campaign.total_budget) * 100);
  const remaining = campaign.total_budget - campaign.budget_used;
  const gradientClass = GENRE_COLORS[campaign.genre] ?? "from-violet-500/20 to-indigo-600/20 border-violet-500/30";
  const badgeClass = GENRE_BADGE[campaign.genre] ?? "bg-violet-500/20 text-violet-300 border-violet-500/30";
  const tl = timeLeft(campaign.ends_at);
  const urgent = tl.includes("h left") && !tl.includes("d");

  return (
    <Link
      to="/blast/campaigns/$id"
      params={{ id: campaign.id }}
      className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br ${gradientClass} border overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10`}
    >
      {/* Cover art */}
      <div className="relative aspect-video overflow-hidden bg-white/5">
        {campaign.cover_url ? (
          <img
            src={campaign.cover_url}
            alt={campaign.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-white/50" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Featured badge */}
        {(campaign.featured || featured) && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600/90 backdrop-blur-sm text-xs font-semibold text-white">
            <TrendingUp className="w-3 h-3" />
            Featured
          </div>
        )}

        {/* Genre badge */}
        <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full border text-xs font-medium ${badgeClass} backdrop-blur-sm`}>
          {campaign.genre}
        </div>

        {/* Time remaining */}
        <div className={`absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm text-xs font-medium ${urgent ? "bg-red-500/80 text-white" : "bg-black/60 text-white/80"}`}>
          <Clock className="w-3 h-3" />
          {tl}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Artist + title */}
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wider">{campaign.artist_name}</div>
          <div className="text-base font-semibold text-white leading-tight mt-0.5">{campaign.title}</div>
          {campaign.label_name && (
            <div className="text-xs text-white/40 mt-0.5">{campaign.label_name}</div>
          )}
        </div>

        {/* Reward */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <div>
            <div className="text-xl font-bold text-white">
              ${campaign.reward_per_1k_views.toFixed(2)}
            </div>
            <div className="text-xs text-white/50">per 1,000 views</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-base font-semibold text-amber-400">{formatBudget(remaining)}</div>
            <div className="text-xs text-white/50">remaining</div>
          </div>
        </div>

        {/* Budget progress */}
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1.5">
            <span>Budget used</span>
            <span>{budgetPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-white/50 pt-1 border-t border-white/10">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatViews(campaign.total_verified_views)} views
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {campaign.participant_count.toLocaleString()} creators
          </span>
        </div>

        {/* Hashtags */}
        {campaign.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {campaign.hashtags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-violet-400 opacity-70">{tag}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <button className="mt-auto w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
          Join Campaign →
        </button>
      </div>
    </Link>
  );
}
