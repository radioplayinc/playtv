import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { startCheckout } from "@/api/billing.functions";
import { Lock } from "lucide-react";

interface Plan { id: string; name: string; description: string | null; price_cents: number; interval: string }

export function PaywallGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!user || !tenant) return;
    (async () => {
      const { data } = await supabase.rpc("has_active_subscription", { _tenant_id: tenant.id });
      setEntitled(!!data);
      if (!data) {
        const { data: p } = await supabase.from("plans").select("*").eq("tenant_id", tenant.id).eq("is_active", true);
        setPlans((p as Plan[]) ?? []);
      }
    })();
  }, [user?.id, tenant?.id]);

  const subscribe = async (planId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await startCheckout({ data: { token: session!.access_token, planId } });
    if (res.ok && res.url) window.location.href = res.url;
  };

  if (entitled === null) return null;
  if (entitled) return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h2 className="font-display text-2xl font-bold">Subscribe to watch</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tenant?.name} content is for members.</p>
        <div className="mt-6 space-y-3">
          {plans.map((pl) => (
            <button key={pl.id} onClick={() => subscribe(pl.id)}
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground">
              {pl.name} — ${(pl.price_cents / 100).toFixed(2)}/{pl.interval}
            </button>
          ))}
          {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans configured yet.</p>}
        </div>
      </div>
    </div>
  );
}
