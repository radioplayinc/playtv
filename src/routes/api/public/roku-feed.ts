import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

function videoObj(origin: string, row: any) {
  const url = streamUrl(origin, row);
  const isHls = !!row.hls_url;
  return {
    url,
    quality: "HD",
    videoType: isHls ? "HLS" : "MP4",
  };
}

async function buildFeed(origin: string, tenantSlug: string) {
  const { data: tenant } = await supabaseAdmin
    .from("tenants").select("*").eq("slug", tenantSlug).maybeSingle();
  if (!tenant) return null;

  const { data: rows } = await supabaseAdmin
    .from("content")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("roku_enabled", true)
    .or("playable.is.null,playable.eq.true")
    .order("created_at", { ascending: false });

  const now = new Date().toISOString();
  const movies: any[] = [];
  const shorts: any[] = [];
  const liveFeeds: any[] = [];

  for (const r of rows ?? []) {
    if (!streamUrl(origin, r)) continue;
    const base = {
      id: r.id,
      title: r.title,
      shortDescription: (r.short_description ?? r.description ?? r.title).slice(0, 200),
      longDescription: (r.description ?? r.title).slice(0, 500),
      thumbnail: r.thumbnail_url ?? r.hero_url ?? "",
      releaseDate: `${r.release_year ?? new Date(r.created_at).getFullYear()}-01-01`,
      genres: [r.category ?? "entertainment"],
      tags: r.is_trending ? ["trending"] : [],
      content: {
        dateAdded: new Date(r.created_at).toISOString(),
        videos: [videoObj(origin, r)],
        duration: r.duration_seconds ?? 0,
        language: "en",
        adBreaks: ["0"],
      },
    };

    if (r.content_kind === "live") {
      liveFeeds.push({
        id: r.id, title: r.title,
        content: { videos: [videoObj(origin, r)] },
        thumbnail: r.thumbnail_url ?? "",
        shortDescription: base.shortDescription,
        branding: { logo: tenant.logo_url ?? "" },
      });
    } else if (r.content_kind === "short") {
      shorts.push({ ...base, rating: { rating: r.rating ?? "NR", ratingSource: "USA_PR" } });
    } else {
      movies.push({ ...base, rating: { rating: r.rating ?? "NR", ratingSource: "USA_PR" } });
    }
  }

  return {
    providerName: tenant.name,
    lastUpdated: now,
    language: "en",
    movies,
    shortFormVideos: shorts,
    liveFeeds,
  };
}

export const Route = createFileRoute("/api/public/roku-feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const origin = u.origin;
        const tenantSlug = u.searchParams.get("tenant") ?? "default";
        const feed = await buildFeed(origin, tenantSlug);
        if (!feed) {
          return new Response(JSON.stringify({ error: "unknown tenant" }), {
            status: 404, headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(feed), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=900",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
