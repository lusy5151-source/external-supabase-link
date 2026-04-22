import { z } from "https://esm.sh/zod@3.24.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
const requestSchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  type: z.enum(["current", "weather", "forecast"]).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = requestSchema.safeParse(await req.json());

    if (!payload.success) {
      return new Response(
        JSON.stringify({ error: "올바른 위치 정보가 필요합니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lat, lon, type } = payload.data;

    if (!OPENWEATHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenWeatherMap API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = type === "forecast" ? "forecast" : "weather";
    const url = `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("get-weather upstream error", { status: response.status, body: data });
      return new Response(
        JSON.stringify({ error: "날씨 정보를 불러오지 못했습니다" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-weather internal error", error);
    return new Response(
      JSON.stringify({ error: "서비스 오류가 발생했습니다" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});