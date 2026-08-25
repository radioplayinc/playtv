import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PosterCard } from "@/components/app/TitleCard";
import { Bookmark, LogIn } from "lucide-react";

export const Route = createFileRoute("/app/my-list")({ component: MyListPage });

interface Content {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
}

function MyListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Content[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/app/my-list" } });
      return;
    }
    supabase
      .from("watchlist")
      .select("content(*)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setItems(((data ?? []) as any[]).map((r) => r.content).filter(Boolean));
        setFetching(false);
      });
  }, [user?.id, loading, navigate]);

  if (loading || fetching) {
    return (
      <div className="px-4 pt-14">
        <div className="h-6 w-32 rounded-lg mb-6 animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)", aspectRatio: "2/3" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0a" }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>My List</h1>
        {items.length > 0 && (
          <p className="text-sm text-white/40 mt-0.5">{items.length} title{items.length !== 1 ? "s" : ""} saved</p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(250,204,21,0.1)" }}
          >
            <Bookmark className="w-8 h-8" style={{ color: "#facc15" }} />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Your list is empty</h3>
          <p className="text-white/40 text-sm leading-relaxed mb-6">
            Save titles you want to watch later and they'll appear here.
          </p>
          <Link
            to="/app"
            className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-black"
            style={{ background: "#facc15" }}
          >
            Browse content
          </Link>
        </div>
      ) : (
        <div className="px-4 pb-28">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {items.map((c) => (
              <PosterCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
