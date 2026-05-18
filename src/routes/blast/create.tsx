import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, X, Info, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/blast/create")({
  head: () => ({ meta: [{ title: "Blast — Launch a Campaign" }] }),
  component: CreateCampaignPage,
});

const GENRES = ["Hip-Hop", "Pop", "R&B", "EDM", "Rap", "Indie Pop", "Country", "Latin", "Rock", "Electronic", "Jazz", "Gospel", "Other"];
const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter", "facebook"];
const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube Shorts",
  twitter: "Twitter / X",
  facebook: "Facebook",
};

const schema = z.object({
  title: z.string().min(2, "Song title required"),
  artist_name: z.string().min(1, "Artist name required"),
  label_name: z.string().optional(),
  description: z.string().min(20, "Please write a brief for creators (min 20 chars)"),
  genre: z.string().min(1, "Select a genre"),
  cover_url: z.string().url("Enter a valid image URL").optional().or(z.literal("")),
  audio_preview_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  total_budget: z.coerce.number().min(500, "Minimum budget is $500"),
  reward_per_1k_views: z.coerce.number().min(0.10, "Minimum $0.10 per 1K views").max(5, "Maximum $5.00 per 1K views"),
  min_clip_length_secs: z.coerce.number().min(3).max(120),
  max_clip_length_secs: z.coerce.number().min(5).max(180),
  ends_at: z.string().min(1, "Set an end date"),
});

type FormData = z.infer<typeof schema>;

function CreateCampaignPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState<string[]>(["#BlastClip"]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram", "youtube"]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      min_clip_length_secs: 5,
      max_clip_length_secs: 60,
      reward_per_1k_views: 0.5,
      total_budget: 5000,
    },
  });

  const budget = watch("total_budget") || 0;
  const rate = watch("reward_per_1k_views") || 0;
  const estimatedViews = rate > 0 ? (budget / rate) * 1000 : 0;

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#?/, "#");
    if (tag.length > 1 && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setHashtagInput("");
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function onSubmit(data: FormData) {
    if (!user) { toast.error("Sign in to launch a campaign"); return; }
    if (platforms.length === 0) { toast.error("Select at least one platform"); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("blast_campaigns").insert({
        title: data.title,
        artist_name: data.artist_name,
        label_name: data.label_name || null,
        description: data.description,
        genre: data.genre,
        cover_url: data.cover_url || null,
        audio_preview_url: data.audio_preview_url || null,
        total_budget: data.total_budget,
        budget_used: 0,
        reward_per_1k_views: data.reward_per_1k_views,
        min_clip_length_secs: data.min_clip_length_secs,
        max_clip_length_secs: data.max_clip_length_secs,
        ends_at: new Date(data.ends_at).toISOString(),
        status: "draft",
        allowed_platforms: platforms,
        hashtags,
        creator_id: user.id,
        featured: false,
      });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="pt-16 min-h-dvh flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Campaign submitted!</h1>
          <p className="text-white/60 leading-relaxed mb-8">
            Your campaign is under review. Our team will approve it within 24–48 hours, after which it goes live to 47,000+ creators.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/blast/campaigns" className="block w-full py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold">
              Browse live campaigns
            </Link>
            <Link to="/blast" className="block w-full py-3 rounded-full border border-white/10 text-white/70 hover:text-white transition-colors">
              Back to Blast home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-dvh">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02] py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/blast" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Blast
          </Link>
          <div className="text-xs uppercase tracking-[0.3em] text-fuchsia-400 mb-2">Artists & Labels</div>
          <h1 className="text-3xl md:text-4xl font-bold -tracking-[0.02em] text-white">Launch a campaign</h1>
          <p className="text-white/55 text-base mt-2 max-w-lg">
            Set your campaign details, budget, and guidelines. Our creator network handles the rest.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Music info */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 text-sm font-bold">1</span>
            Music details
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Song / track title *</Label>
              <Input {...register("title")} placeholder="Neon Nights" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              {errors.title && <span className="text-xs text-red-400">{errors.title.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Artist name *</Label>
              <Input {...register("artist_name")} placeholder="Aria Nova" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              {errors.artist_name && <span className="text-xs text-red-400">{errors.artist_name.message}</span>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Label / publisher <span className="text-white/30">(optional)</span></Label>
              <Input {...register("label_name")} placeholder="Atlantic Records" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Genre *</Label>
              <select {...register("genre")} className="h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50">
                <option value="" className="bg-[#0d0d1a]">Select genre…</option>
                {GENRES.map((g) => <option key={g} value={g} className="bg-[#0d0d1a]">{g}</option>)}
              </select>
              {errors.genre && <span className="text-xs text-red-400">{errors.genre.message}</span>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Cover art URL <span className="text-white/30">(optional)</span></Label>
              <Input {...register("cover_url")} placeholder="https://…" type="url" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              {errors.cover_url && <span className="text-xs text-red-400">{errors.cover_url.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Audio preview URL <span className="text-white/30">(optional)</span></Label>
              <Input {...register("audio_preview_url")} placeholder="https://…" type="url" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-white/70 text-sm">Campaign brief for creators *</Label>
            <Textarea
              {...register("description")}
              placeholder="Describe what kind of clips you want. Be specific about the vibe, setting, and content you're looking for. Great briefs attract better clips."
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
            />
            {errors.description && <span className="text-xs text-red-400">{errors.description.message}</span>}
          </div>
        </section>

        {/* Budget */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-fuchsia-600/30 flex items-center justify-center text-fuchsia-400 text-sm font-bold">2</span>
            Budget & rewards
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Total campaign budget (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input {...register("total_budget")} type="number" min={500} step={100} placeholder="5000" className="pl-6 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              {errors.total_budget && <span className="text-xs text-red-400">{errors.total_budget.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Reward per 1,000 views (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input {...register("reward_per_1k_views")} type="number" min={0.1} max={5} step={0.05} placeholder="0.50" className="pl-6 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              {errors.reward_per_1k_views && <span className="text-xs text-red-400">{errors.reward_per_1k_views.message}</span>}
            </div>
          </div>

          {/* Projection */}
          {budget > 0 && rate > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm">
              <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="text-violet-200">
                At <span className="font-semibold">${rate}/1K views</span>, your <span className="font-semibold">${budget.toLocaleString()}</span> budget can drive up to <span className="font-semibold">{(estimatedViews / 1_000_000).toFixed(1)}M verified views</span>.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-white/70 text-sm">Campaign end date *</Label>
            <Input
              {...register("ends_at")}
              type="datetime-local"
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
              className="bg-white/5 border-white/10 text-white"
            />
            {errors.ends_at && <span className="text-xs text-red-400">{errors.ends_at.message}</span>}
          </div>
        </section>

        {/* Clip guidelines */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-600/30 flex items-center justify-center text-amber-400 text-sm font-bold">3</span>
            Clip guidelines
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Min clip length (seconds)</Label>
              <Input {...register("min_clip_length_secs")} type="number" min={3} max={120} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/70 text-sm">Max clip length (seconds)</Label>
              <Input {...register("max_clip_length_secs")} type="number" min={5} max={180} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>

          {/* Hashtags */}
          <div className="flex flex-col gap-2">
            <Label className="text-white/70 text-sm">Required hashtags</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/10 min-h-[48px]">
              {hashtags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm">
                  {tag}
                  <button type="button" onClick={() => setHashtags(hashtags.filter((t) => t !== tag))} className="text-violet-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
                  placeholder="Add hashtag…"
                  className="bg-transparent text-sm text-white placeholder:text-white/30 outline-none w-28"
                />
                <button type="button" onClick={addHashtag} className="text-white/40 hover:text-violet-400 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div className="flex flex-col gap-2">
            <Label className="text-white/70 text-sm">Allowed platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${platforms.includes(p) ? "bg-violet-600 border-violet-600 text-white" : "border-white/10 text-white/50 hover:text-white hover:bg-white/5"}`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Auth gate */}
        {!user && (
          <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-sm text-amber-200">
            <Link to="/login" className="underline font-medium">Sign in</Link> or <Link to="/signup" className="underline font-medium">create an account</Link> to launch a campaign.
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Link to="/blast" className="px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-all">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !user}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit campaign for review"}
          </button>
        </div>
      </form>
    </div>
  );
}
