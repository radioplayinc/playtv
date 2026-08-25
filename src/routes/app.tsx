import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
  validateSearch: (s: Record<string, unknown>) => ({
    tenant: typeof s.tenant === "string" ? s.tenant : undefined,
  }),
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
