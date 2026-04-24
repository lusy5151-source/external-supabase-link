// Edge Function: fetch-trail-coordinates
// Skeleton for paginated trail coordinate ingestion.
// Replace the TODO section with the real upstream API call (e.g. forestry/KNPS WMS/WFS).

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface RequestBody {
  page?: number;
  size?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}));
    const page = Math.max(1, Number(body.page ?? 1));
    const size = Math.min(1000, Math.max(1, Number(body.size ?? 1000)));

    // Auth: only allow admins to invoke
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role;
    if (role !== "admin" && role !== "superadmin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Replace this stub with the real upstream API call.
    // Example shape expected by the client:
    //   { saved: number, has_more: boolean, page: number }
    //
    // Suggested approach:
    //   1) Fetch a page of trail coordinates from the upstream provider.
    //   2) Upsert into the appropriate table (e.g. np_trails) keyed by trail_code.
    //   3) Return saved count and whether more pages remain.

    const saved = 0;
    const hasMore = false;

    return new Response(
      JSON.stringify({ saved, has_more: hasMore, page }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
