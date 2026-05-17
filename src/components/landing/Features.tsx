import { Layers, Palette, Tv, Radio } from 'lucide-react';

export function Features() {
  return (
    <section id="features" className="bg-black py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Features</p>
        <h2 className="mt-4 text-4xl md:text-6xl font-semibold -tracking-[0.02em] text-white max-w-3xl">
          Everything your streaming brand needs.
        </h2>
        <p className="mt-4 text-white/60 text-lg max-w-2xl">
          A platform built for operators, not engineers. Spin up a tenant, upload titles, go live.
        </p>

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          <Card icon={<Layers className="size-5" />} title="Multi-tenant" desc="Unlimited tenants from one dashboard. Bulletproof data isolation." />
          <Card icon={<Palette className="size-5" />} title="White-label branding" desc="Logo, colors, and domain per tenant. Live preview as you edit." />
          <Card icon={<Radio className="size-5" />} title="VOD + FAST channels" desc="On-demand library and 24/7 linear channels with simple scheduling." />
          <Card
            icon={<Tv className="size-5" />}
            title="Built for TV"
            desc="Native iOS, Android, Apple TV, Android TV, and Fire TV from one codebase."
            span={2}
          />
        </div>
      </div>
    </section>
  );
}

function Card({ icon, title, desc, span = 1 }: { icon: React.ReactNode; title: string; desc: string; span?: 1 | 2 }) {
  return (
    <div className={`${span === 2 ? 'md:col-span-2' : ''} group bg-white/[0.03] border border-white/10 rounded-2xl p-8 hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-1 transition-all duration-300`}>
      <div className="text-white/70">{icon}</div>
      <h3 className="mt-8 text-xl font-medium text-white">{title}</h3>
      <p className="mt-2 text-white/60 leading-relaxed">{desc}</p>
    </div>
  );
}
