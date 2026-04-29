// Edge Function: nearby-places
// Fetches nearby restaurants and cafes from Kakao Local API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KakaoDoc {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name?: string;
  phone?: string;
  place_url: string;
  x: string; // lng
  y: string; // lat
  distance: string; // meters
}

async function fetchCategory(
  apiKey: string,
  categoryCode: "FD6" | "CE7",
  lat: number,
  lng: number,
  radius: number,
  sort: string
): Promise<any[]> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
  url.searchParams.set("category_group_code", categoryCode);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("radius", String(Math.min(radius, 20000)));
  url.searchParams.set("sort", sort === "distance" ? "distance" : "accuracy");
  url.searchParams.set("size", "15");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  const docs: KakaoDoc[] = data?.documents ?? [];
  return docs.map((d) => {
    const distance_m = Number(d.distance) || 0;
    return {
      place_id: d.id,
      name: d.place_name,
      category: d.category_name,
      address: d.road_address_name || d.address_name,
      phone: d.phone || null,
      distance_m,
      distance_km: (distance_m / 1000).toFixed(2),
      place_url: d.place_url,
      lat: Number(d.y),
      lng: Number(d.x),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const radius = Number(body?.radius) || 5000;
    const sort = String(body?.sort || "distance");

    if (!isFinite(lat) || !isFinite(lng)) {
      return new Response(
        JSON.stringify({ error: "lat and lng required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("KAKAO_REST_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KAKAO_REST_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [restaurants, cafes] = await Promise.all([
      fetchCategory(apiKey, "FD6", lat, lng, radius, sort),
      fetchCategory(apiKey, "CE7", lat, lng, radius, sort),
    ]);

    return new Response(
      JSON.stringify({ restaurants, cafes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, restaurants: [], cafes: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
