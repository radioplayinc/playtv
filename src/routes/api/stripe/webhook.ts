import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2025-04-30.basil",
        });
        const sig = request.headers.get("stripe-signature") ?? "";
        const raw = await request.text();

        let event: Stripe.Event;
        try {
          event = await s.webhooks.constructEventAsync(
            raw, sig, process.env.STRIPE_WEBHOOK_SECRET!
          );
        } catch {
          return new Response("bad signature", { status: 400 });
        }

        const upsert = async (row: Record<string, any>) => {
          await supabaseAdmin.from("subscriptions").upsert(row, {
            onConflict: "user_id,tenant_id",
          });
        };

        if (event.type === "checkout.session.completed") {
          const cs = event.data.object as Stripe.Checkout.Session;
          const m = cs.metadata ?? {};
          await upsert({
            user_id: m.user_id,
            tenant_id: m.tenant_id,
            plan_id: m.plan_id,
            stripe_customer_id: cs.customer as string,
            stripe_subscription_id: cs.subscription as string,
            status: "active",
            updated_at: new Date().toISOString(),
          });
        }

        if (
          event.type === "customer.subscription.updated" ||
          event.type === "customer.subscription.deleted"
        ) {
          const sub = event.data.object as Stripe.Subscription;
          const status =
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : (sub.status as string);
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status,
              current_period_end: new Date(
                (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000)
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", sub.id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
