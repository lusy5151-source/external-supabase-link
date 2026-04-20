import { corsHeaders } from '@supabase/supabase-js/cors';

// 국립공원공단 탐방로 통제 정보 API
// 공식 엔드포인트: http://apis.data.go.kr/B553662/courseCtrl/getCtrlList
// 매개변수: serviceKey, parkNm(공원명), pageNo, numOfRows, _type=json
const BASE_URL = 'http://apis.data.go.kr/B553662/courseCtrl/getCtrlList';

interface RestrictionItem {
  parkNm?: string;
  ctrlSe?: string;       // 통제 구간
  ctrlCn?: string;       // 통제 내용/사유
  ctrlBgnde?: string;    // 시작일
  ctrlEndde?: string;    // 종료일
  ctrlSttus?: string;    // 통제 상태
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const KNPS_API_KEY = Deno.env.get('KNPS_API_KEY');
    if (!KNPS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'KNPS_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const parkName = url.searchParams.get('parkName');

    if (!parkName) {
      return new Response(
        JSON.stringify({ error: 'parkName query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // "한라산국립공원" → "한라산"으로 단축 (API에서 보통 짧은 명칭 사용)
    const shortName = parkName.replace(/국립공원.*$/, '').trim();

    const apiUrl = new URL(BASE_URL);
    apiUrl.searchParams.set('serviceKey', KNPS_API_KEY);
    apiUrl.searchParams.set('parkNm', shortName);
    apiUrl.searchParams.set('pageNo', '1');
    apiUrl.searchParams.set('numOfRows', '100');
    apiUrl.searchParams.set('_type', 'json');

    console.log(`[get-park-restrictions] Fetching for ${shortName}`);

    const res = await fetch(apiUrl.toString());
    const text = await res.text();

    if (!res.ok) {
      console.error(`[get-park-restrictions] API error ${res.status}: ${text.slice(0, 300)}`);
      return new Response(
        JSON.stringify({ restrictions: [], error: `API error ${res.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`[get-park-restrictions] Non-JSON response: ${text.slice(0, 300)}`);
      return new Response(
        JSON.stringify({ restrictions: [], error: 'Invalid response from KNPS API' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 응답 구조: { response: { body: { items: { item: [...] } } } } 또는 빈 객체
    const items = data?.response?.body?.items?.item ?? data?.response?.body?.items ?? [];
    const itemArray: RestrictionItem[] = Array.isArray(items) ? items : items ? [items] : [];

    // 현재 통제중인 항목만 필터링 (종료일이 오늘 이후)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const active = itemArray.filter((it) => {
      if (!it.ctrlEndde) return true;
      const end = String(it.ctrlEndde).replace(/[^0-9]/g, '');
      return end >= today;
    });

    const restrictions = active.map((it) => ({
      section: it.ctrlSe || '',
      content: it.ctrlCn || '',
      startDate: it.ctrlBgnde || '',
      endDate: it.ctrlEndde || '',
      status: it.ctrlSttus || '',
      parkName: it.parkNm || shortName,
    }));

    return new Response(
      JSON.stringify({ restrictions, parkName: shortName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[get-park-restrictions] Unhandled:', error?.message || error);
    return new Response(
      JSON.stringify({ restrictions: [], error: error?.message || 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
