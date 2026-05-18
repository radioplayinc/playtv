import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Eye, TrendingUp, Play, Clock, ArrowRight,
  Plus, CheckCircle2, AlertCircle, Loader2, BarChart3, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/blast/dashboard")({
  head: () => ({ meta: [{ title: "Blast — My Dashboard" }] }),
  beforeLoad: async ({ context }: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" as any });
  },
  component: DashboardPage,
});

interface ParticipantRow {
  id: string;
  campaign_id: string;
  joined_at: string;
  total_clips: number;
  total_verified_views: number;
  total_earnings: number;
  rank: number | null;
  blast_campaigns: {
    id: string;
    title: string;
    artist_name: string;
    cover_url: string | null;
    genre: string;
    reward_per_1k_views: number;
    ends_at: string;
    status: string;
  } | null;
}

interface ClipRow {
  id: string;
  campaign_id: string;
  platform: string;
  external_url: string;
  verified_views: number;
  earnings: number;
  status: string;
  created_at: string;
}

interface PayoutRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

const reveal = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  verified: "text-emerald-400",
  rejected: "text-red-400",
  paid: "text-violet-400",
};

const STATUS_BG: Record<string, string> = {
  pending: "bg-amber-500/10 border-amber-500/20",
  verified: "bg-emerald-500/10 border-emerald-500/20",
  rejected: "bg-red-500/10 border-red-500/20",
  paid: "bg-violet-500/10 border-violet-500/20",
};

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d left`;
  return "Ending today";
}

function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [participations, setParticipations] = useState<ParticipantRow[]>([]);
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const db = supabase as any;
      const [{ data: parts }, { data: clipsData }, { data: payoutsData }] = await Promise.all([
        db
          .from("blast_participants")
          .select("*, blast_campaigns(id, title, artist_name, cover_url, genre, reward_per_1k_views, ends_at, status)")
          .eq("user_id", user!.id)
          .order("joined_at", { ascending: false }),
        db
          .from("blast_clips")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(20),
        db
          .from("blast_payouts")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setParticipations((parts as ParticipantRow[]) ?? []);
      setClips((clipsData as ClipRow[]) ?? []);
      setPayouts((payoutsData as PayoutRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  const totalEarnings = participations.reduce((s, p) => s + p.total_earnings, 0);
  const totalViews = participations.reduce((s, p) => s + p.total_verified_views, 0);
  const totalClips = participations.reduce((s, p) => s + p.total_clips, 0) || clips.length;
  const pendingEarnings = clips.filter((c) => c.status === "pending").reduce((s, c) => s + c.earnings, 0);
  const paidOut = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="pt-16 min-h-dvh flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-dvh">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <motion.div {...reveal}>
            <div className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-2">Creator hub</div>
            <h1 className="text-3xl md:text-4xl font-bold -tracking-[0.02em] text-white">
              My Dashboard
            </h1>
            <p className="text-white/50 text-sm mt-1">{user?.email}</p>
          </motion.div>
          <Link
            to="/blast/campaigns"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Join a campaign
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Earnings overview */}
        <motion.div {...reveal} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: <DollarSign className="w-5 h-5 text-amber-400" />,
              label: "Total earned",
              value: `$${totalEarnings.toFixed(2)}`,
              sub: `$${paidOut.toFixed(2)} paid out`,
              color: "border-amber-500/20 bg-amber-500/5",
            },
            {
              icon: <Eye className="w-5 h-5 text-violet-400" />,
              label: "Verified views",
              value: formatViews(totalViews),
              sub: `${totalClips} clips total`,
              color: "border-violet-500/20 bg-violet-500/5",
            },
            {
              icon: <Clock className="w-5 h-5 text-fuchsia-400" />,
              label: "Pending",
              value: `$${pendingEarnings.toFixed(2)}`,
              sub: "being verified",
              color: "border-fuchsia-500/20 bg-fuchsia-500/5",
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-cyan-400" />,
              label: "Active campaigns",
              value: participations.filter((p) => p.blast_campaigns?.status === "active").length.toString(),
              sub: `${participations.length} total joined`,
              color: "border-cyan-500/20 bg-cyan-500/5",
            },
          ].map((card) => (
            <div key={card.label} className={`p-5 rounded-2xl border ${card.color}`}>
              {card.icon}
              <div className="mt-3 text-2xl font-bold text-white">{card.value}</div>
              <div className="text-xs text-white/50 mt-0.5">{card.label}</div>
              <div className="text-xs text-white/35 mt-1">{card.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Payout CTA */}
        {totalEarnings >= 25 && paidOut < totalEarnings && (
          <motion.div {...reveal} className="flex items-center gap-4 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-white">You're eligible to withdraw!</div>
              <div className="text-sm text-white/60">You have ${(totalEarnings - paidOut).toFixed(2)} available for payout.</div>
            </div>
            <button className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex-shrink-0">
              Request payout
            </button>
          </motion.div>
        )}

        {totalEarnings < 25 && totalEarnings > 0 && (
          <motion.div {...reveal} className="flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
            <AlertCircle className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white">Minimum payout: $25</div>
              <div className="text-sm text-white/50 mt-1">
                You need ${(25 - totalEarnings).toFixed(2)} more to withdraw. Keep posting clips!
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-xs">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${(totalEarnings / 25) * 100}%` }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* My campaigns */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">My campaigns</h2>
            <Link to="/blast/campaigns" className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 transition-colors">
              Find more <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {participations.length === 0 ? (
            <div className="flex flex-col items-center py-16 rounded-2xl border border-white/10 bg-white/[0.02] text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white/20" />
              </div>
              <div>
                <div className="text-white/50 font-medium">No campaigns yet</div>
                <div className="text-white/30 text-sm mt-1">Join a campaign to start earning.</div>
              </div>
              <Link to="/blast/campaigns" className="px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                Browse campaigns
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {participations.map((p) => {
                const camp = p.blast_campaigns;
                if (!camp) return null;
                return (
                  <Link
                    key={p.id}
                    to="/blast/campaigns/$id"
                    params={{ id: camp.id }}
                    className="group flex flex-col gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {camp.cover_url ? (
                        <img src={camp.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Play className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/40 truncate">{camp.artist_name}</div>
                        <div className="text-sm font-semibold text-white truncate">{camp.title}</div>
                        <div className={`text-xs mt-0.5 ${camp.status === "active" ? "text-emerald-400" : "text-white/30"}`}>
                          {camp.status === "active" ? `● Active · ${timeLeft(camp.ends_at)}` : "Ended"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                      <div className="text-center">
                        <div className="text-base font-bold text-white">${p.total_earnings.toFixed(0)}</div>
                        <div className="text-xs text-white/40">earned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-bold text-white">{formatViews(p.total_verified_views)}</div>
                        <div className="text-xs text-white/40">views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-bold text-white">{p.total_clips}</div>
                        <div className="text-xs text-white/40">clips</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent clips */}
        {clips.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-5">Recent clips</h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="divide-y divide-white/5">
                {clips.slice(0, 8).map((clip) => (
                  <div key={clip.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-white/20" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/70 truncate">{clip.external_url}</div>
                      <div className="text-xs text-white/40 capitalize mt-0.5">
                        {clip.platform} · {new Date(clip.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-white">{formatViews(clip.verified_views)}</div>
                      <div className="text-xs text-white/40">views</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-amber-400">${clip.earnings.toFixed(2)}</div>
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full border text-xs capitalize ${STATUS_BG[clip.status] ?? "bg-white/5 border-white/10"} ${STATUS_COLORS[clip.status] ?? "text-white/50"}`}>
                      {clip.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics placeholder */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 flex flex-col items-center gap-3 text-center">
          <BarChart3 className="w-8 h-8 text-white/20" />
          <div className="text-white/50 font-medium">Full analytics coming soon</div>
          <div className="text-white/30 text-sm max-w-sm">
            View your view velocity, best-performing clips, platform breakdown, and earnings trends.
          </div>
        </div>
      </div>
    </div>
  );
}
