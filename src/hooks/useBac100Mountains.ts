import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mountain } from "@/data/mountains";

/**
 * Fetches BAC 100대 명산 list from `bac100_mountains` table joined with `mountains`
 * to provide full mountain detail records (lat/lng/difficulty/etc.) ordered by bac_rank.
 */
export function useBac100Mountains() {
  return useQuery<Mountain[]>({
    queryKey: ["bac100-mountains-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bac100_mountains")
        .select("id, name_ko, bac_rank, height, region, address, stamp_location, mountain_id, mountains(*)")
        .eq("is_active", true)
        .order("bac_rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []).map((row: any) => {
        const m = row.mountains || {};
        return {
          id: m.id ?? row.mountain_id ?? row.id,
          name: m.name ?? row.name_ko ?? "",
          nameKo: row.name_ko ?? m.name_ko ?? "",
          height: m.height ?? row.height ?? 0,
          region: m.region ?? row.region ?? "",
          difficulty: m.difficulty ?? "보통",
          description: m.description ?? "",
          lat: m.lat ?? 0,
          lng: m.lng ?? 0,
          is_baekdu: true,
          is_bac100: true,
          is_oreum: m.is_oreum ?? false,
          popularity: m.popularity ?? 0,
          overview: m.overview ?? "",
          address: m.address ?? row.address ?? "",
          province: m.province ?? "",
          bac100_label: m.bac100_label ?? "BAC 100대 명산 리스트 기반",
          bac100_rank: row.bac_rank ?? m.bac100_rank ?? null,
          image_url: m.image_url ?? "",
          feature: m.feature ?? "",
          stamp_location: row.stamp_location ?? "",
        } as Mountain;
      });
    },
    staleTime: 1000 * 60 * 30,
  });
}
