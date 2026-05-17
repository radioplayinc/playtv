import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { applyGeoFilter, useEffectiveCountry, useGeo } from "@/contexts/GeoContext";
import { Row } from "./index";

export const Route = createFileRoute("/app/search")({ component: SearchPage });

function SearchPage() {
  const { tenant } = useTenant();
  const country = useEffectiveCountry();
  const { showAll } = useGeo();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!tenant) return;
    const t = setTimeout(async () => {
      let query = supabase.from("content").select("*").eq("tenant_id", tenant.id).limit(40);
      if (q) query = query.ilike("title", `%${q}%`);
      query = applyGeoFilter(query, country, showAll);
      const { data } = await query;
      setResults(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q, tenant?.id, country, showAll]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-12 md:py-10">
      <input
        autoFocus
        placeholder="Search titles…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 md:px-5 md:py-4 text-base md:text-lg outline-none focus:border-primary"
      />
      <div className="mt-8 md:mt-10">
        {results.length > 0 ? <Row title={q ? `Results for "${q}"` : "All titles"} items={results} /> :
          <p className="text-muted-foreground">No results.</p>}
      </div>
    </div>
  );
}
