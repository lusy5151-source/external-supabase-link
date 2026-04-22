import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.24.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VWORLD_API_KEY = Deno.env.get("VWORLD_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const requestSchema = z.object({
  mountainName: z.string().trim().min(1).max(100).transform((value) => value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ")),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = requestSchema.safeParse(await req.json());

    if (!payload.success) {
      return new Response(
        JSON.stringify({ error: "올바른 산 이름이 필요합니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mountainName } = payload.data;

    if (!VWORLD_API_KEY) {
      return new Response(
        JSON.stringify({ error: "VWorld API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        console.log("VWorld connection failed for:", name);
        continue;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        try {
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
    return new Response(JSON.stringify({ features: [], error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});