import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CharacterEmotion = "normal" | "sad" | "angry" | "autumn";

/**
 * Detects app context to auto-select character emotion.
 * Priority: angry > sad > autumn > normal.
 * Returns 'normal' while loading.
 */
export function useCharacterEmotion(): CharacterEmotion {
  const { user } = useAuth();
  const [emotion, setEmotion] = useState<CharacterEmotion>("normal");

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      try {
        // 1) angry: today's most recent summit_claim is not ai_verified
        if (user?.id) {
          const { data: claim } = await (supabase as any)
            .from("summit_claims")
            .select("ai_verified, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (claim?.created_at) {
            const created = new Date(claim.created_at);
            const today = new Date();
            const sameDay =
              created.getFullYear() === today.getFullYear() &&
              created.getMonth() === today.getMonth() &&
              created.getDate() === today.getDate();
            if (sameDay && claim.ai_verified === false) {
              if (!cancelled) setEmotion("angry");
              return;
            }
          }
        }

        // 2) sad: no upcoming hiking_plans within next 7 days
        if (user?.id) {
          const today = new Date();
          const in7 = new Date();
          in7.setDate(today.getDate() + 7);
          const todayStr = today.toISOString().slice(0, 10);
          const in7Str = in7.toISOString().slice(0, 10);

          const { data: plans } = await (supabase as any)
            .from("hiking_plans")
            .select("id, planned_date")
            .eq("creator_id", user.id)
            .gte("planned_date", todayStr)
            .lte("planned_date", in7Str)
            .limit(1);

          if (!plans || plans.length === 0) {
            // 3) autumn check before falling to sad? Spec says sad has higher priority.
            if (!cancelled) setEmotion("sad");
            return;
          }
        }

        // 3) autumn: month is Sep/Oct/Nov
        const month = new Date().getMonth() + 1;
        if (month >= 9 && month <= 11) {
          if (!cancelled) setEmotion("autumn");
          return;
        }

        // 4) default
        if (!cancelled) setEmotion("normal");
      } catch {
        if (!cancelled) setEmotion("normal");
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return emotion;
}
