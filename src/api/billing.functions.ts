import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });
}

async function authUser(token: string | undefined) {
  if (!token) return { ok: false as const, error: "Not signed in" };
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user?.id)
    return { ok: false as const, error: "Invalid session" };
  return { ok: true as const, uid: data.user.id, email: data.user.email ?? undefined };
}

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(1), planId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const auth = await authUser(data.token);
    if (!auth.ok) return { ok: false as const, error: auth.error };

    const { data: plan } = await supabaseAdmin
      .from("plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan) return { ok: false as const, error: "Plan not found" };

    const s = stripe();

    let priceId = plan.stripe_price_id;
    if (!priceId) {
      const product = await s.products.create({ name: plan.name });
      const price = await s.prices.create({
        product: product.id,
        unit_amount: plan.price_cents,
        currency: "usd",
        recurring: { interval: plan.interval as "month" | "year" },
      });
      priceId = price.id;
      await supabaseAdmin.from("plans")
        .update({ stripe_price_id: priceId }).eq("id", plan.id);
    }

    const appUrl = process.env.VITE_APP_URL ?? "http://localhost:3000";
    const sess = await s.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: auth.email,
      success_url: `${appUrl}/app?sub=success`,
      cancel_url: `${appUrl}/app?sub=cancelled`,
      metadata: {
        user_id: auth.uid,
        tenant_id: plan.tenant_id,
        plan_id: plan.id,
      },
    });
    return { ok: true as const, url: sess.url };
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(1), tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const auth = await authUser(data.token);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    const { data: sub } = await supabaseAdmin
      .from("subscriptions").select("stripe_customer_id")
      .eq("user_id", auth.uid).eq("tenant_id", data.tenantId).maybeSingle();
    if (!sub?.stripe_customer_id)
      return { ok: false as const, error: "No billing account yet" };
    const appUrl = process.env.VITE_APP_URL ?? "http://localhost:3000";
    const portal = await stripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/app`,
    });
    return { ok: true as const, url: portal.url };
  });
