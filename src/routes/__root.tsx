import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { GeoProvider } from "@/contexts/GeoContext";
import appCss from "../styles.css?url";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Play TV — Launch your own branded streaming service" },
      { name: "description", content: "White-label OTT and FAST streaming SaaS. Launch your branded service across web, mobile, and TV in minutes." },
      { property: "og:title", content: "Play TV — Launch your own branded streaming service" },
      { name: "twitter:title", content: "Play TV — Launch your own branded streaming service" },
      { property: "og:description", content: "White-label OTT and FAST streaming SaaS. Launch your branded service across web, mobile, and TV in minutes." },
      { name: "twitter:description", content: "White-label OTT and FAST streaming SaaS. Launch your branded service across web, mobile, and TV in minutes." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/QRXQfQtjl0VKgLwd3EVAe1oG0nq1/social-images/social-1778036873785-ptvlog.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/QRXQfQtjl0VKgLwd3EVAe1oG0nq1/social-images/social-1778036873785-ptvlog.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "preconnect", href: "https://rsms.me/" },
      { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

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
