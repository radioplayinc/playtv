import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

async function authSuperAdmin(token: string | undefined): Promise<AuthResult> {
  try {
    if (!token) return { ok: false, error: "Not signed in" };
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return { ok: false, error: "Server misconfigured" };
    }
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return { ok: false, error: "Invalid session" };
    }
    const userId = data.user.id;
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (roleErr) return { ok: false, error: roleErr.message };
    if (!role) return { ok: false, error: "Forbidden: super_admin only" };
    return { ok: true, userId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Auth failed" };
  }
}

async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 25; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return { id: match.id, email: match.email ?? email };
    if (data.users.length < perPage) return null;
    page++;
  }
  return null;
}

export const assignTenantAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1), tenantId: z.string().uuid(), email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const auth = await authSuperAdmin(data.token);
      if (!auth.ok) return { ok: false as const, error: auth.error };
      const user = await findUserByEmail(data.email);
      if (!user) {
        return { ok: false as const, error: "No user with that email. Ask them to sign up first." };
      }
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, tenant_id: data.tenantId, role: "tenant_admin" });
      if (roleErr && !/duplicate|unique/i.test(roleErr.message)) {
        return { ok: false as const, error: roleErr.message };
      }
      const { error: profErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: user.id, tenant_id: data.tenantId }, { onConflict: "id" });
      if (profErr) return { ok: false as const, error: profErr.message };
      return { ok: true as const, userId: user.id, email: user.email };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to assign admin" };
    }
  });

export const removeTenantAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1), tenantId: z.string().uuid(), userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const auth = await authSuperAdmin(data.token);
      if (!auth.ok) return { ok: false as const, error: auth.error };
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("tenant_id", data.tenantId)
        .eq("role", "tenant_admin");
      if (error) return { ok: false as const, error: error.message };
      const { data: remaining } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", data.userId)
        .eq("role", "tenant_admin")
        .limit(1);
      if (!remaining || remaining.length === 0) {
        await supabaseAdmin.from("profiles").update({ tenant_id: null }).eq("id", data.userId);
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const listTenantAdmins = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1), tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const auth = await authSuperAdmin(data.token);
      if (!auth.ok) return { ok: false as const, error: auth.error, admins: [] as Array<{ user_id: string; email: string; display_name: string | null }> };
      const { data: roles, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("tenant_id", data.tenantId)
        .eq("role", "tenant_admin");
      if (error) return { ok: false as const, error: error.message, admins: [] };
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return { ok: true as const, admins: [] };
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      const admins = await Promise.all(
        ids.map(async (id) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
          const profile = profiles?.find((p) => p.id === id);
          return {
            user_id: id,
            email: u?.user?.email ?? "(unknown)",
            display_name: profile?.display_name ?? null,
          };
        })
      );
      return { ok: true as const, admins };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed", admins: [] };
    }
  });

