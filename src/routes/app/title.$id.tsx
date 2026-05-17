import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Play, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/title/$id")({ component: TitlePage });

function TitlePage() {
  const { id } = useParams({ from: "/app/title/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<any>(null);
  const [inList, setInList] = useState(false);

  useEffect(() => {
    supabase.from("content").select("*").eq("id", id).maybeSingle().then(({ data }) => setContent(data));
    if (user) {
      supabase.from("watchlist").select("id").eq("user_id", user.id).eq("content_id", id).maybeSingle()
        .then(({ data }) => setInList(!!data));
    }
  }, [id, user?.id]);

  const toggleList = async () => {
    if (!user) {
      navigate({ to: "/signup", search: { redirect: `/app/title/${id}` } });
      return;
    }
    if (inList) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("content_id", id);
      setInList(false);
      toast.success("Removed from My List");
    } else {
      await supabase.from("watchlist").insert({ user_id: user.id, content_id: id });
      setInList(true);
      toast.success("Added to My List");
    }
  };

  if (!content) return <div className="p-12 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="relative aspect-video max-h-[70vh] overflow-hidden">
        <img src={content.hero_url ?? content.thumbnail_url ?? ""} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-8 md:py-10 -mt-20 md:-mt-32 relative">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">{content.title}</h1>
        <p className="mt-2 text-xs md:text-sm uppercase tracking-wider text-muted-foreground">{content.category}</p>
        <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">{content.description}</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link to="/watch/$id" params={{ id }} className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground">
            <Play className="h-4 w-4 fill-current" /> Play
          </Link>
          <button onClick={toggleList} className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 font-semibold">
            {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {inList ? "In My List" : "Add to My List"}
          </button>
        </div>
      </div>
    </div>
  );
}
