import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const KAKAO_KEY = Deno.env.get("KAKAO_REST_API_KEY")!;

  const { data: mountains } = await supabase
    .from("mountains")
    .select("id, name_ko, height")
    .is("lat", null)
    .limit(50);

  if (!mountains || mountains.length === 0) {
    return new Response(JSON.stringify({ message: "처리할 산이 없어요! 모두 완료됐습니다 🎉" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = { success: 0, failed: 0, total: mountains.length, details: [] as any[] };

  for (const mountain of mountains) {
    try {
      // 카테고리 필터 없이 검색 (더 넓게)
      const query = encodeURIComponent(mountain.name_ko);
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${query}&size=3`,
        { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
      );
      const data = await res.json();

      // 산 관련 결과 필터링 (MT1 카테고리 또는 "산" 포함)
      const place = data.documents?.find((d: any) =>
        d.category_group_code === "MT1" ||
        d.category_name?.includes("산") ||
        d.place_name?.includes(mountain.name_ko)
      ) || data.documents?.[0];

      if (place) {
        const lat = parseFloat(place.y);
        const lng = parseFloat(place.x);

        await supabase.from("mountains").update({ lat, lng }).eq("id", mountain.id);
        await supabase.from("summits").insert({
          mountain_id: mountain.id,
          summit_name: `${mountain.name_ko} 정상`,
          latitude: lat,
          longitude: lng,
          elevation: mountain.height || 0,
        });

        results.success++;
        results.details.push({
          name: mountain.name_ko,
          lat, lng,
          place: place.place_name,
          status: "✅"
        });
      } else {
        results.failed++;
        results.details.push({ name: mountain.name_ko, status: "❌ 검색 결과 없음" });
      }

      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      results.failed++;
      results.details.push({ name: mountain.name_ko, status: `❌ ${err}` });
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
