const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VWORLD_API_KEY = "F41DD5DC-6774-33EA-8E02-68505ADAF394";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mountainName } = await req.json();

    if (!mountainName) {
      return new Response(
        JSON.stringify({ error: "mountainName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchNames = [mountainName, mountainName.replace(/산$/, "").trim()];
    let features: unknown[] = [];

    for (const name of searchNames) {
      if (features.length > 0) break;

      const params = new URLSearchParams({
        service: "data",
        request: "GetFeature",
        data: "LT_L_FRSTCLIMB",
        key: VWORLD_API_KEY,
        domain: "https://wandeung.com",
        format: "json",
        crs: "EPSG:4326",
        attrFilter: `mntn_nm:like:${name}`,
      });

      const res = await fetch(`https://api.vworld.kr/req/data?${params.toString()}`, {
        headers: {
          "Referer": "https://wandeung.com",
          "Origin": "https://wandeung.com",
        },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const resp = data?.response;

      if (resp?.status === "OK" && resp?.result?.featureCollection?.features) {
        features = resp.result.featureCollection.features;
      }
    }

    return new Response(JSON.stringify({ features }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
