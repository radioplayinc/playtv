import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BlastNav } from "@/components/blast/BlastNav";

export const Route = createFileRoute("/blast")({
  component: BlastLayout,
});

function BlastLayout() {
  return (
    <div
      className="min-h-dvh text-white"
      style={{
        background: "#080812",
        fontFamily: "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <BlastNav />
      <Outlet />
    </div>
  );
}
