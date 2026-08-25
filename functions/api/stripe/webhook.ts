import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const onRequestPost: PagesFunction<{
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async (context) => {
  const { env, request } = context;
  const s = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const upsert = (row: Record<string, unknown>) =>
    db.from("subscriptions").upsert(row, { onConflict: "user_id,tenant_id" });

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    const m = cs.metadata ?? {};
    await upsert({
      user_id: m.user_id, tenant_id: m.tenant_id, plan_id: m.plan_id,
      stripe_customer_id: cs.customer as string,
      stripe_subscription_id: cs.subscription as string,
      status: "active", updated_at: new Date().toISOString(),
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : (sub.status as string);
    await db.from("subscriptions").update({
      status, current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", sub.id);
  }

  return new Response("ok", { status: 200 });
};
