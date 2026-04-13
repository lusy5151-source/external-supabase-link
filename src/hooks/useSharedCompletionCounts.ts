import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SharedCompletionData } from "@/hooks/useAchievementStore";

export function useSharedCompletionCounts(): SharedCompletionData[] {
  const { user } = useAuth();
  const [data, setData] = useState<SharedCompletionData[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const { data: myParts } = await supabase
          .from("shared_completion_participants")
          .select("shared_completion_id")
          .eq("user_id", user.id);

        if (!myParts || myParts.length === 0) { setData([]); return; }

        const scIds = myParts.map((p: any) => p.shared_completion_id);

        const { data: allParts } = await supabase
          .from("shared_completion_participants")
          .select("shared_completion_id")
          .in("shared_completion_id", scIds);

        if (!allParts) { setData([]); return; }

        const countMap = new Map<string, number>();
        allParts.forEach((p: any) => {
          countMap.set(p.shared_completion_id, (countMap.get(p.shared_completion_id) || 0) + 1);
        });

        setData(Array.from(countMap.entries()).map(([id, count]) => ({
          id,
          participant_count: count,
        })));
      } catch (e) {
        console.error("Failed to fetch shared completion counts:", e);
      }
    })();
  }, [user]);

  return data;
}
