import { createFileRoute } from "@tanstack/react-router";
import Mux from "@mux/mux-node";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/mux/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get("mux-signature") ?? "";

        try {
          const m = new Mux({
            tokenId: process.env.MUX_TOKEN_ID!,
            tokenSecret: process.env.MUX_TOKEN_SECRET!,
            webhookSecret: process.env.MUX_WEBHOOK_SECRET!,
          });
          m.webhooks.verifySignature(body, { "mux-signature": sig });
        } catch {
          return new Response("bad signature", { status: 401 });
        }

        const evt = JSON.parse(body) as {
          type: string;
          data: any;
        };

        if (evt.type === "video.asset.ready") {
          const asset = evt.data;
          const playbackId = asset.playback_ids?.[0]?.id;
          const uploadId = asset.upload_id;
          if (playbackId && uploadId) {
            await supabaseAdmin
              .from("content")
              .update({
                mux_asset_id: asset.id,
                mux_playback_id: playbackId,
                mux_status: "ready",
                hls_url: `https://stream.mux.com/${playbackId}.m3u8`,
                thumbnail_url: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640`,
                hero_url: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1920&time=5`,
                duration_seconds: Math.round(asset.duration ?? 0),
                playable: true,
              })
              .eq("mux_upload_id", uploadId);
          }
        }

        if (evt.type === "video.asset.errored") {
          await supabaseAdmin
            .from("content")
            .update({ mux_status: "errored" })
            .eq("mux_upload_id", evt.data.upload_id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
