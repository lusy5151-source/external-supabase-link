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

  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { data: mountains } = await supabase
    .from("mountains")
    .select("id, name_ko, height, region, lat, lng")
    .not("lat", "is", null)
    .range(offset, offset + 49);

  const suspicious: any[] = [];
  const ok: any[] = [];

  for (const m of mountains || []) {
    try {
      // reverse geocoding으로 현재 좌표가 어느 지역인지 확인
      const reverseRes = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${m.lng}&y=${m.lat}`,
        { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
      );
      const reverseData = await reverseRes.json();
      const regionName = reverseData.documents?.[0]?.address_name || "알 수 없음";

      // 산 이름으로 카카오 지도 검색
      const searchRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(m.name_ko + " 정상")}&size=1`,
        { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
      );
      const searchData = await searchRes.json();
      const found = searchData.documents?.[0];

      let distanceKm = 999;
      let betterLat = null, betterLng = null;

      if (found) {
        const lat2 = parseFloat(found.y), lng2 = parseFloat(found.x);
        const R = 6371;
        const dLat = (lat2 - m.lat) * Math.PI / 180;
        const dLng = (lng2 - m.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(m.lat*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
        betterLat = lat2;
        betterLng = lng2;
      }

      // 의심: 카카오 검색 결과와 현재 저장 좌표가 5km 이상 차이
      const isSuspicious = distanceKm > 5;

      const result = {
        id: m.id,
        name: m.name_ko,
        region: m.region,
        height: m.height,
        current_lat: m.lat,
        current_lng: m.lng,
        region_at_coords: regionName,
        kakao_place: found?.place_name || "검색 안 됨",
        distance_km: distanceKm,
        better_lat: betterLat,
        better_lng: betterLng,
        status: isSuspicious ? "❌ 의심" : "✅ 정상"
      };

      if (isSuspicious) suspicious.push(result);
      else ok.push(result);

      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      suspicious.push({ name: m.name_ko, error: String(err), status: "⚠️ 오류" });
    }
  }

  return new Response(JSON.stringify({
    offset,
    total_checked: (mountains || []).length,
    ok_count: ok.length,
    suspicious_count: suspicious.length,
    suspicious,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
