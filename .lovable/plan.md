## Diagnosis

I probed the live HLS proxy on production (`playtv.radioplayinc.com`) against three random catalog streams. The proxy is reachable and the route is wired up correctly — but the upstreams it's fetching are returning **error HTML, not manifests**:

| Stream | Worker fetch result | Notes |
|---|---|---|
| `cdn77.org/K19...m3u8` | 403 Forbidden HTML page from CDN77 | Geo/referrer blocked |
| `alkassdigital.net/alkass2...m3u8` | HTML error page | Likely IP/UA blocked |
| `183.207.248.71/gitv/...` (HTTP) | HTML error page | China-only IPTV, blocks foreign IPs |

The proxy then forwards 200 + `content-type: text/html` to HLS.js, which gives up because the body is not a playlist. Net result for the user: spinner forever or "manifest parsing error", no playback.

So none of the textbook causes apply here:
- ✅ Mixed content — fixed (proxy upgrades HTTP to HTTPS for the browser)
- ✅ CORS — fixed (proxy adds `Access-Control-Allow-Origin: *`)
- ❌ **Upstream is blocking the proxy's IP / region / referrer** ← the actual issue
- N/A codec, autoplay, signed URLs

The Cloudflare Worker that runs the proxy egresses from a small set of datacenter IPs (Amsterdam in our test). Most "free" iptv-org streams either:
1. Geo-restrict to a specific country and block Worker/datacenter IPs
2. Require a specific `Referer` / `Origin` / `User-Agent` header
3. Are dead/migrated since iptv-org last indexed them

This matches the user's experience that streams won't play, and it's why the existing `Tag stream regions` / geo filter still shows titles whose backing CDN refuses our Worker.

## Plan

### 1. Add reachability probing
Worker-side script (one-shot + nightly cron) that:
- HEAD/GET each `hls_url` from the Worker
- Mark `content.playable = true/false` and `content.last_check_at`
- Hide unplayable rows from `/app`, `/app/live`, `/app/search` queries (alongside the geo filter)

This solves "the catalog looks full but nothing plays" by only showing what the Worker can actually fetch.

### 2. Forward better request headers in the proxy
Update `src/routes/api/public/hls.$.ts` to:
- Send a real browser User-Agent (current one says `HLSProxy/1.0` — many CDNs block this)
- Forward `Referer` and `Origin` from request, or set a per-content override stored on `content.referer`
- Surface non-manifest text/html responses as `502 Bad Gateway` to the client so the player can show a clear "stream offline" message instead of hanging

### 3. Player-side error UI
In `src/routes/_authenticated/watch.$id.tsx`, attach `hls.on(Hls.Events.ERROR, …)` and `<video>` `onerror` handlers. On fatal manifest/network error, render an overlay: "This channel is currently unavailable. Try another." with a back button. Today the page just sits black.

### 4. (Optional) Curated source list
Free iptv-org indexes are noisy. Offer the operator an admin tool to bulk-import from a known-good provider (e.g. their own origin, a paid M3U URL, or a country-filtered iptv-org subset that has a higher hit rate from EU datacenters), and let them paste in custom `referer` / `user_agent` per channel.

## What I will NOT do
- Reverse-proxy through residential IPs (legally and operationally out of scope)
- Re-encode streams server-side (no Worker codec)
- Touch RLS or auth — unrelated

## Order of work
1. Player error overlay (5 min, immediate UX win)
2. Better proxy headers (10 min, fixes a chunk of CDNs)
3. Reachability probe + `playable` column + filter (1 hr, removes the dead majority)
4. Admin per-channel referer/UA override (later)

## Open questions
1. Confirm you want me to add a `playable` column and **hide** unplayable titles automatically, vs. just dimming them in the UI with an "offline" badge.
2. For the proxy User-Agent: spoof Chrome on macOS by default? Some CDNs block that too — alternative is a generic Roku/AppleTV UA.
3. Do you have a paid/curated M3U source you'd rather we ingest instead of iptv-org?
