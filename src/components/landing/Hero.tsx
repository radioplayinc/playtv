import { Link } from "@tanstack/react-router";
import playtvLogo from "@/assets/playtv-logo-light.png";

export function Hero() {
  return (
    <section className="relative min-h-[92vh] w-full overflow-hidden bg-black">
      {/* Cinematic gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(156,223,47,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,255,255,0.06), transparent 60%), #000",
        }}
      />

      {/* Play TV logo watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src={playtvLogo}
          alt=""
          aria-hidden
          className="w-[80%] max-w-[1100px] opacity-[0.06] blur-[1px] select-none"
        />
      </div>
      {/* Bottom-to-top fade (Netflix billboard) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      {/* Left fade for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />


      <div className="relative h-full min-h-[92vh] flex items-end px-6 md:px-12 pb-20 pt-32">
        <div className="max-w-5xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#9cdf2f] opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9cdf2f]" />
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-white/60">
              Multi-tenant white-label streaming SaaS
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold -tracking-[0.03em] leading-[0.95] text-white">
            Launch your own branded streaming service in minutes.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
            Play TV gives you everything to run a Netflix-class OTT platform — VOD, FAST channels, branded apps for web, mobile, and TV — under your name, your colors, your domain.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/signup" className="px-7 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition">
              Start free
            </Link>
            <a href="#features" className="px-7 py-3 rounded-full border border-white/20 text-white hover:bg-white/10 transition">
              See features
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
