// Edge function: get-nearby-restaurants
// Fetches nearby restaurants/cafes via Kakao Local API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KakaoDoc {
  place_name: string;
  category_name: string;
  category_group_code: string;
  address_name: string;
  road_address_name?: string;
  x: string; // lng
  y: string; // lat
  distance: string; // meters
  phone?: string;
  place_url?: string;
  id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const lat = Number(body.lat ?? url.searchParams.get("lat"));
    const lng = Number(body.lng ?? url.searchParams.get("lng"));
    const radius = Math.min(
      20000,
      Math.max(100, Number(body.radius ?? url.searchParams.get("radius") ?? 1000)),
    );
    const limit = Math.min(
      15,
      Math.max(1, Number(body.limit ?? url.searchParams.get("limit") ?? 5)),
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(
        JSON.stringify({ error: "lat and lng are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("KAKAO_REST_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KAKAO_REST_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fetchCategory = async (code: "FD6" | "CE7") => {
      const u = new URL("https://dapi.kakao.com/v2/local/search/category.json");
      u.searchParams.set("category_group_code", code);
      u.searchParams.set("x", String(lng));
      u.searchParams.set("y", String(lat));
      u.searchParams.set("radius", String(radius));
      u.searchParams.set("sort", "distance");
      u.searchParams.set("size", "15");
      const res = await fetch(u.toString(), {
        headers: { Authorization: `KakaoAK ${apiKey}` },
      });
      if (!res.ok) return [] as KakaoDoc[];
      const json = await res.json();
      return (json?.documents ?? []) as KakaoDoc[];
    };

    const [food, cafe] = await Promise.all([
      fetchCategory("FD6"),
      fetchCategory("CE7"),
    ]);

    const merged = [...food, ...cafe]
      .map((d) => ({
        id: d.id,
        name: d.place_name,
        category: (d.category_name?.split(" > ").pop() || d.category_name || "").trim(),
        address: d.road_address_name || d.address_name,
        lat: Number(d.y),
        lng: Number(d.x),
        distance_m: Number(d.distance) || 0,
        phone: d.phone || null,
        place_url: d.place_url || null,
        category_group_code: d.category_group_code,
      }))
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, limit);

    return new Response(JSON.stringify({ results: merged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
