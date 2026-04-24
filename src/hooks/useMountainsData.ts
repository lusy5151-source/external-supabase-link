import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mountain } from "@/data/mountains";

/**
 * Fetches ALL mountains from Supabase `mountains` table.
 * Falls back to empty array on error.
 */
export function useMountainsData() {
  return useQuery<Mountain[]>({
    queryKey: ["mountains-all", "v2-np"],
    queryFn: async () => {
      // Select only columns actually used in the mapping below to minimize
      // payload size and shorten the critical request chain (LCP/perf).
      // Supabase default limit is 1000, our table has ~120 rows so no pagination needed.
      const { data, error } = await supabase
        .from("mountains")
        .select(
          "id,name,name_ko,height,region,lat,lng,difficulty,description,is_bac100,bac100_label,popularity,overview,address,province,is_national_park,national_park_name"
        )
        .order("id", { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id as number,
        name: row.name || "",
        nameKo: row.name_ko || "",
        height: row.height || 0,
        region: row.region || "기타",
        lat: row.lat || 0,
        lng: row.lng || 0,
        difficulty: row.difficulty || "보통",
        description: row.description || "",
        is_baekdu: row.is_bac100 || false,
        is_bac100: row.is_bac100 || false,
        bac100_label: row.bac100_label || undefined,
        popularity: row.popularity || 0,
        overview: row.overview || "",
        address: row.address || "",
        province: row.province || "",
        is_national_park: row.is_national_park || false,
        national_park_name: row.national_park_name || undefined,
        trails: [],
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}
