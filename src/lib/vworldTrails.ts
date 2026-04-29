// VWorld trail fetcher + matcher
// Calls the `vworld-proxy` Edge Function to bypass CORS and hide the API key.

export interface VWorldFeature {
  id?: string;
  properties: Record<string, any>;
  geometry: { type: string; coordinates: any };
}

export async function fetchVWorldTrail(mountainName: string): Promise<VWorldFeature[]> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/vworld-proxy?mountain_name=${encodeURIComponent(mountainName)}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return (data?.trails as VWorldFeature[]) || [];
  } catch {
    return [];
  }
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
