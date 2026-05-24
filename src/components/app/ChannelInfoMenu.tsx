import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Info,
  Mail,
  Phone,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Share2,
  StickyNote,
  Tv,
  Smartphone,
  Monitor,
  Shield,
} from "lucide-react";

interface ChannelInfoMenuProps {
  contentId: string;
  children: React.ReactNode;
}

export function ChannelInfoMenu({ contentId, children }: ChannelInfoMenuProps) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    loadNote();
  }, [user, open, contentId]);

  const loadNote = async () => {
    if (!user) return;
    setNoteLoading(true);
    const { data } = await supabase
      .from("user_notes")
      .select("note_text")
      .eq("user_id", user.id)
      .eq("content_id", contentId)
      .maybeSingle();
    setUserNote(data?.note_text ?? "");
    setNoteLoading(false);
  };

  const saveNote = async () => {
    if (!user) {
      toast.error("Please sign in to save notes");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_notes").upsert(
      {
        user_id: user.id,
        content_id: contentId,
        note_text: userNote,
      },
      { onConflict: "user_id,content_id" }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Note saved");
  };

  const shareContent = async (method: "copy" | "email" | "sms") => {
    const url = window.location.href;
    
    if (method === "copy") {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } else if (method === "email") {
      window.location.href = `mailto:?subject=Check this out&body=${encodeURIComponent(url)}`;
    } else if (method === "sms") {
      window.location.href = `sms:?body=${encodeURIComponent(url)}`;
    }
  };

  if (!tenant) return <>{children}</>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Channel Information
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="platforms">Apps</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-4 pt-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">About {tenant.name}</h3>
              <p className="text-sm text-muted-foreground">
                Official streaming channel for {tenant.name} content.
              </p>
            </div>

            {(tenant.contact_email || tenant.contact_phone || tenant.contact_website) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact
                </h4>
                {tenant.contact_email && (
                  <a
                    href={`mailto:${tenant.contact_email}`}
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Mail className="h-4 w-4" />
                    {tenant.contact_email}
                  </a>
                )}
                {tenant.contact_phone && (
                  <a
                    href={`tel:${tenant.contact_phone}`}
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    {tenant.contact_phone}
                  </a>
                )}
                {tenant.contact_website && (
                  <a
                    href={tenant.contact_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Globe className="h-4 w-4" />
                    Visit website
                  </a>
                )}
              </div>
            )}

            {(tenant.social_facebook || tenant.social_twitter || tenant.social_instagram || tenant.social_youtube) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Social Media
                </h4>
                <div className="flex items-center gap-3">
                  {tenant.social_facebook && (
                    <a
                      href={tenant.social_facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {tenant.social_twitter && (
                    <a
                      href={tenant.social_twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {tenant.social_instagram && (
                    <a
                      href={tenant.social_instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {tenant.social_youtube && (
                    <a
                      href={tenant.social_youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {tenant.privacy_policy_url && (
              <a
                href={tenant.privacy_policy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
              </a>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 pt-4">
            {!user ? (
              <p className="text-sm text-muted-foreground">Sign in to save personal notes about this content.</p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Your personal notes</label>
                  <textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    disabled={noteLoading}
                    rows={6}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
                    placeholder="Add your thoughts, reminders, or notes about this content..."
                  />
                </div>
                <button
                  onClick={saveNote}
                  disabled={saving || noteLoading}
                  className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save note"}
                </button>
              </>
            )}
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {tenant.name} is available on the following platforms:
            </p>
            <div className="space-y-2">
              {tenant.platform_web && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Monitor className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Web Browser</span>
                </div>
              )}
              {tenant.platform_roku && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Tv className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Roku</span>
                </div>
              )}
              {tenant.platform_firetv && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Tv className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Amazon Fire TV</span>
                </div>
              )}
              {tenant.platform_appletv && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Tv className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Apple TV</span>
                </div>
              )}
              {tenant.platform_androidtv && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Tv className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Android TV</span>
                </div>
              )}
              {tenant.platform_ios && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">iOS</span>
                </div>
              )}
              {tenant.platform_android && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Android</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="share" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground mb-4">Share this content:</p>
            <div className="space-y-2">
              <button
                onClick={() => shareContent("copy")}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-surface"
              >
                <Share2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Copy link</span>
              </button>
              <button
                onClick={() => shareContent("email")}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-surface"
              >
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Share via email</span>
              </button>
              <button
                onClick={() => shareContent("sms")}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-surface"
              >
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Share via text message</span>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
