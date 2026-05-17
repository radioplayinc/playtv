import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}
function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

function proxify(originalUrl: string, query: string): string {
  return `/api/public/hls/${b64urlEncode(originalUrl)}${query}`;
}

function rewriteManifest(text: string, baseUrl: string, passthroughQuery: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(line); continue; }
    if (trimmed.startsWith("#")) {
      line = line.replace(/URI="([^"]+)"/g, (_m, u) => {
        try {
          const abs = new URL(u, baseUrl).toString();
          return `URI="${proxify(abs, passthroughQuery)}"`;
        } catch { return _m; }
      });
      out.push(line);
    } else {
      try {
        const abs = new URL(trimmed, baseUrl).toString();
        out.push(proxify(abs, passthroughQuery));
      } catch {
        out.push(line);
      }
    }
  }
  return out.join("\n");
}

async function handle(request: Request, splat: string): Promise<Response> {
  let upstreamUrl: string;
  try {
    upstreamUrl = b64urlDecode(splat);
  } catch {
    return new Response("Bad URL encoding", { status: 400, headers: CORS });
  }

  let parsed: URL;
  try {
    parsed = new URL(upstreamUrl);
  } catch {
    return new Response("Invalid URL", { status: 400, headers: CORS });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new Response("Unsupported protocol", { status: 400, headers: CORS });
  }
  if (isPrivateHost(parsed.hostname)) {
    return new Response("Forbidden host", { status: 403, headers: CORS });
  }

  // Per-channel overrides passed via query string (?ua=…&ref=…)
  const reqUrl = new URL(request.url);
  const uaOverride = reqUrl.searchParams.get("ua");
  const refOverride = reqUrl.searchParams.get("ref");
  const passthroughQuery = reqUrl.search; // forward to child segments/manifests

  const fwdHeaders: Record<string, string> = {
    "User-Agent": uaOverride || DEFAULT_UA,
    Accept: "*/*",
  };
  if (refOverride) {
    fwdHeaders["Referer"] = refOverride;
    try { fwdHeaders["Origin"] = new URL(refOverride).origin; } catch { /* ignore */ }
  } else {
    // Many CDNs accept requests when Referer matches the upstream origin.
    fwdHeaders["Referer"] = `${parsed.protocol}//${parsed.host}/`;
  }
  const range = request.headers.get("range");
  if (range) fwdHeaders["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: fwdHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e: any) {
    return new Response(`Upstream fetch failed: ${e?.message ?? "error"}`, { status: 502, headers: CORS });
  }

  const ct = upstream.headers.get("content-type") || "";
  const looksLikeManifestPath = /\.m3u8(\?|$)/i.test(parsed.pathname + parsed.search);
  const looksLikeManifestCT = /mpegurl|m3u8/i.test(ct);

  if (!upstream.ok) {
    return new Response(`Upstream error ${upstream.status}`, { status: 502, headers: { ...CORS, "x-upstream-status": String(upstream.status) } });
  }

  // If the URL is supposed to be a manifest but the upstream returned HTML
  // (typical of CDN error/landing pages on geo or referrer block), bail out
  // with a clear 502 so the player can show "stream offline" instead of
  // trying to parse HTML.
  if (looksLikeManifestPath && !looksLikeManifestCT && /text\/html/i.test(ct)) {
    return new Response("Upstream returned HTML, not a manifest (likely geo/IP blocked)", {
      status: 502,
      headers: { ...CORS, "x-upstream-status": String(upstream.status), "x-upstream-content-type": ct },
    });
  }

  const respHeaders: Record<string, string> = { ...CORS };
  for (const h of ["content-length", "content-range", "accept-ranges", "cache-control", "last-modified", "etag"]) {
    const v = upstream.headers.get(h);
    if (v) respHeaders[h] = v;
  }

  if ((looksLikeManifestPath || looksLikeManifestCT)) {
    const text = await upstream.text();
    if (text.length > 2_000_000) {
      return new Response("Manifest too large", { status: 413, headers: CORS });
    }
    // Sanity check the body actually looks like an HLS playlist
    if (!/^\s*#EXTM3U/i.test(text)) {
      return new Response("Upstream did not return a valid HLS manifest", {
        status: 502,
        headers: { ...CORS, "x-upstream-status": String(upstream.status), "x-upstream-content-type": ct },
      });
    }
    const finalUrl = upstream.url || upstreamUrl;
    const rewritten = rewriteManifest(text, finalUrl, passthroughQuery);
    respHeaders["Content-Type"] = "application/vnd.apple.mpegurl";
    delete respHeaders["content-length"];
    return new Response(rewritten, { status: upstream.status, headers: respHeaders });
  }

  if (ct) respHeaders["Content-Type"] = ct;
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

export const Route = createFileRoute("/api/public/hls/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } }),
      GET: async ({ request, params }) => handle(request, (params as { _splat: string })._splat),
    },
  },
});
