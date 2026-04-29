// VWorld trail fetcher + matcher
// Public API key (domain-restricted to wandeung.com).

const VWORLD_KEY = "F41DD5DC-6774-33EA-8E02-68505ADAF394";
const VWORLD_DOMAIN = "wandeung.com";

export interface VWorldFeature {
  id?: string;
  properties: Record<string, any>;
  geometry: { type: string; coordinates: any };
}

export async function fetchVWorldTrail(mountainName: string): Promise<VWorldFeature[]> {
  const url = new URL("https://api.vworld.kr/req/data");
  url.searchParams.set("service", "data");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("data", "LT_L_FRSTCLIMB");
  url.searchParams.set("key", VWORLD_KEY);
  url.searchParams.set("domain", VWORLD_DOMAIN);
  url.searchParams.set("attrFilter", `mntn_nm:LIKE:${mountainName}`);
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("format", "json");
  url.searchParams.set("size", "1000");
  url.searchParams.set("geometry", "true");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`VWorld HTTP ${res.status}`);
  const data = await res.json();
  return data?.response?.result?.featureCollection?.features || [];
}

const STOPWORDS = new Set(["코스", "구간", "탐방로", "등산로", "등산코스", "루트", "길"]);

function tokenize(s: string): string[] {
  if (!s) return [];
  return s
    .replace(/[()\[\]{}·,~\-→<>]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function commonKeywordCount(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = tokenize(b);
  let n = 0;
  tb.forEach((t) => {
    if (ta.has(t)) n++;
  });
  return n;
}

export interface MatchResult {
  feature: VWorldFeature;
  confidence: "high" | "medium" | "low";
  distanceDiffKm: number;
  keywordMatches: number;
}

/**
 * Pick the best feature for a given trail.
 * Rules:
 *  1) Prefer features with shared keywords vs trail.name
 *  2) Distance must be within 3km of trail.distance_km
 *  3) Among candidates, pick smallest distance diff
 */
export function matchBestFeature(
  features: VWorldFeature[],
  trailName: string,
  distanceKm: number | null | undefined
): MatchResult | null {
  if (!features || features.length === 0) return null;

  const targetKm = typeof distanceKm === "number" ? distanceKm : null;

  const scored = features
    .map((f) => {
      const courseNm: string = f.properties?.course_nm || f.properties?.cours_nm || "";
      const lengM: number = Number(f.properties?.course_leng || f.properties?.cours_leng || 0);
      const lengKm = lengM > 0 ? lengM / 1000 : null;
      const kw = commonKeywordCount(trailName || "", courseNm);
      const diff = targetKm != null && lengKm != null ? Math.abs(lengKm - targetKm) : Infinity;
      return { f, kw, lengKm, diff };
    })
    // distance window (only if we have target)
    .filter((s) => (targetKm == null ? true : s.diff <= 3));

  if (scored.length === 0) return null;

  // Prefer those with keyword overlap
  const withKw = scored.filter((s) => s.kw > 0);
  const pool = withKw.length > 0 ? withKw : scored;

  pool.sort((a, b) => {
    if (b.kw !== a.kw) return b.kw - a.kw;
    return a.diff - b.diff;
  });

  const best = pool[0];
  let confidence: MatchResult["confidence"] = "low";
  if (best.kw >= 1 && best.diff <= 1) confidence = "high";
  else if (best.kw >= 1 || best.diff <= 1.5) confidence = "medium";

  return {
    feature: best.f,
    confidence,
    distanceDiffKm: best.diff === Infinity ? -1 : best.diff,
    keywordMatches: best.kw,
  };
}

export async function saveTrailGeometry(params: {
  trailId: string;
  geometry: object;
  matchedFeatureId?: string;
  matchConfidence?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/save-trail-geometry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        trail_id: params.trailId,
        geometry: params.geometry,
        source: "vworld",
        matched_feature_id: params.matchedFeatureId,
        match_confidence: params.matchConfidence,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown" };
  }
}
