import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Star, Tv as TvIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { MuxUploader } from "@/components/dashboard/MuxUploader";
import { AppConverter } from "@/components/dashboard/AppConverter";

export const Route = createFileRoute("/_authenticated/dashboard/")({ component: DashboardPage });

interface Tenant {
  id: string; name: string; slug: string; logo_url: string | null; icon_url: string | null;
  primary_color: string; accent_color: string;
}
interface Content {
  id: string; tenant_id: string; title: string; description: string | null;
  thumbnail_url: string | null; hero_url: string | null; hls_url: string | null;
  mp4_url: string | null; category: string | null; is_trending: boolean;
  mux_status?: string;
}
interface Channel { id: string; tenant_id: string; name: string; logo_url: string | null; description: string | null; }
interface Plan { id: string; name: string; description: string | null; price_cents: number; interval: string; is_active: boolean; }

function DashboardPage() {
  const { user } = useAuth();
  const { tenant, refresh } = useTenant();
  const [adminTenants, setAdminTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .in("role", ["tenant_admin", "super_admin"]);
      const tenantIds = (roles ?? []).map((r) => r.tenant_id).filter(Boolean) as string[];
      const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
      let q = supabase.from("tenants").select("*");
      if (!isSuper) q = q.in("id", tenantIds);
      const { data } = await q;
      const list = (data as Tenant[]) ?? [];
      setAdminTenants(list);
      setActiveTenantId(tenant?.id ?? list[0]?.id ?? null);
    })();
  }, [user, tenant?.id]);

  const active = adminTenants.find((t) => t.id === activeTenantId) ?? null;

  if (!active) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <TvIcon className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">No tenant assigned</h1>
          <p className="mt-2 text-muted-foreground">
            You need to be assigned as a tenant admin. Ask your platform admin to assign you to a tenant.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">{active.name}</h1>
            <p className="mt-1 text-muted-foreground">Tenant dashboard</p>
          </div>
          {adminTenants.length > 1 && (
            <select
              value={activeTenantId ?? ""}
              onChange={(e) => setActiveTenantId(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-auto"
            >
              {adminTenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        <Tabs defaultValue="branding" className="mt-6 md:mt-8">
          <TabsList className="bg-card w-full sm:w-auto overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="content">Content library</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="distribute">Distribute</TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="mt-6">
            <BrandingTab tenant={active} onSaved={async () => { await refresh(); }} />
          </TabsContent>
          <TabsContent value="content" className="mt-6">
            <ContentTab tenantId={active.id} />
          </TabsContent>
          <TabsContent value="channels" className="mt-6">
            <ChannelsTab tenantId={active.id} />
          </TabsContent>
          <TabsContent value="plans" className="mt-6">
            <PlansTab tenantId={active.id} />
          </TabsContent>
          <TabsContent value="distribute" className="mt-6">
            <AppConverter tenantId={active.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function BrandingTab({ tenant, onSaved }: { tenant: Tenant; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(tenant.name);
  const [primary, setPrimary] = useState(tenant.primary_color);
  const [accent, setAccent] = useState(tenant.accent_color);
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url ?? "");
  const [iconUrl, setIconUrl] = useState(tenant.icon_url ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primary);
    document.documentElement.style.setProperty("--accent", primary);
    document.documentElement.style.setProperty("--ring", primary);
  }, [primary]);

  const onAssetUpload = async (file: File, kind: "logo" | "icon", setter: (s: string) => void) => {
    const path = `${tenant.id}/${kind}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    setter(data.publicUrl);
  };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("tenants")
      .update({ name, primary_color: primary, accent_color: accent, logo_url: logoUrl || null, icon_url: iconUrl || null })
      .eq("id", tenant.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Branding saved");
    await onSaved();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <Field label="Brand name" value={name} onChange={setName} />
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Primary" value={primary} onChange={setPrimary} />
          <ColorField label="Accent" value={accent} onChange={setAccent} />
        </div>
        <div>
          <span className="text-sm font-medium text-muted-foreground">Logo (wide, used in header)</span>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-4 hover:border-primary">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">{logoUrl ? "Replace logo" : "Upload logo"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAssetUpload(e.target.files[0], "logo", setLogoUrl)} />
          </label>
          {logoUrl && <img src={logoUrl} alt="" className="mt-2 h-12 rounded bg-surface p-1" />}
        </div>
        <div>
          <span className="text-sm font-medium text-muted-foreground">Icon (square, used as favicon / app icon)</span>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-4 hover:border-primary">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">{iconUrl ? "Replace icon" : "Upload icon"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAssetUpload(e.target.files[0], "icon", setIconUrl)} />
          </label>
          {iconUrl && <img src={iconUrl} alt="" className="mt-2 h-12 w-12 rounded bg-surface p-1 object-contain" />}
        </div>
        <button disabled={busy} onClick={save} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Saving…" : "Save branding"}
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Live preview</h3>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between bg-background px-5 py-3">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              {logoUrl ? <img src={logoUrl} className="h-6" /> : <span>{name || "Brand"}</span>}
            </div>
            <button className="rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: primary, color: "#fff" }}>Subscribe</button>
          </div>
          <div className="relative aspect-video">
            <img src="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h2 className="font-display text-3xl font-bold text-white">Featured Show</h2>
              <button className="mt-3 rounded-lg px-5 py-2 font-semibold" style={{ background: primary, color: "#fff" }}>▶ Play</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentTab({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<Content[]>([]);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("content").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setItems((data as Content[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [tenantId]);

  const remove = async (id: string) => {
    if (!confirm("Delete this title?")) return;
    const { error } = await supabase.from("content").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-muted-foreground">{items.length} title{items.length !== 1 && "s"}</p>
        <div className="flex items-center gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-semibold">
                <Upload className="h-4 w-4" /> Upload video
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Upload a video</DialogTitle></DialogHeader>
              <MuxUploader tenantId={tenantId} onDone={() => { setUploadOpen(false); load(); }} />
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> Add title
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto bg-card">
              <DialogHeader><DialogTitle>Add new title</DialogTitle></DialogHeader>
              <ContentForm tenantId={tenantId} onSaved={() => { setOpen(false); load(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {loading && <p className="text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No titles yet. Add your first one.
          </p>
        )}
        {items.map((c) => (
          <div key={c.id} className="group overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[2/3] bg-black flex items-center justify-center p-2">
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
              )}
              {c.is_trending && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  <Star className="h-3 w-3 fill-current" /> Trending
                </span>
              )}
              {c.mux_status && c.mux_status !== "none" && c.mux_status !== "ready" && (
                <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white capitalize">
                  {c.mux_status}
                </span>
              )}
            </div>
            <div className="p-3">
              <h4 className="truncate font-semibold">{c.title}</h4>
              <p className="text-xs text-muted-foreground">{c.category}</p>
              <button onClick={() => remove(c.id)} className="mt-2 text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentForm({ tenantId, onSaved }: { tenantId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [hlsUrl, setHlsUrl] = useState("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [trending, setTrending] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File, bucket: string, setter: (s: string) => void) => {
    const path = `${tenantId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setter(data.publicUrl);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("content").insert({
      tenant_id: tenantId, title, description, category,
      hls_url: hlsUrl || null, thumbnail_url: thumbnailUrl || null,
      hero_url: heroUrl || thumbnailUrl || null, is_trending: trending,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Title added");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" value={title} onChange={setTitle} required />
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
      </label>
      <Field label="Category" value={category} onChange={setCategory} />
      <Field label="HLS stream URL (.m3u8)" value={hlsUrl} onChange={setHlsUrl} placeholder="https://…/playlist.m3u8" />
      <UploadField label="Thumbnail (poster, 2:3)" url={thumbnailUrl} onPick={(f) => upload(f, "content-thumbnails", setThumbnailUrl)} />
      <UploadField label="Hero image (16:9, optional)" url={heroUrl} onPick={(f) => upload(f, "content-thumbnails", setHeroUrl)} />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="h-4 w-4 rounded border-border bg-background" />
        <span className="text-sm">Mark as trending</span>
      </label>
      <button disabled={busy} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? "Saving…" : "Add title"}
      </button>
    </form>
  );
}

function PlansTab({ tenantId }: { tenantId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("9.99");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").eq("tenant_id", tenantId).order("created_at");
    setPlans((data as Plan[]) ?? []);
  };
  useEffect(() => { load(); }, [tenantId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !priceDollars) return;
    setBusy(true);
    const { error } = await supabase.from("plans").insert({
      tenant_id: tenantId,
      name,
      description: description || null,
      price_cents: Math.round(parseFloat(priceDollars) * 100),
      interval,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Plan created");
    setName(""); setDescription(""); setPriceDollars("9.99");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleActive = async (plan: Plan) => {
    await supabase.from("plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
    load();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
      <form onSubmit={create} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">New plan</h3>
        <Field label="Name" value={name} onChange={setName} required />
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price ($)" value={priceDollars} onChange={setPriceDollars} required />
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Interval</span>
            <select value={interval} onChange={(e) => setInterval(e.target.value as "month" | "year")}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary">
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>
        </div>
        <button disabled={busy} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Creating…" : "Create plan"}
        </button>
      </form>

      <div className="space-y-3">
        {plans.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No plans yet. Create one to start charging subscribers.
          </p>
        )}
        {plans.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
            <div>
              <h4 className="font-semibold">{p.name}</h4>
              <p className="text-sm text-muted-foreground">
                ${(p.price_cents / 100).toFixed(2)}/{p.interval}
                {p.description && ` — ${p.description}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${p.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {p.is_active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ScheduleRow {
  id: string;
  channel_id: string;
  content_id: string;
  start_time: string;
  end_time: string;
  content: { id: string; title: string; thumbnail_url: string | null } | null;
}

function ChannelsTab({ tenantId }: { tenantId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("channels").select("*").eq("tenant_id", tenantId);
    const list = (data as Channel[]) ?? [];
    setChannels(list);
    if (!selectedId && list[0]) setSelectedId(list[0].id);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  const uploadLogo = async (file: File) => {
    const path = `${tenantId}/channel-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("channels").insert({ tenant_id: tenantId, name, description: desc, logo_url: logoUrl || null });
    if (error) return toast.error(error.message);
    toast.success("Channel created");
    setName(""); setDesc(""); setLogoUrl(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete channel and its schedule?")) return;
    await supabase.from("channel_schedule").delete().eq("channel_id", id);
    await supabase.from("channels").delete().eq("id", id);
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <form onSubmit={create} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold">New FAST channel</h3>
          <Field label="Name" value={name} onChange={setName} required />
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Description</span>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
          </label>
          <div>
            <span className="text-sm font-medium text-muted-foreground">Channel logo</span>
            <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3 hover:border-primary">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{logoUrl ? "Replace logo" : "Upload logo"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
            {logoUrl && <img src={logoUrl} alt="" className="mt-2 h-10 w-10 rounded bg-surface p-1 object-contain" />}
          </div>
          <button className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">Create channel</button>
        </form>
        <div className="space-y-3">
          {channels.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No channels yet.</p>
          )}
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full rounded-xl border bg-card p-5 text-left transition ${selectedId === c.id ? "border-primary" : "border-border hover:border-muted-foreground"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{c.name}</h4>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); remove(c.id); } }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && <ScheduleManager tenantId={tenantId} channel={selected} />}
    </div>
  );
}

function ScheduleManager({ tenantId, channel }: { tenantId: string; channel: Channel }) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [library, setLibrary] = useState<Content[]>([]);
  const [contentId, setContentId] = useState("");
  const [start, setStart] = useState(() => toLocalInput(new Date()));
  const [end, setEnd] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: sched }, { data: lib }] = await Promise.all([
      supabase
        .from("channel_schedule")
        .select("id, channel_id, content_id, start_time, end_time, content(id, title, thumbnail_url)")
        .eq("channel_id", channel.id)
        .order("start_time", { ascending: true }),
      supabase.from("content").select("*").eq("tenant_id", tenantId).order("title"),
    ]);
    setRows((sched as unknown as ScheduleRow[]) ?? []);
    setLibrary((lib as Content[]) ?? []);
    if (lib && lib[0] && !contentId) setContentId(lib[0].id);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [channel.id, tenantId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentId) return toast.error("Pick a title");
    setBusy(true);
    const { error } = await supabase.from("channel_schedule").insert({
      channel_id: channel.id,
      content_id: contentId,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Scheduled");
    load();
  };

  const playNow = async () => {
    if (!contentId) return toast.error("Pick a title");
    const now = new Date();
    const later = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("channel_schedule").insert({
      channel_id: channel.id,
      content_id: contentId,
      start_time: now.toISOString(),
      end_time: later.toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Now playing on " + channel.name);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("channel_schedule").delete().eq("id", id);
    load();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6">
      <div className="mb-5">
        <h3 className="font-display text-xl md:text-2xl font-bold">Schedule — {channel.name}</h3>
        <p className="text-sm text-muted-foreground">Tag content to airings. Overlapping times will both appear; the most recent overlapping entry wins on the Live page.</p>
      </div>

      <form onSubmit={add} className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_auto_auto]">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</span>
          <select value={contentId} onChange={(e) => setContentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-primary">
            {library.length === 0 && <option value="">No content yet</option>}
            {library.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Start</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">End</span>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-primary" />
        </label>
        <button disabled={busy} className="self-end rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "…" : "Add airing"}
        </button>
        <button type="button" onClick={playNow} className="self-end rounded-lg border border-primary px-4 py-2 font-semibold text-primary">
          Play now (24h)
        </button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No airings scheduled.</td></tr>
            )}
            {rows.map((r) => {
              const live = new Date(r.start_time) <= new Date() && new Date(r.end_time) >= new Date();
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {live && <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />}
                      {r.content?.title ?? "(deleted)"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.start_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.end_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ label, type = "text", value, onChange, required, placeholder }:
  { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input type={type} required={required} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded bg-transparent" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent font-mono text-sm outline-none" />
      </div>
    </label>
  );
}

function UploadField({ label, url, onPick }: { label: string; url: string; onPick: (f: File) => void }) {
  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3 hover:border-primary">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{url ? "Replace" : "Upload"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
        {url && <img src={url} alt="" className="ml-auto h-10 rounded" />}
      </label>
    </div>
  );
}
