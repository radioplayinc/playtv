import { createClient } from "@supabase/supabase-js";

function b64url(s: string) {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function streamUrl(origin: string, row: any): string {
  const raw = row.hls_url ?? row.mp4_url;
  if (!raw) return "";
  const qs = new URLSearchParams();
  if (row.user_agent) qs.set("ua", row.user_agent);
  if (row.referer) qs.set("ref", row.referer);
  const q = qs.toString();
  return `${origin}/api/public/hls/${b64url(raw)}${q ? `?${q}` : ""}`;
}

export const onRequestGet: PagesFunction<{
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async (context) => {
  const { env, request } = context;
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const u = new URL(request.url);
  const origin = u.origin;
  const tenantSlug = u.searchParams.get("tenant") ?? "default";

  const { data: tenant } = await db.from("tenants").select("*").eq("slug", tenantSlug).maybeSingle();
  if (!tenant) return new Response(JSON.stringify({ error: "unknown tenant" }), { status: 404, headers: { "Content-Type": "application/json" } });

  const { data: rows } = await db.from("content").select("*").eq("tenant_id", tenant.id).eq("roku_enabled", true).order("created_at", { ascending: false });
  const now = new Date().toISOString();
  const movies: any[] = [], shorts: any[] = [], liveFeeds: any[] = [];

  for (const r of rows ?? []) {
    const url = streamUrl(origin, r);
    if (!url) continue;
    const base = {
      id: r.id, title: r.title,
      shortDescription: (r.short_description ?? r.description ?? r.title).slice(0, 200),
      longDescription: (r.description ?? r.title).slice(0, 500),
      thumbnail: r.thumbnail_url ?? r.hero_url ?? "",
      releaseDate: `${r.release_year ?? new Date(r.created_at).getFullYear()}-01-01`,
      genres: [r.category ?? "entertainment"], tags: r.is_trending ? ["trending"] : [],
      content: { dateAdded: new Date(r.created_at).toISOString(), videos: [{ url, quality: "HD", videoType: r.hls_url ? "HLS" : "MP4" }], duration: r.duration_seconds ?? 0, language: "en", adBreaks: ["0"] },
    };
    if (r.content_kind === "live") liveFeeds.push({ id: r.id, title: r.title, content: base.content, thumbnail: r.thumbnail_url ?? "", shortDescription: base.shortDescription, branding: { logo: tenant.logo_url ?? "" } });
    else if (r.content_kind === "short") shorts.push({ ...base, rating: { rating: r.rating ?? "NR", ratingSource: "USA_PR" } });
    else movies.push({ ...base, rating: { rating: r.rating ?? "NR", ratingSource: "USA_PR" } });
  }

  return new Response(JSON.stringify({ providerName: tenant.name, lastUpdated: now, language: "en", movies, shortFormVideos: shorts, liveFeeds }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900", "Access-Control-Allow-Origin": "*" },
  });
};
