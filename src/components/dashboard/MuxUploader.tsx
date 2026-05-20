import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createMuxUpload } from "@/api/mux.functions";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

export function MuxUploader({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  const upload = async () => {
    if (!file || !title) return toast.error("Title and file required");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await createMuxUpload({ data: { token, tenantId, title } });
      if (!res.ok) throw new Error(res.error);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (!res.uploadUrl) throw new Error("No upload URL returned"); xhr.open("PUT", res.uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });
      toast.success("Uploaded. Mux is transcoding — it'll appear shortly.");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setBusy(false); setPct(0); }
  };

  return (
    <div className="space-y-4">
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2" />
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
      {busy && (
        <div className="h-2 w-full overflow-hidden rounded bg-surface">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <button onClick={upload} disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? `Uploading ${pct}%` : "Upload video"}
      </button>
    </div>
  );
}
