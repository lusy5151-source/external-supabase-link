import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Challenge { id: string; title: string; description: string | null; type: string; goal_type: string; goal_value: number; start_date: string | null; end_date: string | null; badge_id: string | null; level: number; category: string; badge?: { name: string; image_url: string | null; description: string | null }; }
export interface UserChallenge { id: string; user_id: string; challenge_id: string; progress: number; completed: boolean; completed_at: string | null; joined_at: string; challenge?: Challenge; }
const TIER_ORDER = ["bronze", "silver", "gold", "platinum"] as const;
export type BadgeTier = (typeof TIER_ORDER)[number];
export function getTierForLevel(level: number): BadgeTier { return TIER_ORDER[Math.min(level - 1, 3)] || "bronze"; }
export const TIER_COLORS: Record<BadgeTier, { bg: string; ring: string; text: string }> = {
  bronze: { bg: "bg-amber-100 dark:bg-amber-900/30", ring: "stroke-amber-400", text: "text-amber-600 dark:text-amber-400" },
  silver: { bg: "bg-slate-200 dark:bg-slate-700/40", ring: "stroke-slate-400", text: "text-slate-500 dark:text-slate-400" },
  gold: { bg: "bg-yellow-100 dark:bg-yellow-900/30", ring: "stroke-yellow-500", text: "text-yellow-600 dark:text-yellow-400" },
  platinum: { bg: "bg-violet-100 dark:bg-violet-900/30", ring: "stroke-violet-500", text: "text-violet-600 dark:text-violet-400" },
};

export function useChallenges() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchAllChallenges = useCallback(async (): Promise<Challenge[]> => {
    const { data } = await supabase.from("challenges").select("*, badges(name, image_url, description)").order("category").order("level");
    return (data || []).map((c: any) => ({
      ...c,
      level: typeof c.level === "string" ? parseInt(c.level, 10) || 1 : c.level ?? 1,
      badge: c.badges || null,
    }));
  }, []);

  const fetchUserChallenges = useCallback(async (): Promise<UserChallenge[]> => {
    if (!user) return [];
    const { data } = await supabase.from("user_challenges").select("*, challenges(*, badges(name, image_url, description))").eq("user_id", user.id);
    return (data || []).map((uc: any) => ({
      ...uc,
      challenge: uc.challenges
        ? {
            ...uc.challenges,
            level: typeof uc.challenges.level === "string" ? parseInt(uc.challenges.level, 10) || 1 : uc.challenges.level ?? 1,
            badge: uc.challenges.badges || null,
          }
        : null,
    }));
  }, [user]);

  const joinCategoryLevel1 = useCallback(async (category: string, allChallenges: Challenge[]) => {
    if (!user) return;
    const lv1 = allChallenges.find((c) => c.category === category && c.level === 1);
    if (!lv1) return;
    const { data: existing } = await supabase.from("user_challenges").select("id").eq("user_id", user.id).eq("challenge_id", lv1.id).maybeSingle();
    if (!existing) await supabase.from("user_challenges").insert({ user_id: user.id, challenge_id: lv1.id } as any);
  }, [user]);

  const recalculateProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: journals } = await supabase.from("hiking_journals").select("*").eq("user_id", user.id);
      if (!journals) return;
      const { data: userChallenges } = await supabase.from("user_challenges").select("*, challenges(*)").eq("user_id", user.id).eq("completed", false);
      if (!userChallenges || userChallenges.length === 0) return;
      const { mountains } = await import("@/data/mountains");
      for (const uc of userChallenges as any[]) {
        const ch = uc.challenges; if (!ch) continue;
        let progress = 0;
        switch (ch.goal_type) {
          case "mountain": progress = new Set(journals.map((j: any) => j.mountain_id)).size; break;
          case "count": { const now = new Date(); progress = journals.filter((j: any) => { const d = new Date(j.hiked_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length; break; }
          default: continue;
        }
        const completed = progress >= ch.goal_value;
        await supabase.from("user_challenges").update({ progress, completed, completed_at: completed ? new Date().toISOString() : null } as any).eq("id", uc.id);
      }
    } finally { setLoading(false); }
  }, [user]);

  return { fetchAllChallenges, fetchUserChallenges, joinCategoryLevel1, recalculateProgress, loading };
}