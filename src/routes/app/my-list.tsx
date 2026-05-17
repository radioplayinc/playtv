import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Row } from "./index";

export const Route = createFileRoute("/app/my-list")({ component: MyListPage });

function MyListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/app/my-list" } });
      return;
    }
    supabase.from("watchlist").select("content(*)").eq("user_id", user.id)
      .then(({ data }) => setItems(((data ?? []) as any[]).map((r) => r.content).filter(Boolean)));
  }, [user?.id, loading, navigate]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-12 md:py-10">
      <h1 className="mb-6 md:mb-8 font-display text-3xl md:text-4xl font-bold">My List</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Your list is empty. Add titles you want to watch later.</p>
      ) : (
        <Row title="" items={items} />
      )}
    </div>
  );
}
