import { Trophy, Medal } from "lucide-react";

interface Leader {
  rank: number;
  display_name: string;
  avatar_url: string | null;
  total_verified_views: number;
  total_earnings: number;
  total_clips: number;
}

const MOCK_LEADERS: Leader[] = [
  { rank: 1, display_name: "xoxo.media", avatar_url: null, total_verified_views: 4_823_000, total_earnings: 3617.25, total_clips: 47 },
  { rank: 2, display_name: "vibes.creator", avatar_url: null, total_verified_views: 3_291_000, total_earnings: 2468.25, total_clips: 31 },
  { rank: 3, display_name: "nightmoves", avatar_url: null, total_verified_views: 2_847_000, total_earnings: 2135.25, total_clips: 28 },
  { rank: 4, display_name: "the_reel_life", avatar_url: null, total_verified_views: 2_103_000, total_earnings: 1577.25, total_clips: 22 },
  { rank: 5, display_name: "creatorfuel", avatar_url: null, total_verified_views: 1_891_000, total_earnings: 1418.25, total_clips: 19 },
  { rank: 6, display_name: "wavesndreams", avatar_url: null, total_verified_views: 1_547_000, total_earnings: 1160.25, total_clips: 17 },
  { rank: 7, display_name: "bnxclips", avatar_url: null, total_verified_views: 1_284_000, total_earnings: 963.00, total_clips: 15 },
  { rank: 8, display_name: "pressplay.ent", avatar_url: null, total_verified_views: 1_037_000, total_earnings: 777.75, total_clips: 13 },
];

const RANK_STYLES: Record<number, { bg: string; text: string; icon?: React.ReactNode }> = {
  1: { bg: "bg-amber-500/20 border-amber-500/40", text: "text-amber-400", icon: <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> },
  2: { bg: "bg-slate-400/10 border-slate-400/30", text: "text-slate-300", icon: <Medal className="w-3.5 h-3.5 text-slate-300" /> },
  3: { bg: "bg-orange-700/20 border-orange-700/30", text: "text-orange-400", icon: <Medal className="w-3.5 h-3.5 text-orange-400" /> },
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

interface Props {
  campaignId?: string;
  leaders?: Leader[];
}

export function LeaderBoard({ leaders = MOCK_LEADERS }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white text-sm">Top Earners</span>
        </div>
        <span className="text-xs text-white/40">This week</span>
      </div>

      <div className="divide-y divide-white/5">
        {leaders.map((leader) => {
          const style = RANK_STYLES[leader.rank];
          return (
            <div
              key={leader.rank}
              className={`flex items-center gap-3 px-5 py-3 ${leader.rank <= 3 ? "bg-white/[0.02]" : ""}`}
            >
              {/* Rank badge */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${style?.bg ?? "bg-white/5 border-white/10"} ${style?.text ?? "text-white/50"}`}
              >
                {style?.icon ?? leader.rank}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-600/40 flex items-center justify-center text-xs font-semibold text-white">
                {leader.avatar_url ? (
                  <img src={leader.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  initials(leader.display_name)
                )}
              </div>

              {/* Name + clips */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">@{leader.display_name}</div>
                <div className="text-xs text-white/40">{leader.total_clips} clips</div>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-white">${leader.total_earnings.toFixed(0)}</div>
                <div className="text-xs text-white/40">{formatViews(leader.total_verified_views)} views</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
