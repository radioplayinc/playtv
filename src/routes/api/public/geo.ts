import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/geo")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const country =
          getRequestHeader("cf-ipcountry") ||
          getRequestHeader("x-vercel-ip-country") ||
          getRequestHeader("x-country") ||
          null;
        const c = country && country !== "XX" && country !== "T1" ? country.toUpperCase() : null;
        return new Response(JSON.stringify({ country: c }), {
          status: 200,
          headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
