import { Link } from "@tanstack/react-router";
import playtvLogo from "@/assets/playtv-logo-light.png";

export function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-20 backdrop-blur-2xl bg-black/60 border-b border-white/10">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={playtvLogo} alt="Play TV" className="h-24 w-auto" />
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <a href="#features" className="px-4 py-2 text-white/70 hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="px-4 py-2 text-white/70 hover:text-white transition-colors">Pricing</a>
          <Link to="/login" className="px-4 py-2 text-white/70 hover:text-white transition-colors">Sign in</Link>
          <Link to="/signup" className="px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition">Get started</Link>
        </div>
      </div>
    </nav>
  );
}
