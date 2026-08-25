import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // Shim TanStack Start server APIs for static/SPA builds
      "@tanstack/react-start/server": resolve(__dirname, "src/shims/tanstack-start-server.ts"),
      "@tanstack/react-start": resolve(__dirname, "src/shims/tanstack-start.ts"),
    },
  },
  build: {
    outDir: "dist",
  },
});
