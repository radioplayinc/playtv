import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, DollarSign, TrendingUp, Users, ArrowRight, CheckCircle2,
  Upload, BarChart3, Music, Globe, Shield, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CampaignCard, type Campaign } from "@/components/blast/CampaignCard";
import { LeaderBoard } from "@/components/blast/LeaderBoard";

export const Route = createFileRoute("/blast/")({
  head: () => ({
    meta: [
      { title: "Blast — Earn cash sharing music you love | Radio Play Inc" },
      { name: "description", content: "Join music campaigns, share clips to social media, and earn real cash for every verified view." },
    ],
  }),
  component: BlastLanding,
});

const easeOut = [0.22, 1, 0.36, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.65, ease: easeOut },
};

const STATS = [
  { value: "$2.8M", label: "Paid to creators" },
  { value: "47K+", label: "Active creators" },
  { value: "1.2B+", label: "Verified views" },
  { value: "1,200+", label: "Campaigns run" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <Music className="w-5 h-5" />,
    title: "Browse campaigns",
    desc: "Find music campaigns from top artists and labels. Filter by genre, reward rate, and budget.",
    color: "from-violet-500 to-purple-600",
  },
  {
    step: "02",
    icon: <Upload className="w-5 h-5" />,
    title: "Create & share clips",
    desc: "Make short clips featuring the campaign track and post to TikTok, Instagram, YouTube Shorts, or Twitter.",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    step: "03",
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Earn per view",
    desc: "We verify your view count and pay you cash based on your reach. No minimums, no waiting weeks.",
    color: "from-amber-500 to-orange-600",
  },
];

const CREATOR_FEATURES = [
  { icon: <Globe className="w-4 h-4" />, title: "Multi-platform", desc: "TikTok, Instagram, YouTube, Twitter — post anywhere and earn." },
  { icon: <Shield className="w-4 h-4" />, title: "Bot-proof verification", desc: "Our proprietary view verification filters fake engagement." },
  { icon: <DollarSign className="w-4 h-4" />, title: "Instant earnings", desc: "Daily earnings tracking. Withdraw when you hit $25." },
  { icon: <TrendingUp className="w-4 h-4" />, title: "Leaderboard bonuses", desc: "Top earners per campaign get bonus payouts from the prize pool." },
  { icon: <Users className="w-4 h-4" />, title: "Referral rewards", desc: "Bring in other creators and earn a % of their campaign earnings." },
  { icon: <Star className="w-4 h-4" />, title: "Creator levels", desc: "Level up from Spark → Flame → Blast and unlock higher rate campaigns." },
];

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1800;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <>{count.toLocaleString()}{suffix}</>;
}

function BlastLanding() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("blast_campaigns")
      .select("*")
      .eq("status", "active")
      .order("featured", { ascending: false })
      .order("total_verified_views", { ascending: false })
      .limit(6)
      .then(({ data }: { data: Campaign[] | null }) => {
        if (data) setCampaigns(data);
      });
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative min-h-dvh flex items-center pt-16 overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 10%, rgba(139,92,246,0.25), transparent 55%),
                radial-gradient(ellipse 60% 50% at 80% 80%, rgba(236,72,153,0.15), transparent 55%),
                radial-gradient(ellipse 50% 40% at 60% 30%, rgba(6,182,212,0.10), transparent 50%)
              `,
            }}
          />
          {/* Animated grain */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.03]" aria-hidden>
            <filter id="bnoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#bnoise)" />
          </svg>
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-20">
          <div className="max-w-4xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
              </span>
              The viral music clip economy — by Radio Play Inc
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold -tracking-[0.03em] leading-[0.92] text-white"
            >
              Earn cash sharing
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                music you love.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: easeOut }}
              className="mt-6 text-lg md:text-xl text-white/65 max-w-2xl leading-relaxed"
            >
              Join campaigns from top artists and labels. Share short clips to TikTok, Instagram, YouTube, and more. Get paid for every verified view — no followers required.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.38, ease: easeOut }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                to="/blast/campaigns"
                className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                Browse campaigns
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="px-7 py-3.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/5 font-medium text-sm transition-all"
              >
                How it works
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50"
            >
              {["No upfront cost", "Instant earnings tracking", "Bot-proof verification", "Daily payouts"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-white" />
          <span className="text-xs tracking-widest uppercase text-white">Scroll</span>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/10 bg-white/[0.02] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED CAMPAIGNS ── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...reveal} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-2">Live now</div>
              <h2 className="text-3xl md:text-5xl font-bold -tracking-[0.02em]">Featured campaigns</h2>
            </div>
            <Link
              to="/blast/campaigns"
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors shrink-0"
            >
              View all campaigns <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {campaigns.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {campaigns.map((c) => (
                <motion.div key={c.id} {...reveal}>
                  <CampaignCard campaign={c} />
                </motion.div>
              ))}
            </div>
          ) : (
            /* Skeleton placeholders */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
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
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...reveal} className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-3">Simple as 1-2-3</div>
            <h2 className="text-3xl md:text-5xl font-bold -tracking-[0.02em]">How Blast works</h2>
            <p className="mt-4 text-white/60 text-lg max-w-xl mx-auto">
              Start earning in under 5 minutes. No experience needed.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 hover:bg-white/[0.04] hover:border-white/20 transition-all"
              >
                {/* Step connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-white/20 z-10" />
                )}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} mb-6`}>
                  {step.icon}
                </div>
                <div className="text-xs text-white/30 font-mono mb-2">{step.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-white/60 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD SECTION ── */}
      <section className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div {...reveal}>
              <div className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-3">Community</div>
              <h2 className="text-3xl md:text-5xl font-bold -tracking-[0.02em] mb-6">
                Real creators.
                <br />
                Real earnings.
              </h2>
              <p className="text-white/60 leading-relaxed text-lg mb-8">
                Thousands of creators are already earning on Blast. Your clip doesn't need to go viral — consistent posting and smart campaign selection is all it takes.
              </p>

              <div className="space-y-3">
                {[
                  { label: "Average monthly earnings", value: "$340" },
                  { label: "Top creator monthly earnings", value: "$12,400" },
                  { label: "Average views per clip", value: "28K" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-sm text-white/60">{item.label}</span>
                    <span className="text-base font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/blast/campaigns"
                className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all"
              >
                Start earning now <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.15 }}>
              <LeaderBoard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CREATOR FEATURES ── */}
      <section className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...reveal} className="text-center mb-14">
            <div className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-3">Platform features</div>
            <h2 className="text-3xl md:text-5xl font-bold -tracking-[0.02em]">Built for creators who mean business</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CREATOR_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  {f.icon}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm mb-1">{f.title}</div>
                  <div className="text-white/55 text-sm leading-relaxed">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR CREATORS / LABELS ── */}
      <section id="creators" className="py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Artist/label side */}
            <motion.div {...reveal} className="relative order-2 lg:order-1">
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-violet-600/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Campaign Dashboard</div>
                    <div className="text-white/50 text-xs">Neon Nights · Atlantic Records</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: "Total views", value: "2.8M" },
                    { label: "Active creators", value: "1,247" },
                    { label: "Budget used", value: "$8,413" },
                    { label: "Clips live", value: "3,891" },
                  ].map((s) => (
                    <div key={s.label} className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="text-lg font-bold text-white">{s.value}</div>
                      <div className="text-xs text-white/50">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-2">
                    <span>Campaign budget</span>
                    <span>56% used · $6,587 remaining</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[56%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Copy side */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.15 }} className="order-1 lg:order-2">
              <div className="text-xs uppercase tracking-[0.3em] text-fuchsia-400 mb-3">For artists & labels</div>
              <h2 className="text-3xl md:text-5xl font-bold -tracking-[0.02em] mb-6">
                Launch a viral music campaign in minutes
              </h2>
              <p className="text-white/60 leading-relaxed text-lg mb-8">
                Set your budget, your per-view rate, and your clip guidelines. Blast's creator network handles the rest — turning your track into a movement across every major platform.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Pay only for verified, human-driven views",
                  "Full campaign analytics and ROI reporting",
                  "Automated payouts to creators",
                  "Content moderation and brand safety controls",
                  "A/B test campaign briefs and reward rates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-fuchsia-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/blast/create"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-semibold text-sm transition-all shadow-lg shadow-fuchsia-500/25"
              >
                Launch a campaign <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 md:py-32 border-t border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.15), transparent 65%)",
        }} />
        <motion.div {...reveal} className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold -tracking-[0.02em] mb-6">
            Ready to start earning?
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Join 47,000+ creators already earning on Blast. It's free to join — start earning from your first clip.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-base transition-all shadow-xl shadow-violet-500/30"
            >
              Create free account
            </Link>
            <Link
              to="/blast/campaigns"
              className="px-8 py-4 rounded-full border border-white/20 text-white hover:bg-white/5 font-semibold text-base transition-all"
            >
              Browse campaigns first
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-bold text-white">BLAST</span>
            <span className="text-white/30 text-xs">by Radio Play Inc</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Creator Policy</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 text-xs text-white/25">
          © {new Date().getFullYear()} Radio Play Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
