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

      const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_L_FRSTCLIMB&key=${VWORLD_API_KEY}&domain=https://wandeung.com&format=json&crs=EPSG:4326&attrFilter=mntn_nm:like:${encodeURIComponent(name)}`;

      console.log("Fetching VWorld:", url);

      const res = await fetch(url, {
        headers: {
          "Referer": "https://wandeung.com",
          "Origin": "https://wandeung.com",
        },
      });
      
      const text = await res.text();
      console.log("VWorld response status:", res.status, "body length:", text.length, "preview:", text.substring(0, 300));
      
      if (!res.ok) continue;

      const data = JSON.parse(text);
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
