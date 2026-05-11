import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mountain } from "@/data/mountains";

/**
 * Fetches ALL mountains from Supabase `mountains` table.
 * Falls back to empty array on error.
 */
export function useMountainsData() {
  return useQuery<Mountain[]>({
    queryKey: ["mountains-all", "v4-lite"],
    queryFn: async () => {
      // Lite payload for app-wide list/map use. Heavy text columns
      // (description, overview, address, image credit/license) are fetched
      // on-demand inside MountainDetail to keep initial load small.
      const { data, error } = await supabase
        .from("mountains")
        .select(
          "id,name,name_ko,height,region,lat,lng,difficulty,is_bac100,is_bac100_blackyak,bac100_label,popularity,province,is_national_park,national_park_name,image_url,image_position"
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
        description: "",
        is_baekdu: row.is_bac100 || false,
        is_bac100: row.is_bac100 || false,
        is_bac100_blackyak: (row as any).is_bac100_blackyak || false,
        bac100_label: row.bac100_label || undefined,
        popularity: row.popularity || 0,
        overview: "",
        address: "",
        province: row.province || "",
        is_national_park: row.is_national_park || false,
        national_park_name: row.national_park_name || undefined,
        image_url: (row as any).image_url || null,
        image_credit: null,
        image_license: null,
        image_position: (row as any).image_position || null,
        trails: [],
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    gcTime: 1000 * 60 * 60, // keep for 1h
    refetchOnWindowFocus: false,
  });
}
