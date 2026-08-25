const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export const onRequest: PagesFunction = async (context) => {
  if (context.request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  const country =
    context.request.headers.get("cf-ipcountry") ||
    context.request.headers.get("x-vercel-ip-country") ||
    null;
  const c = country && country !== "XX" && country !== "T1" ? country.toUpperCase() : null;

  return new Response(JSON.stringify({ country: c }), {
    status: 200,
    headers: { ...CORS, "Cache-Control": "no-store" },
  });
};
