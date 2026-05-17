import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Film as FilmIcon, Users as UsersIcon, UserCog, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { assignTenantAdmin, listTenantAdmins, removeTenantAdmin } from "@/api/admin.functions";
import { backfillContentCountries } from "@/api/geo.functions";
import { probeContentPlayability } from "@/api/playability.functions";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminTenants });

interface TenantRow {
  id: string; slug: string; name: string; logo_url: string | null;
  primary_color: string; accent_color: string;
}

function AdminTenants() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [counts, setCounts] = useState<Record<string, { content: number; users: number }>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [adminsFor, setAdminsFor] = useState<TenantRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    setTenants((data as TenantRow[]) ?? []);
    if (data) {
      const c: Record<string, { content: number; users: number }> = {};
      await Promise.all(
        data.map(async (t) => {
          const [{ count: cc }, { count: uc }] = await Promise.all([
            supabase.from("content").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          ]);
          c[t.id] = { content: cc ?? 0, users: uc ?? 0 };
        })
      );
      setCounts(c);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Delete tenant and all its content? This cannot be undone.")) return;
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tenant deleted");
    load();
  };

  const totalContent = Object.values(counts).reduce((a, b) => a + b.content, 0);
  const totalUsers = Object.values(counts).reduce((a, b) => a + b.users, 0);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Tenants</h1>
          <p className="mt-1 text-muted-foreground">Manage all branded streaming services on the platform.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <BackfillCountriesButton />
          <ProbePlayabilityButton />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> New tenant
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Create tenant</DialogTitle></DialogHeader>
              <CreateTenantForm onCreated={() => { setOpen(false); load(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6 md:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Stat icon={Building2} label="Tenants" value={tenants.length} />
        <Stat icon={FilmIcon} label="Total titles" value={totalContent} />
        <Stat icon={UsersIcon} label="Total users" value={totalUsers} />
      </div>

      <div className="mt-6 md:mt-8 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px]">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Tenant</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Branding</th>
              <th className="px-5 py-3">Titles</th>
              <th className="px-5 py-3">Users</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="px-5 py-8 text-muted-foreground" colSpan={6}>Loading…</td></tr>}
            {!loading && tenants.length === 0 && (
              <tr><td className="px-5 py-8 text-muted-foreground" colSpan={6}>No tenants yet. Create your first one.</td></tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded font-bold text-primary-foreground" style={{ background: t.primary_color }}>
                        {t.name[0]}
                      </div>
                    )}
                    <span className="font-semibold">{t.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-muted-foreground">{t.slug}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <span className="h-5 w-5 rounded border border-border" style={{ background: t.primary_color }} />
                    <span className="h-5 w-5 rounded border border-border" style={{ background: t.accent_color }} />
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{counts[t.id]?.content ?? 0}</td>
                <td className="px-5 py-4 text-muted-foreground">{counts[t.id]?.users ?? 0}</td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => setAdminsFor(t)} className="mr-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <UserCog className="h-4 w-4" /> Admins
                  </button>
                  <a href={`/app?tenant=${t.slug}`} className="mr-3 text-sm text-primary hover:underline">Visit</a>
                  <button onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!adminsFor} onOpenChange={(o) => !o && setAdminsFor(null)}>
        <DialogContent className="bg-card">
          <DialogHeader><DialogTitle>Admins for {adminsFor?.name}</DialogTitle></DialogHeader>
          {adminsFor && <ManageAdmins tenant={adminsFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BackfillCountriesButton() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm("Tag all imported streams with their broadcast countries?")) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await backfillContentCountries({ data: { token } });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Tagged ${res.updated}/${res.matched} streams (${res.global} global)`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy}
      className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
      {busy ? "Tagging…" : "Tag stream regions"}
    </button>
  );
}

function ProbePlayabilityButton() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm("Check up to 500 streams for playability?")) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await probeContentPlayability({ data: { token, limit: 500 } });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Probed ${res.scanned}: ${res.playable} playable, ${res.dead} dead`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy}
      className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
      {busy ? "Probing…" : "Check stream health"}
    </button>
  );
}

async function describeError(e: unknown): Promise<string> {
  if (e instanceof Response) {
    try { return (await e.text()) || `HTTP ${e.status}`; } catch { return `HTTP ${e.status}`; }
  }
  if (e instanceof Error) return e.message;
  return "Request failed";
}

function ManageAdmins({ tenant }: { tenant: TenantRow }) {
  const [admins, setAdmins] = useState<Array<{ user_id: string; email: string; display_name: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await listTenantAdmins({ data: { token, tenantId: tenant.id } });
      setAdmins(Array.isArray(res?.admins) ? res.admins : []);
    } catch (e: unknown) {
      setAdmins([]);
      toast.error(await describeError(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenant.id]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const token = await getToken();
      const res = await assignTenantAdmin({ data: { token, tenantId: tenant.id, email } });
      if (!res.ok) { toast.error(res.error); }
      else { toast.success(`Added ${email} as tenant admin`); setEmail(""); load(); }
    } catch (err: unknown) {
      toast.error(await describeError(err));
    } finally { setBusy(false); }
  };

  const onRemove = async (userId: string) => {
    if (!confirm("Remove this tenant admin?")) return;
    try {
      const token = await getToken();
      await removeTenantAdmin({ data: { token, tenantId: tenant.id, userId } });
      toast.success("Admin removed");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No admins assigned yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium">{a.email}</div>
                  {a.display_name && <div className="text-xs text-muted-foreground">{a.display_name}</div>}
                </div>
                <button onClick={() => onRemove(a.user_id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={onAdd} className="flex gap-2">
        <input type="email" required placeholder="admin@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Adding…" : "Add admin"}
        </button>
      </form>
      <p className="text-xs text-muted-foreground">The user must have signed up first.</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function CreateTenantForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primary, setPrimary] = useState("#9cdf2f");
  const [accent, setAccent] = useState("#f7f7f7");
  const [adminEmail, setAdminEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: t, error } = await supabase.from("tenants")
      .insert({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), primary_color: primary, accent_color: accent })
      .select().single();
    if (error || !t) { setBusy(false); return toast.error(error?.message ?? "Failed"); }
    if (adminEmail) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token ?? "";
        const res = await assignTenantAdmin({ data: { token, tenantId: t.id, email: adminEmail } });
        if (res.ok) toast.success("Tenant created and admin assigned");
        else { toast.success("Tenant created"); toast.error(res.error); }
      } catch (err: unknown) {
        toast.success("Tenant created");
        toast.error(err instanceof Error ? err.message : "Could not assign admin");
      }
    } else { toast.success("Tenant created"); }
    setBusy(false);
    onCreated();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" value={name} onChange={setName} required />
      <Field label="Slug (used in URL)" value={slug} onChange={setSlug} placeholder="auto from name" />
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Primary color" value={primary} onChange={setPrimary} />
        <ColorField label="Accent color" value={accent} onChange={setAccent} />
      </div>
      <Field label="Tenant admin email (optional)" type="email" value={adminEmail} onChange={setAdminEmail} placeholder="They must sign up first" />
      <button disabled={busy} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? "Creating…" : "Create tenant"}
      </button>
    </form>
  );
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
