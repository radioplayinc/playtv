import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// region code → list of ISO alpha-2 country codes (subset)
const REGIONS: Record<string, string[]> = {
  EUR: ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","NO","CH","GB","UA","RS","BA","AL","MK","ME","XK","MD","BY","RU","TR"],
  AMER: ["US","CA","MX","BR","AR","CL","CO","PE","VE","EC","BO","UY","PY","GT","CR","PA","DO","CU","HN","SV","NI","PR","JM","TT","HT"],
  NOAM: ["US","CA","MX"],
  SOAM: ["BR","AR","CL","CO","PE","VE","EC","BO","UY","PY"],
  CSUR: ["AR","BO","BR","CL","CO","EC","PY","PE","UY","VE"],
  CARIB: ["CU","DO","HT","JM","TT","PR","BS"],
  APAC: ["AU","NZ","JP","KR","CN","HK","TW","SG","MY","ID","PH","TH","VN","IN","PK","BD","LK"],
  ASIA: ["JP","KR","CN","HK","TW","SG","MY","ID","PH","TH","VN","IN","PK","BD","LK","KZ","UZ","TM","MN","NP","MM","KH","LA"],
  MENA: ["DZ","BH","EG","IR","IQ","JO","KW","LB","LY","MA","OM","PS","QA","SA","SY","TN","AE","YE"],
  AFR: ["DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CD","CG","CI","DJ","EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"],
  OCE: ["AU","NZ","FJ","PG","SB","VU","WS","TO","NC","PF"],
  EUR1: ["DE","FR","GB","IT","ES","NL","BE","CH","AT"],
};

function expandBroadcastArea(codes: string[]): string[] | null {
  // codes look like "c/US", "r/EUR", "s/INT"
  const out = new Set<string>();
  let global = false;
  for (const raw of codes) {
    const [kind, code] = raw.split("/");
    if (!code) continue;
    if (kind === "s") {
      // s/INT = international = global
      if (code.toUpperCase() === "INT") { global = true; }
      continue;
    }
    if (kind === "c") {
      out.add(code.toUpperCase());
    } else if (kind === "r") {
      const list = REGIONS[code.toUpperCase()];
      if (list) list.forEach((c) => out.add(c));
      else global = true; // unknown region → don't filter aggressively
    }
  }
  if (global) return null;
  return out.size > 0 ? Array.from(out) : null;
}

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

interface IptvStream { channel: string | null; url: string }
interface IptvChannel { id: string; broadcast_area: string[] }

export const backfillContentCountries = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const auth = await authSuperAdmin(data.token);
    if (!auth.ok) return { ok: false as const, error: auth.error };

    try {
      const [streamsRes, channelsRes] = await Promise.all([
        fetch("https://iptv-org.github.io/api/streams.json", { signal: AbortSignal.timeout(30_000) }),
        fetch("https://iptv-org.github.io/api/channels.json", { signal: AbortSignal.timeout(30_000) }),
      ]);
      if (!streamsRes.ok || !channelsRes.ok) {
        return { ok: false as const, error: "Failed to fetch IPTV-org metadata" };
      }
      const streams = (await streamsRes.json()) as IptvStream[];
      const channels = (await channelsRes.json()) as IptvChannel[];

      const channelById = new Map(channels.map((c) => [c.id, c]));
      const channelByUrl = new Map<string, string | null>();
      for (const s of streams) channelByUrl.set(s.url, s.channel);

      const { data: rows, error } = await supabaseAdmin
        .from("content").select("id, hls_url").not("hls_url", "is", null);
      if (error) return { ok: false as const, error: error.message };

      let matched = 0;
      let updated = 0;
      let global = 0;
      for (const row of rows ?? []) {
        const url = row.hls_url!;
        const channelId = channelByUrl.get(url);
        if (!channelId) continue;
        matched++;
        const ch = channelById.get(channelId);
        if (!ch) continue;
        const countries = expandBroadcastArea(ch.broadcast_area ?? []);
        if (countries === null) global++;
        const { error: upErr } = await supabaseAdmin
          .from("content").update({ countries }).eq("id", row.id);
        if (!upErr) updated++;
      }

      return {
        ok: true as const,
        scanned: rows?.length ?? 0,
        matched,
        updated,
        global,
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed" };
    }
  });
