import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

async function authSuperAdmin(token: string | undefined): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!token) return { ok: false, error: "Not signed in" };
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return { ok: false, error: "Server misconfigured" };
  const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user?.id) return { ok: false, error: "Invalid session" };
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", data.user.id).eq("role", "super_admin").maybeSingle();
  if (!role) return { ok: false, error: "Forbidden: super_admin only" };
  return { ok: true, userId: data.user.id };
}

interface ProbeRow { id: string; hls_url: string | null; mp4_url: string | null; referer: string | null; user_agent: string | null }

async function probeOne(row: ProbeRow): Promise<{ playable: boolean; error: string | null }> {
  const url = row.hls_url ?? row.mp4_url;
  if (!url) return { playable: false, error: "No URL" };
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { playable: false, error: "Invalid URL" }; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { playable: false, error: "Bad protocol" };

  const headers: Record<string, string> = {
    "User-Agent": row.user_agent ?? DEFAULT_UA,
    Accept: "*/*",
    Referer: row.referer ?? `${parsed.protocol}//${parsed.host}/`,
  };
  if (row.referer) {
    try { headers["Origin"] = new URL(row.referer).origin; } catch { /* ignore */ }
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { playable: false, error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    const isManifestPath = /\.m3u8(\?|$)/i.test(parsed.pathname + parsed.search);
    if (isManifestPath || /mpegurl|m3u8/i.test(ct)) {
      const text = (await res.text()).slice(0, 4096);
      if (!/^\s*#EXTM3U/i.test(text)) return { playable: false, error: "Not a valid HLS manifest" };
      return { playable: true, error: null };
    }
    if (/text\/html/i.test(ct)) return { playable: false, error: "Returned HTML page" };
    return { playable: true, error: null };
  } catch (e: unknown) {
    return { playable: false, error: e instanceof Error ? e.message.slice(0, 200) : "fetch failed" };
  }
}

export const probeContentPlayability = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1), limit: z.number().int().min(1).max(2000).optional() }).parse(d))
  .handler(async ({ data }) => {
    const auth = await authSuperAdmin(data.token);
    if (!auth.ok) return { ok: false as const, error: auth.error };

    const limit = data.limit ?? 500;
    const { data: rows, error } = await supabaseAdmin
      .from("content")
      .select("id, hls_url, mp4_url, referer, user_agent")
      .or("hls_url.not.is.null,mp4_url.not.is.null")
      .order("last_check_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) return { ok: false as const, error: error.message };

    const checkedAt = new Date().toISOString();
    let playable = 0;
    let dead = 0;

    const CONCURRENCY = 8;
    const queue = [...(rows ?? [])] as ProbeRow[];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) break;
        const result = await probeOne(row);
        if (result.playable) playable++;
        else dead++;
        await supabaseAdmin
          .from("content")
          .update({
            playable: result.playable,
            last_check_at: checkedAt,
            last_check_error: result.error,
          })
          .eq("id", row.id);
      }
    });
    await Promise.all(workers);

    return { ok: true as const, scanned: rows?.length ?? 0, playable, dead };
  });
