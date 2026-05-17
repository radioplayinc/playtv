import { useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { generateAppPackages } from "@/api/appgen.functions";
import { toast } from "sonner";
import { Tv, Smartphone, Apple, Monitor, Cast, Download } from "lucide-react";

const PLATFORMS = [
  { id: "roku", label: "Roku", icon: Tv },
  { id: "tvos", label: "Apple TV", icon: Apple },
  { id: "androidtv", label: "Android TV / Fire TV", icon: Cast },
  { id: "reactnative", label: "iOS & Android", icon: Smartphone },
  { id: "tizen", label: "Samsung TV", icon: Monitor },
] as const;

export function AppConverter({ tenantId }: { tenantId: string }) {
  const [sel, setSel] = useState<string[]>(["roku"]);
  const [busy, setBusy] = useState(false);
  const [walk, setWalk] = useState<{ platform: string; steps: string[] }[]>([]);

  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const generate = async () => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await generateAppPackages({
        data: { token: session!.access_token, tenantId, platforms: sel as any },
      });
      if (!res.ok) throw new Error(res.error);
      const zip = new JSZip();
      for (const r of res.results) {
        const folder = zip.folder(r.platform)!;
        for (const f of r.files) folder.file(f.path, f.contents);
        folder.file("SUBMISSION_WALKTHROUGH.md",
          `# ${r.platform} submission\n\n` + r.walkthrough.map((s, i) => `${i + 1}. ${s}`).join("\n"));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "app-packages.zip";
      a.click();
      setWalk(res.results.map((r) => ({ platform: r.platform, steps: r.walkthrough })));
      toast.success("Packages generated");
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">App Code Converter</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the platforms you want to publish on. We'll generate app scaffolds and step-by-step store submission guides.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const on = sel.includes(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition ${on ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
              <p.icon className="h-7 w-7" />
              <span className="text-sm font-semibold">{p.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={generate} disabled={busy || sel.length === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60">
        <Download className="h-4 w-4" />
        {busy ? "Generating…" : `Generate ${sel.length} app package(s)`}
      </button>
      {walk.map((w) => (
        <div key={w.platform} className="rounded-xl border border-border bg-card p-5">
          <h4 className="font-display text-lg font-bold capitalize">{w.platform} — how to publish</h4>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {w.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      ))}
    </div>
  );
}
