import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { GeoProvider } from "@/contexts/GeoContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-primary">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Back home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <TenantProvider>
        <GeoProvider>
          <Outlet />
          <Toaster />
        </GeoProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
