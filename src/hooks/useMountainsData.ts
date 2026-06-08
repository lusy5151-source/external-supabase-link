import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mountain } from "@/data/mountains";

const SS_KEY = "wandeung_mountains_cache_v6";
const SS_TTL = 1000 * 60 * 60; // 1h

function readSsCache(): Mountain[] | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number" || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.ts > SS_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSsCache(data: Mountain[]) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

/**
 * Lightweight `mountains_list` view fetch (no heavy text columns, no DB sort).
 * Sorting is done client-side in pages that need it.
 * Pass `enabled: false` to defer until after first paint.
 */
export function useMountainsData(opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled !== false;
  const seed = enabled ? readSsCache() ?? undefined : undefined;

  return useQuery<Mountain[]>({
    queryKey: ["mountains-all", "v6-lite"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mountains_list")
        .select(
          "id,name,name_ko,height,region,province,difficulty,lat,lng,image_url,is_bac100,is_bac100_blackyak,is_national_park,national_park_name,bac100_rank,bac100_label,popularity"
        );

      if (error) throw error;

      const mapped: Mountain[] = (data || []).map((row: any) => ({
        id: row.id as number,
        name: row.name || "",
        nameKo: row.name_ko || "",
        height: row.height || 0,
        region: row.region || "기타",
        lat: row.lat || 0,
        lng: row.lng || 0,
        difficulty: row.difficulty || "보통",
        description: "",
        is_baekdu: row.is_bac100 || false,
        is_bac100: row.is_bac100 || false,
        is_bac100_blackyak: row.is_bac100_blackyak || false,
        bac100_label: row.bac100_label || undefined,
        popularity: row.popularity || 0,
        overview: "",
        address: "",
        province: row.province || "",
        is_national_park: row.is_national_park || false,
        national_park_name: row.national_park_name || undefined,
        image_url: row.image_url || null,
        image_credit: null,
        image_license: null,
        image_position: null,
        trails: [],
      }));

      writeSsCache(mapped);
      return mapped;
    },
    enabled,
    initialData: seed,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/** Returns true after the browser is idle / first paint settled. */
export function useIdleEnabled(delayMs = 400): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const ric: any = (window as any).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(() => { if (!cancelled) setReady(true); }, { timeout: 1500 });
      return () => {
        cancelled = true;
        const cancel: any = (window as any).cancelIdleCallback;
        if (typeof cancel === "function") cancel(id);
      };
    }
    const t = window.setTimeout(() => { if (!cancelled) setReady(true); }, delayMs);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [delayMs]);
  return ready;
}
