import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PioneerAchievement {
  mountainId: number;
  mountainName: string;
  earnedAt: string;
}

export function usePioneerBadges(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  const { data: pioneerBadges = [], isLoading } = useQuery({
    queryKey: ["pioneer-badges", targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", targetId)
        .like("badge_id", "pioneer_%") as any;
      if (error) return [];

      // Extract mountain IDs and fetch names
      const achievements = (data || []) as Array<{ badge_id: string; earned_at: string }>;
      const results: PioneerAchievement[] = [];

      for (const a of achievements) {
        const mountainId = parseInt(a.badge_id.replace("pioneer_", ""), 10);
        if (isNaN(mountainId)) continue;

        // Try to get mountain name from user_mountains
        const { data: mtn } = await supabase
          .from("user_mountains")
          .select("name_ko")
          .eq("mountain_id", mountainId)
          .maybeSingle() as any;

        results.push({
          mountainId,
          mountainName: mtn?.name_ko || `산 #${mountainId}`,
          earnedAt: a.earned_at,
        });
      }

      return results;
    },
    enabled: !!targetId,
  });

  const hasPioneerBadge = pioneerBadges.length > 0;

  return { pioneerBadges, hasPioneerBadge, isLoading };
}
