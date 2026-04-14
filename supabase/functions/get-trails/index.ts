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

      const fetchUrl = `https://api.vworld.kr/req/data?${params.toString()}`;
      console.log("Fetching:", fetchUrl);

      const res = await fetch(fetchUrl, {
        headers: {
          "Referer": "https://wandeung.com",
          "Origin": "https://wandeung.com",
        },
      });
      
      const text = await res.text();
      console.log("Response:", res.status, text.substring(0, 500));
      
      if (!res.ok) continue;

      // VWorld API sometimes returns malformed JSON with unescaped quotes in error messages
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // Try fixing common VWorld JSON issues (unescaped quotes in error text)
        const fixed = text.replace(/=\\"([^"]*?)\\"/g, '=\\"$1\\"')
          .replace(/="([^"]*?)"/g, (match, p1) => `=\\"${p1}\\"`);
        try {
          data = JSON.parse(fixed);
        } catch {
          // If still can't parse, skip this attempt
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
