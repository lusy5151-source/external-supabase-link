import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mountain } from "@/data/mountains";

/**
 * Fetches ALL mountains from Supabase `mountains` table.
 * Falls back to empty array on error.
 */
export function useMountainsData() {
  return useQuery<Mountain[]>({
    queryKey: ["mountains-all", "v5-list-view"],
    queryFn: async () => {
      // Use the lightweight `mountains_list` view (excludes heavy text
      // columns like overview/description/parking_info). Order by popularity
      // so the most-viewed mountains hit the top of lists immediately.
      const { data, error } = await (supabase as any)
        .from("mountains_list")
        .select(
          "id,name,name_ko,height,region,province,difficulty,lat,lng,image_url,is_bac100,is_bac100_blackyak,is_national_park,national_park_name,bac100_rank,bac100_label,popularity"
        )
        .order("popularity", { ascending: false, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
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
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    gcTime: 1000 * 60 * 60, // keep for 1h
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
