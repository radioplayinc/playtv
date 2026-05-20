import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock, Users, Eye, DollarSign, ArrowLeft, Play, CheckCircle2,
  Share2, Instagram, Youtube, Twitter, ExternalLink, TrendingUp, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type Campaign } from "@/components/blast/CampaignCard";
import { LeaderBoard } from "@/components/blast/LeaderBoard";
import { ClipSubmitModal } from "@/components/blast/ClipSubmitModal";
import { toast } from "sonner";

export const Route = createFileRoute("/blast/campaigns/$id")({
  component: CampaignDetailPage,
});

interface Clip {
  id: string;
  platform: string;
  external_url: string;
  verified_views: number;
  earnings: number;
  status: string;
  created_at: string;
  caption: string | null;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  tiktok: <Share2 className="w-4 h-4" />,
  facebook: <Share2 className="w-4 h-4" />,
  other: <Share2 className="w-4 h-4" />,
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  verified: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  paid: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

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

function CampaignDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const db = supabase as any;
      const [{ data: camp }, { data: myClips }, { data: part }] = await Promise.all([
        db.from("blast_campaigns").select("*").eq("id", id).single(),
        user ? db.from("blast_clips").select("*").eq("campaign_id", id).eq("user_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        user ? db.from("blast_participants").select("id").eq("campaign_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (camp) setCampaign(camp as Campaign);
      if (myClips) setClips(myClips as Clip[]);
      if (part) setHasJoined(true);
      setLoading(false);
    }
    load();
  }, [id, user]);

  function refreshClips() {
    if (!user) return;
    (supabase as any).from("blast_clips").select("*").eq("campaign_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }: { data: Clip[] | null }) => {
      if (data) setClips(data as Clip[]);
      setHasJoined(true);
    });
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  if (loading) {
    return (
      <div className="pt-16 min-h-dvh flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="pt-16 min-h-dvh flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-white/40 text-lg">Campaign not found.</div>
        <Link to="/blast/campaigns" className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </Link>
      </div>
    );
  }

  const budgetPct = Math.min(100, (campaign.budget_used / campaign.total_budget) * 100);
  const remaining = campaign.total_budget - campaign.budget_used;
  const tl = timeLeft(campaign.ends_at);
  const myTotalViews = clips.reduce((s, c) => s + c.verified_views, 0);
  const myTotalEarnings = clips.reduce((s, c) => s + c.earnings, 0);
  const isEnded = campaign.status === "ended" || tl === "Ended";

  return (
    <div className="pt-16 min-h-dvh">
      {/* Hero banner */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {campaign.cover_url ? (
          <img src={campaign.cover_url} alt={campaign.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-fuchsia-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080812] via-[#080812]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080812]/80 to-transparent" />

        <div className="relative h-full flex items-end px-4 sm:px-6 max-w-7xl mx-auto pb-8">
          <div>
            <Link to="/blast/campaigns" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> All campaigns
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-600/80 text-white text-xs font-medium">{campaign.genre}</span>
              {campaign.featured && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Featured
                </span>
              )}
              {isEnded && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/50 text-xs">Ended</span>
              )}
            </div>
            <div className="text-white/60 text-sm">{campaign.artist_name}</div>
            <h1 className="text-3xl md:text-5xl font-bold text-white -tracking-[0.02em]">{campaign.title}</h1>
            {campaign.label_name && <div className="text-white/40 text-sm mt-1">{campaign.label_name}</div>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <DollarSign className="w-4 h-4 text-amber-400" />, value: `$${campaign.reward_per_1k_views.toFixed(2)}`, label: "per 1K views" },
                { icon: <Eye className="w-4 h-4 text-violet-400" />, value: formatViews(campaign.total_verified_views), label: "verified views" },
                { icon: <Users className="w-4 h-4 text-fuchsia-400" />, value: campaign.participant_count.toLocaleString(), label: "creators" },
                { icon: <Clock className="w-4 h-4 text-cyan-400" />, value: tl, label: "remaining" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  {s.icon}
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Budget */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-white">Campaign budget</span>
                <span className="text-sm text-white/50">{budgetPct.toFixed(0)}% used</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">${campaign.budget_used.toLocaleString()} used</span>
                <span className="text-amber-400 font-semibold">${remaining.toLocaleString()} remaining</span>
              </div>
            </div>

            {/* Description */}
            {campaign.description && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Campaign brief</h2>
                <p className="text-white/65 leading-relaxed">{campaign.description}</p>
              </div>
            )}

            {/* Requirements */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Campaign requirements</h2>
              <div className="space-y-2.5">
                {[
                  `Clip must be ${campaign.min_clip_length_secs}–${campaign.max_clip_length_secs} seconds long`,
                  "Clip must feature the full campaign track (no muting or major audio edits)",
                  `Include required hashtags: ${campaign.hashtags.join(", ")}`,
                  "Post must be public and remain live for at least 30 days",
                  "No purchased views or bot engagement — violators are permanently banned",
                ].map((req) => (
                  <div key={req} className="flex items-start gap-2.5 text-sm text-white/65">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    {req}
                  </div>
                ))}
              </div>
            </div>

            {/* Allowed platforms */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Allowed platforms</h2>
              <div className="flex flex-wrap gap-2">
                {campaign.allowed_platforms.map((p) => (
                  <div key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 capitalize">
                    {PLATFORM_ICONS[p] ?? <Share2 className="w-4 h-4" />}
                    {p === "youtube" ? "YouTube Shorts" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            {/* Required hashtags */}
            {campaign.hashtags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Required hashtags</h2>
                <div className="flex flex-wrap gap-2">
                  {campaign.hashtags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* My clips (if joined) */}
            {user && clips.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">My clips</h2>
                <div className="space-y-3">
                  {clips.map((clip) => (
                    <div key={clip.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                        {PLATFORM_ICONS[clip.platform] ?? <Share2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">{clip.external_url}</div>
                        <div className="text-xs text-white/40 mt-0.5 capitalize">{clip.platform}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-white">{formatViews(clip.verified_views)} views</div>
                        <div className="text-xs text-amber-400">${clip.earnings.toFixed(2)} earned</div>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full border text-xs ${STATUS_BADGE[clip.status] ?? "bg-white/10 text-white/50"}`}>
                        {clip.status}
                      </span>
                      <a href={clip.external_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Top earners this campaign</h2>
              <LeaderBoard campaignId={id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* My earnings card */}
            {user && hasJoined && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
                <div className="text-xs text-violet-300 uppercase tracking-wider mb-3">My earnings</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-white">${myTotalEarnings.toFixed(2)}</div>
                    <div className="text-xs text-white/50">Total earned</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{formatViews(myTotalViews)}</div>
                    <div className="text-xs text-white/50">Verified views</div>
                  </div>
                </div>
                <div className="text-xs text-white/40 mt-3">{clips.length} clip{clips.length !== 1 ? "s" : ""} submitted</div>
              </div>
            )}

            {/* CTA card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  ${campaign.reward_per_1k_views.toFixed(2)}
                  <span className="text-base text-white/50 font-normal"> / 1K views</span>
                </div>
                <div className="text-sm text-amber-400 font-medium mt-1">
                  ${remaining.toLocaleString()} budget remaining
                </div>
              </div>

              {isEnded ? (
                <div className="text-center py-3 text-white/40 text-sm">This campaign has ended.</div>
              ) : !user ? (
                <div className="space-y-2">
                  <Link
                    to="/signup"
                    className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all"
                  >
                    Sign up to participate
                  </Link>
                  <Link
                    to="/login"
                    className="block w-full text-center py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm transition-all"
                  >
                    Already have an account?
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => setSubmitOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {hasJoined ? "Submit another clip" : "Join & submit clip"}
                </button>
              )}

              <button
                onClick={copyShareLink}
                className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share campaign
              </button>
            </div>

            {/* Payout breakdown */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold text-white mb-4">Example earnings</div>
              <div className="space-y-2.5 text-sm">
                {[
                  { views: "10K", earn: (10 * campaign.reward_per_1k_views).toFixed(2) },
                  { views: "50K", earn: (50 * campaign.reward_per_1k_views).toFixed(2) },
                  { views: "100K", earn: (100 * campaign.reward_per_1k_views).toFixed(2) },
                  { views: "500K", earn: (500 * campaign.reward_per_1k_views).toFixed(2) },
                  { views: "1M", earn: (1000 * campaign.reward_per_1k_views).toFixed(2) },
                ].map((row) => (
                  <div key={row.views} className="flex justify-between text-white/65">
                    <span>{row.views} views</span>
                    <span className="text-amber-400 font-medium">${row.earn}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator dashboard link */}
            {user && (
              <Link
                to="/blast/dashboard"
                className="block text-center py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5 text-sm transition-all"
              >
                View my full dashboard →
              </Link>
            )}
          </div>
        </div>
      </div>

      <ClipSubmitModal
        campaignId={id}
        campaignTitle={campaign.title}
        allowedPlatforms={campaign.allowed_platforms}
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onSuccess={refreshClips}
      />
    </div>
  );
}
