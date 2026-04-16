import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mountainName, summitName } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64는 필수입니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI 서비스가 설정되지 않았습니다" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const prompt = `당신은 한국 등산 정상석 사진 검증 AI입니다.

사용자가 "${mountainName || "알 수 없음"}" 산의 "${summitName || "정상"}" 정상 인증을 위해 사진을 제출했습니다.

다음 기준으로 이 사진을 판별하세요:

1. 정상석(돌 표지판), 정상 표지판, 또는 산 정상 표시물이 사진에 포함되어 있는가?
2. 자연 환경(산, 바위, 나무, 하늘 등)이 배경에 보이는가?
3. 완전히 관련 없는 사진(음식, 실내, 셀카만, 도시 풍경 등)은 아닌가?

판별 규칙:
- 정상석이나 정상 표지판이 보이면 → 승인 (산 이름이 다소 불명확해도 OK)
- 산 정상처럼 보이는 자연 환경 + 표지판 → 승인
- 정상석 없이 산 풍경만 → 낮은 신뢰도로 승인 가능
- 음식, 실내, 도시, 관련 없는 사진 → 거부

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "approved": true/false,
  "confidence": 0-100,
  "reason": "한국어 설명",
  "detected_elements": ["감지된 요소1", "감지된 요소2"]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI 분석에 실패했습니다", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse Gemini response:", rawText);
      return new Response(
        JSON.stringify({
          approved: false,
          confidence: 0,
          reason: "AI 응답을 분석할 수 없습니다. 다시 시도해주세요.",
          detected_elements: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        approved: Boolean(result.approved),
        confidence: Number(result.confidence) || 0,
        reason: String(result.reason || ""),
        detected_elements: Array.isArray(result.detected_elements)
          ? result.detected_elements
          : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-summit-photo error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
