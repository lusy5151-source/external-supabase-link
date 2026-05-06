// Edge Function: vworld-proxy
// Server-side proxy for VWorld APIs.
// - Hides VWORLD_API_KEY from the browser
// - Restricts callers to authenticated admin only
// - Supports two query modes:
//     type=data : VWorld /req/data GetFeature (paginated, optional mountain_name filter)
//     type=wfs  : VWorld /req/wfs GetFeature  (BBOX-based)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VWORLD_DOMAIN = "wandeung.com";
const ADMIN_EMAIL = "wandeung1@gmail.com";

// Whitelist of allowed VWorld datasets (defense in depth — prevent the
// proxy from being abused as a generic VWorld passthrough).
const ALLOWED_DATA_LAYERS = new Set(["LT_L_FRSTCLIMB"]);
const ALLOWED_WFS_TYPENAMES = new Set(["lt_l_frtrk", "LT_L_FRTRK"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, res: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, res: jsonResponse({ error: "Supabase env missing" }, 500) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return { ok: false, res: jsonResponse({ error: "Forbidden" }, 403) };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const apiKey = Deno.env.get("VWORLD_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "VWORLD_API_KEY not configured" }, 500);
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "data";

    // -----------------------------
    // WFS GetFeature (BBOX) mode
    // -----------------------------
    if (type === "wfs") {
      const lat = parseFloat(url.searchParams.get("lat") ?? "");
      const lng = parseFloat(url.searchParams.get("lng") ?? "");
      const typename = url.searchParams.get("typename") ?? "lt_l_frtrk";
      const range = parseFloat(url.searchParams.get("range") ?? "0.03");

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return jsonResponse({ features: [], error: "lat and lng required for wfs" }, 400);
      }
      if (!ALLOWED_WFS_TYPENAMES.has(typename)) {
        return jsonResponse({ features: [], error: "typename not allowed" }, 400);
      }

      const minLng = lng - range;
      const maxLng = lng + range;
      const minLat = lat - range;
      const maxLat = lat + range;

      const vw = new URL("https://api.vworld.kr/req/wfs");
      vw.searchParams.set("SERVICE", "WFS");
      vw.searchParams.set("REQUEST", "GetFeature");
      vw.searchParams.set("VERSION", "2.0.0");
      vw.searchParams.set("TYPENAME", typename);
      vw.searchParams.set("SRSNAME", "EPSG:4326");
      vw.searchParams.set("OUTPUT", "application/json");
      vw.searchParams.set("BBOX", `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`);
      vw.searchParams.set("KEY", apiKey);
      vw.searchParams.set("DOMAIN", VWORLD_DOMAIN);

      const res = await fetch(vw.toString());
      if (!res.ok) {
        return jsonResponse({ features: [], error: `VWorld HTTP ${res.status}` });
      }
      const json = await res.json();
      return jsonResponse({ features: json?.features ?? [] });
    }

    // -----------------------------
    // Data GetFeature mode (default)
    // -----------------------------
    const dataset = url.searchParams.get("data") ?? "LT_L_FRSTCLIMB";
    if (!ALLOWED_DATA_LAYERS.has(dataset)) {
      return jsonResponse({ trails: [], features: [], error: "data layer not allowed" }, 400);
    }

    const mountainName = url.searchParams.get("mountain_name");
    const page = url.searchParams.get("page") ?? "1";
    const size = url.searchParams.get("size") ?? "1000";

    const vw = new URL("https://api.vworld.kr/req/data");
    vw.searchParams.set("service", "data");
    vw.searchParams.set("request", "GetFeature");
    vw.searchParams.set("data", dataset);
    vw.searchParams.set("key", apiKey);
    vw.searchParams.set("domain", VWORLD_DOMAIN);
    vw.searchParams.set("crs", "EPSG:4326");
    vw.searchParams.set("format", "json");
    vw.searchParams.set("size", size);
    vw.searchParams.set("page", page);
    vw.searchParams.set("geometry", "true");
    vw.searchParams.set("attribute", "true");
    if (mountainName) {
      vw.searchParams.set("attrFilter", `mntn_nm:LIKE:${mountainName}`);
    }

    const res = await fetch(vw.toString());
    if (!res.ok) {
      return jsonResponse({ trails: [], features: [], error: `VWorld HTTP ${res.status}` });
    }
    const data = await res.json();
    const features = data?.response?.result?.featureCollection?.features ?? [];

    // `trails` is kept as a legacy alias so existing callers keep working;
    // new callers should use `response`/`features`.
    return jsonResponse({
      response: data?.response,
      features,
      trails: features,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ trails: [], features: [], error: message }, 500);
  }
});
