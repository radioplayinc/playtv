import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link2, Upload, CheckCircle2, Loader2 } from "lucide-react";

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram Reels" },
  { value: "youtube", label: "YouTube Shorts" },
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook Reels" },
  { value: "other", label: "Other" },
];

interface Props {
  campaignId: string;
  campaignTitle: string;
  allowedPlatforms: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

export function ClipSubmitModal({ campaignId, campaignTitle, allowedPlatforms, open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allowed = PLATFORMS.filter((p) => allowedPlatforms.includes(p.value));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!platform || !url.trim()) return;

    setLoading(true);
    try {
      const db = supabase as any;
      const { error: clipErr } = await db.from("blast_clips").insert({
        campaign_id: campaignId,
        user_id: user.id,
        platform,
        external_url: url.trim(),
        caption: caption.trim() || null,
        status: "pending",
      });
      if (clipErr) throw clipErr;

      // Upsert participant
      const { error: partErr } = await db.from("blast_participants").upsert(
        {
          campaign_id: campaignId,
          user_id: user.id,
          display_name: user.email?.split("@")[0] ?? "creator",
        },
        { onConflict: "campaign_id,user_id", ignoreDuplicates: false }
      );
      if (partErr) throw partErr;

      setSubmitted(true);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit clip");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSubmitted(false);
    setPlatform("");
    setUrl("");
    setCaption("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#0d0d1a] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">
            Submit your clip
          </DialogTitle>
          <p className="text-sm text-white/50">
            {campaignTitle} — paste the public link to your clip
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Clip submitted!</div>
              <div className="text-sm text-white/50 mt-1 max-w-xs">
                We'll start tracking views within 24 hours. Earnings are calculated daily.
              </div>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-white/80 text-sm">Platform</Label>
              <Select value={platform} onValueChange={setPlatform} required>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select platform…" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d1a] border-white/10">
                  {allowed.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-white hover:bg-white/10 focus:bg-white/10">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-white/80 text-sm">Clip URL</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://tiktok.com/@you/video/..."
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-white/80 text-sm">Caption / post text <span className="text-white/40">(optional)</span></Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's your clip about?"
                rows={2}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 pt-1 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
              <div className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Your clip must be publicly viewable and include the campaign hashtags.</span>
              </div>
              <div>Views are verified within 24–48 hours. Fake views are automatically filtered.</div>
            </div>

            {!user && (
              <div className="text-sm text-center text-white/50">
                <Link2 className="inline w-4 h-4 mr-1" />
                <span>You need to </span>
                <a href="/login" className="text-violet-400 underline">sign in</a>
                <span> to submit a clip.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !user}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Submitting…" : "Submit Clip"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
