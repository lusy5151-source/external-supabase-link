// Edge Function: save-trail-geometry
// Saves a fetched VWorld geometry into the trails table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  trail_id?: string;
  geometry?: unknown;
  source?: string;
  matched_feature_id?: string;
  match_confidence?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const { trail_id, geometry, source, matched_feature_id, match_confidence } = body;

    if (!trail_id || typeof trail_id !== "string") {
      return new Response(JSON.stringify({ error: "trail_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!geometry || typeof geometry !== "object") {
      return new Response(JSON.stringify({ error: "geometry required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const update: Record<string, unknown> = {
      geometry,
      vworld_synced_at: new Date().toISOString(),
    };
    if (source === "vworld") {
      if (matched_feature_id) update.vworld_matched_feature_id = matched_feature_id;
      if (match_confidence) update.vworld_match_confidence = match_confidence;
    }

    const { error } = await admin.from("trails").update(update).eq("id", trail_id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
