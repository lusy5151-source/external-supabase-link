// SafeMap WMS proxy for safemap.go.kr (IF_0017 등)
// Browser는 EPSG:4326 BBOX와 width/height/layers를 query로 넘기고,
// 서버는 serviceKey를 붙여 원본 WMS PNG를 그대로 프록시한다.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SAFEMAP_BASE = "https://safemap.go.kr/openapi2/IF_0017_WMS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("SAFEMAP_API_KEY");
  if (!apiKey) {
    console.error("[safemap-wms] SAFEMAP_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "SAFEMAP_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const bbox = params.get("bbox");
    const width = params.get("width") ?? "256";
    const height = params.get("height") ?? "256";
    const layers = params.get("layers") ?? "IF_0017";
    const format = params.get("format") ?? "image/png";
    const srs = params.get("srs") ?? "EPSG:4326";
    const version = params.get("version") ?? "1.1.1";

    if (!bbox) {
      return new Response(JSON.stringify({ error: "Missing bbox" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = new URL(SAFEMAP_BASE);
    upstream.searchParams.set("service", "WMS");
    upstream.searchParams.set("request", "GetMap");
    upstream.searchParams.set("version", version);
    upstream.searchParams.set("layers", layers);
    upstream.searchParams.set("styles", "");
    upstream.searchParams.set("format", format);
    upstream.searchParams.set("transparent", "true");
    upstream.searchParams.set("srs", srs);
    upstream.searchParams.set("bbox", bbox);
    upstream.searchParams.set("width", width);
    upstream.searchParams.set("height", height);
    upstream.searchParams.set("serviceKey", apiKey);

    const started = Date.now();
    const upstreamUrlForLog = upstream.toString().replace(apiKey, "***");
    console.log(`[safemap-wms] -> ${upstreamUrlForLog}`);

    let res: Response;
    try {
      res = await fetch(upstream.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; WandeungApp/1.0; +https://wandeung.com)",
          "Referer": "https://safemap.go.kr/",
          "Accept": "image/png,image/*;q=0.8,*/*;q=0.5",
        },
      });
    } catch (fetchErr) {
      console.error("[safemap-wms] FETCH FAILED", {
        url: upstreamUrlForLog,
        error: String(fetchErr),
        name: (fetchErr as any)?.name,
        message: (fetchErr as any)?.message,
      });
      return new Response(
        JSON.stringify({
          error: "upstream_fetch_failed",
          detail: String(fetchErr),
          hint: "safemap.go.kr may be blocking Supabase egress IPs (해외 IP 차단 가능성)",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const elapsed = Date.now() - started;
    const contentType = res.headers.get("content-type") ?? "";
    console.log(
      `[safemap-wms] <- status=${res.status} ct=${contentType} ${elapsed}ms`,
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[safemap-wms] UPSTREAM ERROR", {
        status: res.status,
        contentType,
        bodyPreview: text.slice(0, 500),
      });
      return new Response(
        JSON.stringify({
          error: "upstream_error",
          status: res.status,
          contentType,
          bodyPreview: text.slice(0, 500),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 응답이 이미지가 아니면(예: 에러 XML/HTML) 로그로 남기고 502
    if (!contentType.startsWith("image/")) {
      const text = await res.text().catch(() => "");
      console.error("[safemap-wms] NON-IMAGE RESPONSE", {
        contentType,
        bodyPreview: text.slice(0, 500),
      });
      return new Response(
        JSON.stringify({
          error: "non_image_response",
          contentType,
          bodyPreview: text.slice(0, 500),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[safemap-wms] UNEXPECTED ERROR", {
      error: String(err),
      stack: (err as any)?.stack,
    });
    return new Response(
      JSON.stringify({ error: "internal_error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
