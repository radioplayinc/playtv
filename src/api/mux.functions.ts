import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function authTenantAdmin(token: string | undefined, tenantId: string) {
  if (!token) return { ok: false as const, error: "Not signed in" };
  const URL_ = process.env.SUPABASE_URL;
  const KEY_ = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!URL_ || !KEY_) return { ok: false as const, error: "Server misconfigured" };
  const sb = createClient<Database>(URL_, KEY_, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user?.id) return { ok: false as const, error: "Invalid session" };
  const uid = data.user.id;
  const { data: superRole } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", uid).eq("role", "super_admin").maybeSingle();
  if (superRole) return { ok: true as const, uid };
  const { data: taRole } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", uid).eq("tenant_id", tenantId)
    .eq("role", "tenant_admin").maybeSingle();
  if (!taRole) return { ok: false as const, error: "Forbidden" };
  return { ok: true as const, uid };
}

function mux() {
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
  });
}

export const createMuxUpload = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string().min(1),
      tenantId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      contentKind: z.enum(["movie", "short", "episode"]).default("movie"),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const auth = await authTenantAdmin(data.token, data.tenantId);
    if (!auth.ok) return { ok: false as const, error: auth.error };

    const upload = await mux().video.uploads.create({
      cors_origin: process.env.VITE_APP_URL ?? "*",
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "smart",
      },
    });

    const { data: row, error } = await supabaseAdmin
      .from("content")
      .insert({
        tenant_id: data.tenantId,
        title: data.title,
        description: data.description ?? null,
        content_kind: data.contentKind,
        mux_upload_id: upload.id,
        mux_status: "waiting",
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };

    return { ok: true as const, uploadUrl: upload.url, contentId: row.id };
  });
