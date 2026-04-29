// Edge Function: vworld-proxy
// Server-side proxy for VWorld GetFeature (LT_L_FRSTCLIMB).
// Avoids browser CORS and hides API key.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VWORLD_DOMAIN = "wandeung.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mountainName = url.searchParams.get("mountain_name");
    if (!mountainName) {
      return new Response(JSON.stringify({ error: "mountain_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("VWORLD_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "VWORLD_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vw = new URL("https://api.vworld.kr/req/data");
    vw.searchParams.set("service", "data");
    vw.searchParams.set("request", "GetFeature");
    vw.searchParams.set("data", "LT_L_FRSTCLIMB");
    vw.searchParams.set("key", apiKey);
    vw.searchParams.set("domain", VWORLD_DOMAIN);
    vw.searchParams.set("attrFilter", `mntn_nm:LIKE:${mountainName}`);
    vw.searchParams.set("crs", "EPSG:4326");
    vw.searchParams.set("format", "json");
    vw.searchParams.set("size", "1000");
    vw.searchParams.set("geometry", "true");

    const res = await fetch(vw.toString());
    if (!res.ok) {
      return new Response(JSON.stringify({ trails: [], error: `VWorld HTTP ${res.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const features = data?.response?.result?.featureCollection?.features ?? [];

    return new Response(JSON.stringify({ trails: features }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ trails: [], error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
