import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CharacterEmotion = "normal" | "sad" | "angry" | "autumn";

const isSameDay = (iso: string | null | undefined) =>
  !!iso && new Date(iso).toDateString() === new Date().toDateString();

/**
 * Detects app context to auto-select character emotion.
 * Priority: angry > sad > autumn > normal.
 * Returns 'normal' while loading.
 *
 * Listens to window 'wandeung_comforted' event for immediate local update
 * after a comfort session completes (so sad/angry won't re-appear today).
 */
export function useCharacterEmotion(): CharacterEmotion {
  const { user } = useAuth();
  const [emotion, setEmotion] = useState<CharacterEmotion>("normal");
  const [lastComfortedAt, setLastComfortedAt] = useState<string | null>(null);

  // Listen for local "comforted" event → immediately go to normal
  useEffect(() => {
    const onComforted = () => {
      const nowIso = new Date().toISOString();
      setLastComfortedAt(nowIso);
      setEmotion("normal");
    };
    window.addEventListener("wandeung_comforted", onComforted);
    return () => window.removeEventListener("wandeung_comforted", onComforted);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      try {
        if (!user?.id) {
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

        const failedSummitP = (supabase as any)
          .from("summit_claims")
          .select("id")
          .eq("user_id", userId)
          .eq("ai_verified", false)
          .gte("claimed_at", todayStartISO)
          .limit(1);

        const upcomingPlansP = (supabase as any)
          .from("hiking_plans")
          .select("planned_date, mountain_id")
          .eq("creator_id", userId)
          .gte("planned_date", todayStr)
          .lte("planned_date", in7Str)
          .order("planned_date", { ascending: true })
          .limit(1);

        const lastSummitP = (supabase as any)
          .from("summit_claims")
          .select("claimed_at")
          .eq("user_id", userId)
          .eq("ai_verified", true)
          .order("claimed_at", { ascending: false })
          .limit(1);

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

        // Sync local lastComfortedAt from DB (don't override fresher local value)
        const dbComforted: string | null = profile?.last_comforted_at ?? null;
        if (dbComforted && (!lastComfortedAt || new Date(dbComforted) > new Date(lastComfortedAt))) {
          if (!cancelled) setLastComfortedAt(dbComforted);
        }

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

        // Comforted today? Check local state first (most up-to-date), else DB.
        const comfortedToday = isSameDay(lastComfortedAt) || isSameDay(dbComforted);

        if (comfortedToday) {
          const month = new Date().getMonth() + 1;
          if (!cancelled) setEmotion(month >= 9 && month <= 11 ? "autumn" : "normal");
          return;
        }

        // Emotion priority: angry > sad > autumn > normal
        if (failedSummit && failedSummit.length > 0) {
          if (!cancelled) setEmotion("angry");
          return;
        }
        if (!upcomingPlans || upcomingPlans.length === 0) {
          if (!cancelled) setEmotion("sad");
          return;
        }
        const month = new Date().getMonth() + 1;
        if (month >= 9 && month <= 11) {
          if (!cancelled) setEmotion("autumn");
          return;
        }
        if (!cancelled) setEmotion("normal");

        void lastSummit;
      } catch {
        if (!cancelled) setEmotion("normal");
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, [user?.id, lastComfortedAt]);

  return emotion;
}
