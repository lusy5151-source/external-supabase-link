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
        if (!user?.id) {
          // 3) autumn fallback only when no user
          const month = new Date().getMonth() + 1;
          if (!cancelled) setEmotion(month >= 9 && month <= 11 ? "autumn" : "normal");
          return;
        }

        const userId = user.id;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStartISO = todayStart.toISOString();
        const todayStr = todayStart.toISOString().slice(0, 10);
        const in7 = new Date(todayStart);
        in7.setDate(in7.getDate() + 7);
        const in7Str = in7.toISOString().slice(0, 10);

        // 1) Today's failed summit verification
        const failedSummitP = (supabase as any)
          .from("summit_claims")
          .select("id")
          .eq("user_id", userId)
          .eq("ai_verified", false)
          .gte("claimed_at", todayStartISO)
          .limit(1);

        // 2) Upcoming hiking plans within next 7 days
        const upcomingPlansP = (supabase as any)
          .from("hiking_plans")
          .select("planned_date, mountain_id")
          .eq("creator_id", userId)
          .gte("planned_date", todayStr)
          .lte("planned_date", in7Str)
          .order("planned_date", { ascending: true })
          .limit(1);

        // 3) Last successful summit (for days-since calculation)
        const lastSummitP = (supabase as any)
          .from("summit_claims")
          .select("claimed_at")
          .eq("user_id", userId)
          .eq("ai_verified", true)
          .order("claimed_at", { ascending: false })
          .limit(1);

        // 4) Profile XP/level/last_app_visit
        const profileP = (supabase as any)
          .from("profiles")
          .select("xp, character_level, last_app_visit, last_comforted_at")
          .eq("user_id", userId)
          .maybeSingle();

        const [
          { data: failedSummit },
          { data: upcomingPlans },
          { data: lastSummit },
          { data: profile },
        ] = await Promise.all([failedSummitP, upcomingPlansP, lastSummitP, profileP]);

        // 5) First-visit-today: update last_app_visit
        const lastVisit = profile?.last_app_visit ? new Date(profile.last_app_visit) : null;
        const isFirstVisitToday =
          !lastVisit ||
          new Date(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate()) < todayStart;
        if (isFirstVisitToday) {
          (supabase as any)
            .from("profiles")
            .update({ last_app_visit: new Date().toISOString() })
            .eq("user_id", userId)
            .then(({ error }: any) => {
              if (error) console.warn("[useCharacterEmotion] last_app_visit update failed", error);
            });
        }

        // Skip negative emotions if already comforted today
        const lastComforted = profile?.last_comforted_at;
        const skipNegativeEmotions = !!(
          lastComforted &&
          new Date(lastComforted).toDateString() === new Date().toDateString()
        );

        // Emotion priority: angry > sad > autumn > normal
        if (!skipNegativeEmotions && failedSummit && failedSummit.length > 0) {
          if (!cancelled) setEmotion("angry");
          return;
        }
        if (!skipNegativeEmotions && (!upcomingPlans || upcomingPlans.length === 0)) {
          if (!cancelled) setEmotion("sad");
          return;
        }
        const month = new Date().getMonth() + 1;
        if (month >= 9 && month <= 11) {
          if (!cancelled) setEmotion("autumn");
          return;
        }
        if (!cancelled) setEmotion("normal");

        // Reference unused locals for future logic / lint
        void lastSummit;
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
