import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import playtvLogo from "@/assets/playtv-logo-light.png";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Play TV — Launch your branded streaming service in minutes" },
      { name: "description", content: "Multi-tenant white-label OTT and FAST SaaS. Web, mobile, and TV from one platform." },
    ],
  }),
  component: Landing,
});

interface TenantRow { id: string; slug: string; name: string; logo_url: string | null; primary_color: string }
interface ChannelRow { id: string; tenant_id: string; name: string; logo_url: string | null }

const easeOut = [0.22, 1, 0.36, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: easeOut },
};

const PLATFORMS = ["iOS", "Android", "Apple TV", "Android TV", "Fire TV", "Roku", "Web", "Chromecast"];

function Landing() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: t, error: te }, { data: c, error: ce }] = await Promise.all([
        supabase.from("tenants").select("id, slug, name, logo_url, primary_color").order("name"),
        supabase.from("channels").select("id, tenant_id, name, logo_url").order("name"),
      ]);
      if (!te) setTenants((t as TenantRow[]) ?? []);
      if (!ce) setChannels((c as ChannelRow[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tenantsWithChannels = tenants
    .map((t) => ({ ...t, channels: channels.filter((c) => c.tenant_id === t.id) }))
    .filter((t) => t.slug !== "default");

  const ACCENT = "#9cdf2f";

  return (
    <div
      className="relative min-h-dvh bg-black text-white"
      style={{ fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Vignettes */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-black" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255,255,255,0.04), transparent 60%), radial-gradient(ellipse 80% 60% at 100% 100%, rgba(255,255,255,0.03), transparent 60%)",
          }}
        />
      </div>

      {/* Filmic noise overlay */}
      <svg
        className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.025]"
        style={{ mixBlendMode: "overlay" }}
        aria-hidden
      >
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      <Nav />

      <Hero />

      {/* Platform marquee */}
      <section className="relative overflow-hidden border-y border-white/10 py-10">
        <div className="marquee-pause overflow-hidden">
          <div className="animate-marquee flex w-max gap-16 whitespace-nowrap text-sm uppercase tracking-[0.3em] text-white/40">
            {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <span key={i} className="flex items-center gap-16">
                {p}
                <span className="h-1 w-1 rounded-full bg-white/20" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* One platform / brand row */}
      <section className="relative border-t border-white/10 py-28 md:py-36">
        <motion.div {...reveal} className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="text-xs uppercase tracking-[0.3em] text-white/50">Brand DNA</div>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold -tracking-[0.02em] md:text-6xl">
            One platform. Every brand's look.
          </h2>
        </motion.div>

        <div className="mt-12 overflow-x-auto px-6 md:px-12">
          <div className="flex snap-x snap-mandatory gap-4 pb-4">
            {(tenantsWithChannels.length > 0
              ? tenantsWithChannels.slice(0, 8)
              : Array.from({ length: 6 }).map((_, i) => ({
                  id: `m${i}`,
                  slug: "",
                  name: ["Aurora", "Northwind", "Vantage", "Ember", "Solace", "Atlas"][i] ?? `Brand ${i + 1}`,
                  logo_url: null,
                  primary_color: "#fff",
                  channels: [],
                }))
            ).map((t, i) => {
              const gradients = [
                "from-zinc-700 to-zinc-900",
                "from-neutral-700 to-black",
                "from-stone-700 to-stone-900",
                "from-slate-700 to-slate-950",
                "from-zinc-800 to-neutral-900",
                "from-neutral-800 to-zinc-950",
              ];
              const card = (
                <div className="group relative aspect-[2/3] w-44 shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 md:w-56">
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]} transition-transform duration-500 group-hover:scale-105`}>
                    {("logo_url" in t && t.logo_url) ? (
                      <div className="flex h-full w-full items-center justify-center p-6">
                        <img src={t.logo_url} alt={t.name} className="max-h-full max-w-full object-contain opacity-80" />
                      </div>
                    ) : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <div className="text-sm font-medium text-white">{t.name}</div>
                    {"channels" in t && t.channels.length > 0 && (
                      <div className="text-xs text-white/50">{t.channels.length} channels</div>
                    )}
                  </div>
                </div>
              );
              return t.slug ? (
                <Link key={t.id} to="/app" search={{ tenant: t.slug }}>{card}</Link>
              ) : (
                <div key={t.id}>{card}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative border-t border-white/10 px-6 py-28 md:px-12 md:py-36">
        <motion.div {...reveal} className="mx-auto max-w-7xl">
          <div className="text-xs uppercase tracking-[0.3em] text-white/50">Pricing</div>
          <h2 className="mt-3 text-4xl font-semibold -tracking-[0.02em] md:text-6xl">Simple pricing.</h2>
          <p className="mt-5 max-w-2xl text-white/60">Start free. Scale as you grow. No surprises.</p>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { name: "Starter", price: "$0", desc: "1 tenant, 50 titles, watermark", featured: false, features: ["1 tenant", "50 titles", "Watermarked player"] },
              { name: "Studio", price: "$199", suffix: "/mo", desc: "5 tenants, unlimited titles, FAST channels", featured: true, features: ["5 tenants", "Unlimited titles", "FAST channels", "Custom domains"] },
              { name: "Enterprise", price: "Custom", desc: "Unlimited tenants, native apps, SSO", featured: false, features: ["Unlimited tenants", "Native TV apps", "SSO + SAML", "Priority support"] },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border bg-black p-8 ${
                  p.featured
                    ? "border-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                    : "border-white/10"
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-8 rounded-full border border-white/20 bg-black px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                    Most popular
                  </div>
                )}
                <div className="text-sm uppercase tracking-[0.2em] text-white/50">{p.name}</div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold -tracking-[0.02em]">{p.price}</span>
                  {p.suffix && <span className="text-base text-white/50">{p.suffix}</span>}
                </div>
                <p className="mt-3 text-sm text-white/60">{p.desc}</p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                      <Check className="h-4 w-4 text-white/70" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 px-4 py-3 text-sm text-white/40"
                >
                  coming soon
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-10 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <img src={playtvLogo} alt="Play TV" className="h-20 w-auto" />
          <div className="flex gap-8 text-sm text-white/50">
            <a href="#" className="transition-colors hover:text-white">Terms</a>
            <a href="#" className="transition-colors hover:text-white">Privacy</a>
            <a href="#" className="transition-colors hover:text-white">Contact</a>
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-7xl text-xs text-white/30">
          © {new Date().getFullYear()} Play TV. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
