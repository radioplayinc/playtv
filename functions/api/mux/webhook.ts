import { createClient } from "@supabase/supabase-js";

export const onRequestPost: PagesFunction<{
  MUX_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async (context) => {
  const { env, request } = context;
  const body = await request.text();
  const sig = request.headers.get("mux-signature") ?? "";

  // Verify Mux signature manually (HMAC-SHA256)
  const [tPart, v1Part] = sig.split(",");
  const timestamp = tPart?.replace("t=", "");
  const v1 = v1Part?.replace("v1=", "");
  if (!timestamp || !v1) return new Response("bad signature", { status: 401 });

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.MUX_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected !== v1) return new Response("bad signature", { status: 401 });

  const evt = JSON.parse(body) as { type: string; data: any };
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  if (evt.type === "video.asset.ready") {
    const asset = evt.data;
    const playbackId = asset.playback_ids?.[0]?.id;
    if (playbackId && asset.upload_id) {
      await db.from("content").update({
        mux_asset_id: asset.id, mux_playback_id: playbackId, mux_status: "ready",
        hls_url: `https://stream.mux.com/${playbackId}.m3u8`,
        thumbnail_url: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640`,
        hero_url: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1920&time=5`,
        duration_seconds: Math.round(asset.duration ?? 0), playable: true,
      }).eq("mux_upload_id", asset.upload_id);
    }
  }

  if (evt.type === "video.asset.errored") {
    await db.from("content").update({ mux_status: "errored" }).eq("mux_upload_id", evt.data.upload_id);
  }

  return new Response("ok", { status: 200 });
};
