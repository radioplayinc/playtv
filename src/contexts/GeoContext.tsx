import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface GeoState {
  country: string | null; // ISO alpha-2, e.g. "US"
  override: string | null; // user-selected override
  showAll: boolean; // bypass filter
  setOverride: (c: string | null) => void;
  setShowAll: (v: boolean) => void;
}

const GeoContext = createContext<GeoState | undefined>(undefined);

const KEY_OVERRIDE = "geo.override";
const KEY_SHOW_ALL = "geo.showAll";
const KEY_DETECTED = "geo.detected";
const KEY_DETECTED_AT = "geo.detectedAt";
const TTL = 1000 * 60 * 60 * 24;

export function GeoProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<string | null>(null);
  const [override, setOverrideState] = useState<string | null>(null);
  const [showAll, setShowAllState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOverrideState(localStorage.getItem(KEY_OVERRIDE));
    setShowAllState(localStorage.getItem(KEY_SHOW_ALL) === "1");

    const cached = localStorage.getItem(KEY_DETECTED);
    const at = Number(localStorage.getItem(KEY_DETECTED_AT) || 0);
    if (cached && Date.now() - at < TTL) {
      setCountry(cached === "null" ? null : cached);
      return;
    }
    fetch("/api/public/geo")
      .then((r) => r.json())
      .then((d: { country: string | null }) => {
        setCountry(d.country);
        localStorage.setItem(KEY_DETECTED, d.country ?? "null");
        localStorage.setItem(KEY_DETECTED_AT, String(Date.now()));
      })
      .catch(() => setCountry(null));
  }, []);

  const setOverride = (c: string | null) => {
    setOverrideState(c);
    if (c) localStorage.setItem(KEY_OVERRIDE, c);
    else localStorage.removeItem(KEY_OVERRIDE);
  };
  const setShowAll = (v: boolean) => {
    setShowAllState(v);
    localStorage.setItem(KEY_SHOW_ALL, v ? "1" : "0");
  };

  return (
    <GeoContext.Provider value={{ country, override, showAll, setOverride, setShowAll }}>
      {children}
    </GeoContext.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo must be used within GeoProvider");
  return ctx;
}

/** Effective country to filter by, or null if filtering disabled. */
export function useEffectiveCountry(): string | null {
  const { country, override, showAll } = useGeo();
  if (showAll) return null;
  return override ?? country;
}

/**
 * Apply the geo filter to a Supabase query on the `content` table.
 * Pass the result of useEffectiveCountry().
 * If country is null, only rows with `countries IS NULL` are returned (safe default).
 * Pass `bypass=true` to skip filtering.
 *
 * Also hides streams that have been probed and proven unplayable
 * (`playable = false`). Rows that have never been probed (`playable IS NULL`)
 * are kept visible so newly imported content isn't hidden by default.
 */
export function applyGeoFilter<T extends { or: (s: string) => T; is: (col: string, val: null) => T }>(
  q: T,
  country: string | null,
  bypass: boolean
): T {
  // Always exclude known-dead streams (playable = false), regardless of bypass.
  let next = q.or("playable.is.null,playable.eq.true");
  if (bypass) return next;
  if (country) {
    return next.or(`countries.is.null,countries.cs.{${country}}`);
  }
  return next.is("countries", null);
}

