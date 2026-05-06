// Edge Function: fetch-mountain-image
// Fetches a representative image and license info for a Korean mountain via Wikipedia API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  mountain_name?: string;
}

interface Result {
  image_url: string | null;
  image_credit: string | null;
  image_license: string | null;
  source: "wikipedia";
}

const WIKI_API = "https://ko.wikipedia.org/w/api.php";

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const mountainName = (body.mountain_name || "").trim();

    if (!mountainName) {
      return new Response(
        JSON.stringify({ error: "mountain_name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const empty: Result = {
      image_url: null,
      image_credit: null,
      image_license: null,
      source: "wikipedia",
    };

    // Step 1: Get page thumbnail + original image filename
    const pageUrl = new URL(WIKI_API);
    pageUrl.searchParams.set("action", "query");
    pageUrl.searchParams.set("titles", mountainName);
    pageUrl.searchParams.set("prop", "pageimages");
    pageUrl.searchParams.set("format", "json");
    pageUrl.searchParams.set("pithumbsize", "800");
    pageUrl.searchParams.set("pilicense", "any");
    pageUrl.searchParams.set("origin", "*");
    pageUrl.searchParams.set("redirects", "1");

    const pageRes = await fetch(pageUrl.toString());
    if (!pageRes.ok) {
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pageJson = await pageRes.json();
    const pages = pageJson?.query?.pages ?? {};
    const firstPage: any = Object.values(pages)[0] ?? {};
    const thumbnail: string | null = firstPage?.thumbnail?.source ?? null;
    const fileName: string | null = firstPage?.pageimage ?? null;

    if (!thumbnail || !fileName) {
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Get image metadata (artist + license)
    const fileUrl = new URL(WIKI_API);
    fileUrl.searchParams.set("action", "query");
    fileUrl.searchParams.set("titles", `File:${fileName}`);
    fileUrl.searchParams.set("prop", "imageinfo");
    fileUrl.searchParams.set("iiprop", "extmetadata");
    fileUrl.searchParams.set("format", "json");
    fileUrl.searchParams.set("origin", "*");

    let artist: string | null = null;
    let license: string | null = null;
    let licenseUrl: string | null = null;

    try {
      const fileRes = await fetch(fileUrl.toString());
      if (fileRes.ok) {
        const fileJson = await fileRes.json();
        const filePages = fileJson?.query?.pages ?? {};
        const firstFile: any = Object.values(filePages)[0] ?? {};
        const meta = firstFile?.imageinfo?.[0]?.extmetadata ?? {};
        if (meta?.Artist?.value) artist = stripHtml(String(meta.Artist.value));
        if (meta?.LicenseShortName?.value)
          license = stripHtml(String(meta.LicenseShortName.value));
        if (meta?.LicenseUrl?.value)
          licenseUrl = stripHtml(String(meta.LicenseUrl.value));
      }
    } catch (_e) {
      // ignore metadata failures
    }

    const creditParts: string[] = [];
    if (artist) creditParts.push(`© ${artist}`);
    else creditParts.push("©");
    creditParts.push("Wikimedia Commons");
    if (license) creditParts.push(license);

    const result: Result = {
      image_url: thumbnail,
      image_credit: creditParts.join(" / "),
      image_license: license ? (licenseUrl ? `${license} (${licenseUrl})` : license) : null,
      source: "wikipedia",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
