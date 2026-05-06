import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Challenge { id: string; title: string; description: string | null; type: string; goal_type: string; goal_value: number; start_date: string | null; end_date: string | null; badge_id: string | null; level: number; category: string; category_group?: string | null; badge?: { name: string; image_url: string | null; description: string | null }; }
export interface UserChallenge { id: string; user_id: string; challenge_id: string; progress: number; completed: boolean; completed_at: string | null; joined_at: string; abandoned_at?: string | null; abandon_reason?: string | null; challenge?: Challenge; }
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
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("category")
      .order("level");
    if (error) {
      console.error("[useChallenges] fetchAllChallenges error:", error);
      return [];
    }
    const rows = data || [];
    const badgeIds = Array.from(new Set(rows.map((c: any) => c.badge_id).filter(Boolean)));
    let badgeMap = new Map<string, any>();
    if (badgeIds.length > 0) {
      const { data: badges, error: badgeErr } = await supabase
        .from("badges")
        .select("id, name, image_url, description")
        .in("id", badgeIds);
      if (badgeErr) console.warn("[useChallenges] badges fetch error:", badgeErr);
      (badges || []).forEach((b: any) => badgeMap.set(b.id, b));
    }
    return rows.map((c: any) => ({
      ...c,
      level: typeof c.level === "string" ? parseInt(c.level, 10) || 1 : c.level ?? 1,
      badge: c.badge_id ? badgeMap.get(c.badge_id) ?? null : null,
    }));
  }, []);

  const fetchUserChallenges = useCallback(async (): Promise<UserChallenge[]> => {
    if (!user) return [];
    console.log("Challenges user_id:", user.id);
    const { data, error } = await supabase
      .from("user_challenges")
      .select("*")
      .eq("user_id", user.id);
    if (error) {
      console.error("[useChallenges] fetchUserChallenges error:", error);
      return [];
    }
    const rows = data || [];
    const challengeIds = Array.from(new Set(rows.map((r: any) => r.challenge_id).filter(Boolean)));
    let chMap = new Map<string, any>();
    if (challengeIds.length > 0) {
      const { data: chs, error: chErr } = await supabase
        .from("challenges")
        .select("*")
        .in("id", challengeIds);
      if (chErr) console.warn("[useChallenges] challenges fetch error:", chErr);
      (chs || []).forEach((c: any) => {
        chMap.set(c.id, {
          ...c,
          level: typeof c.level === "string" ? parseInt(c.level, 10) || 1 : c.level ?? 1,
        });
      });
    }
    return rows.map((uc: any) => ({
      ...uc,
      challenge: uc.challenge_id ? chMap.get(uc.challenge_id) ?? null : null,
    }));
  }, [user]);

  const joinCategoryLevel1 = useCallback(async (category: string, allChallenges: Challenge[]) => {
    if (!user) return;
    const lv1 = allChallenges.find((c) => (c.category_group ?? c.category) === category && c.level === 1);
    if (!lv1) return;
    const { data: existing } = await supabase.from("user_challenges").select("id").eq("user_id", user.id).eq("challenge_id", lv1.id).maybeSingle();
    if (!existing) await supabase.from("user_challenges").insert({ user_id: user.id, challenge_id: lv1.id } as any);
  }, [user]);

  /**
   * Compute progress for a given goal_type.
   * Summit-based types use summitClaims, journal-based types use journals.
   * Returns -1 when goal type is not auto-trackable here (skip update).
   */
  const computeProgress = (goalType: string, journals: any[], summitClaims: any[]): number => {
    switch (goalType) {
      case "mountain":
        // Total summit claim count (not distinct)
        return summitClaims.length;
      case "count":
        return summitClaims.length;
      case "monthly_count": {
        const now = new Date();
        return summitClaims.filter((sc: any) => {
          const d = new Date(sc.claimed_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
      }
      default:
        return -1;
    }
  };

  /**
   * Recalculate progress AND auto level-up.
   * For every category_group the user has joined, find the lowest incomplete level
   * and update its progress. If progress >= goal, mark complete and auto-insert next level.
   */
  const recalculateProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: journals }, { data: claims }] = await Promise.all([
        supabase.from("hiking_journals").select("*").eq("user_id", user.id),
        (supabase as any).from("summit_claims").select("*").eq("user_id", user.id).not("photo_url", "is", null),
      ]);
      const allJournals = journals || [];
      const allClaims = claims || [];

      // Get all of this user's user_challenges + their challenges
      const { data: ucRows } = await supabase
        .from("user_challenges")
        .select("id, challenge_id, progress, completed")
        .eq("user_id", user.id);
      if (!ucRows || ucRows.length === 0) return;

      const challengeIds = Array.from(new Set(ucRows.map((r: any) => r.challenge_id)));
      const { data: chRows } = await supabase
        .from("challenges")
        .select("id, category, category_group, level, goal_type, goal_value")
        .in("id", challengeIds);
      const chMap = new Map<string, any>();
      (chRows || []).forEach((c: any) => chMap.set(c.id, {
        ...c,
        level: typeof c.level === "string" ? parseInt(c.level, 10) || 1 : c.level ?? 1,
      }));

      // Group joined challenges by category_group
      const groupsJoined = new Map<string, any[]>();
      for (const uc of ucRows as any[]) {
        const ch = chMap.get(uc.challenge_id);
        if (!ch) continue;
        const key = ch.category_group ?? ch.category ?? "other";
        if (!groupsJoined.has(key)) groupsJoined.set(key, []);
        groupsJoined.get(key)!.push({ uc, ch });
      }

      // For each group, walk levels in order — update progress, complete, then insert next level
      for (const [groupKey, items] of groupsJoined.entries()) {
        // Fetch all challenge levels for this group (full ladder)
        const { data: ladder } = await supabase
          .from("challenges")
          .select("id, level, goal_type, goal_value, category, category_group")
          .or(`category_group.eq.${groupKey},category.eq.${groupKey}`)
          .order("level", { ascending: true });
        const ladderRows = (ladder || []).map((c: any) => ({
          ...c,
          level: typeof c.level === "string" ? parseInt(c.level, 10) || 1 : c.level ?? 1,
        })).sort((a: any, b: any) => a.level - b.level);

        // Process in order until we hit a non-completable level
        for (const rung of ladderRows) {
          const joinedItem = items.find((it) => it.ch.id === rung.id);
          if (!joinedItem) continue; // user hasn't reached this rung

          if (joinedItem.uc.completed) continue;

          const newProgress = computeProgress(rung.goal_type, allJournals, allClaims);
          if (newProgress < 0) continue;

          const completed = newProgress >= (rung.goal_value || 1);
          await supabase
            .from("user_challenges")
            .update({
              progress: newProgress,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            } as any)
            .eq("id", joinedItem.uc.id);

          if (completed) {
            // Auto-insert next level if exists
            const nextRung = ladderRows.find((r: any) => r.level === rung.level + 1);
            if (nextRung) {
              const { data: existsNext } = await supabase
                .from("user_challenges")
                .select("id")
                .eq("user_id", user.id)
                .eq("challenge_id", nextRung.id)
                .maybeSingle();
              if (!existsNext) {
                await supabase.from("user_challenges").insert({
                  user_id: user.id,
                  challenge_id: nextRung.id,
                } as any);
                // Add it to items so following loop iterations can update it too
                items.push({
                  uc: { id: "pending", challenge_id: nextRung.id, progress: 0, completed: false },
                  ch: nextRung,
                });
              }
            }
          }
        }
      }
    } finally { setLoading(false); }
  }, [user]);

  return { fetchAllChallenges, fetchUserChallenges, joinCategoryLevel1, recalculateProgress, loading };
}
