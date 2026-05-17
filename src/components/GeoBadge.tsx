import { useState } from "react";
import { useGeo } from "@/contexts/GeoContext";
import { Globe } from "lucide-react";

const COUNTRIES: Array<[string, string]> = [
  ["US", "🇺🇸 United States"],
  ["GB", "🇬🇧 United Kingdom"],
  ["CA", "🇨🇦 Canada"],
  ["DE", "🇩🇪 Germany"],
  ["FR", "🇫🇷 France"],
  ["ES", "🇪🇸 Spain"],
  ["IT", "🇮🇹 Italy"],
  ["NL", "🇳🇱 Netherlands"],
  ["BR", "🇧🇷 Brazil"],
  ["MX", "🇲🇽 Mexico"],
  ["AR", "🇦🇷 Argentina"],
  ["AU", "🇦🇺 Australia"],
  ["JP", "🇯🇵 Japan"],
  ["IN", "🇮🇳 India"],
  ["TR", "🇹🇷 Turkey"],
  ["AE", "🇦🇪 United Arab Emirates"],
  ["ZA", "🇿🇦 South Africa"],
];

export function GeoBadge() {
  const { country, override, showAll, setOverride, setShowAll } = useGeo();
  const [open, setOpen] = useState(false);
  const effective = showAll ? null : (override ?? country);
  const label = showAll
    ? "All regions"
    : effective
      ? (COUNTRIES.find(([c]) => c === effective)?.[1] ?? effective)
      : "Global only";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="truncate max-w-[140px]">{label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl">
            <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Region</div>
            <button
              onClick={() => { setOverride(null); setOpen(false); }}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface ${!override ? "text-primary" : ""}`}
            >
              Auto-detect{country ? ` (${country})` : ""}
            </button>
            <div className="my-1 max-h-64 overflow-y-auto">
              {COUNTRIES.map(([c, name]) => (
                <button
                  key={c}
                  onClick={() => { setOverride(c); setOpen(false); }}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface ${override === c ? "text-primary" : ""}`}
                >
                  {name}
                </button>
              ))}
            </div>
            <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-border px-2 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all titles (may not play)
            </label>
          </div>
        </>
      )}
    </div>
  );
}
