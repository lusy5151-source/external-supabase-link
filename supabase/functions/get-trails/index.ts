const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VWORLD_API_KEY = Deno.env.get("VWORLD_API_KEY");

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
        size: "100",
        attrFilter: `mntn_nm:like:${name}`,
      });

      const fetchUrl = `https://api.vworld.kr/req/data?${params.toString()}`;

      let text: string;
      try {
        const res = await fetch(fetchUrl, {
          headers: {
            "Referer": "https://wandeung.com",
            "Origin": "https://wandeung.com",
          },
        });
        text = await res.text();
        if (!res.ok) continue;
      } catch {
        // VWorld API may reject connections from overseas IPs
        console.log("VWorld connection failed for:", name);
        continue;
      }

      // VWorld sometimes returns malformed JSON with unescaped quotes in error text
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        try {
          // Fix unescaped quotes like: 단일검색="Y"
          const fixed = text.replace(/="([^"{}[\]:,]*?)"/g, '=\\"$1\\"');
          data = JSON.parse(fixed);
        } catch {
          continue;
        }
      }

      const resp = data?.response;
      if (resp?.status === "OK" && resp?.result?.featureCollection?.features) {
        features = resp.result.featureCollection.features;
      }
    }

    return new Response(JSON.stringify({ features }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Always return 200 with empty features so frontend handles gracefully
    return new Response(JSON.stringify({ features: [], error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
