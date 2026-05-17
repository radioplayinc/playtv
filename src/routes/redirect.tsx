import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/redirect")({ component: RedirectPage });

function RedirectPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/app" });
      return;
    }
    if (role === "super_admin") navigate({ to: "/admin" });
    else if (role === "tenant_admin") navigate({ to: "/dashboard" });
    else navigate({ to: "/app" });
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="text-muted-foreground">Loading…</div>
    </div>
  );
}
