import { supabase } from "@/integrations/supabase/client";

/**
 * Recompute progress for all of a user's joined `user_challenges`
 * by combining `summit_claims` + `hiking_journals` as the data sources.
 *
 * Safe to call from any post-action hook (summit claim, journal create,
 * mountain completion toggle).
 */
export async function updateChallengeProgress(userId: string | null | undefined) {
  if (!userId) return;

  try {
    const [{ data: ucRows }, { data: journals }, { data: claims }] = await Promise.all([
      supabase
        .from("user_challenges")
        .select("id, challenge_id, progress, completed")
        .eq("user_id", userId),
      supabase.from("hiking_journals").select("id, mountain_id, hiked_at, tagged_friends").eq("user_id", userId),
      (supabase as any)
        .from("summit_claims")
        .select("id, mountain_id, claimed_at")
        .eq("user_id", userId),
    ]);

    if (!ucRows || ucRows.length === 0) return;

    const allJournals = (journals as any[]) || [];
    const allClaims = (claims as any[]) || [];

    const challengeIds = Array.from(new Set(ucRows.map((r: any) => r.challenge_id)));
    if (challengeIds.length === 0) return;

    const { data: chRows } = await supabase
      .from("challenges")
      .select("id, goal_type, goal_value")
      .in("id", challengeIds);
    const chMap = new Map<string, any>();
    (chRows || []).forEach((c: any) => chMap.set(c.id, c));

    // Pre-fetch mountain meta for elevation / classification goals
    const mountainIds = Array.from(
      new Set([
        ...allClaims.map((c) => c.mountain_id),
        ...allJournals.map((j) => j.mountain_id),
      ].filter((v) => v != null))
    );
    let mtMap = new Map<number, any>();
    if (mountainIds.length > 0) {
      const { data: mts } = await supabase
        .from("mountains")
        .select("id, height, is_bac100, is_bac100_blackyak, is_national_park")
        .in("id", mountainIds as number[]);
      (mts || []).forEach((m: any) => mtMap.set(m.id, m));
    }

    // Combined unique mountain ids (claimed OR journaled = "completed")
    const completedMountainIds = new Set<number>();
    allClaims.forEach((c) => c.mountain_id != null && completedMountainIds.add(c.mountain_id));
    allJournals.forEach((j) => j.mountain_id != null && completedMountainIds.add(j.mountain_id));

    const computeProgress = (goalType: string): number => {
      const now = new Date();
      switch (goalType) {
        case "mountain":
          return completedMountainIds.size;
        case "count":
          // Total events (claims + journals)
          return allClaims.length + allJournals.length;
        case "bac100":
          return Array.from(completedMountainIds).filter((id) => mtMap.get(id)?.is_bac100_blackyak || mtMap.get(id)?.is_bac100).length;
        case "national_park":
          return Array.from(completedMountainIds).filter((id) => mtMap.get(id)?.is_national_park).length;
        case "single_elevation":
          return Array.from(completedMountainIds).reduce((max, id) => Math.max(max, mtMap.get(id)?.height || 0), 0);
        case "elevation_total":
          return Array.from(completedMountainIds).reduce((sum, id) => sum + (mtMap.get(id)?.height || 0), 0);
        case "monthly_count": {
          const claimsThisMonth = allClaims.filter((c: any) => {
            const d = new Date(c.claimed_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length;
          const journalsThisMonth = allJournals.filter((j: any) => {
            const d = new Date(j.hiked_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length;
          return claimsThisMonth + journalsThisMonth;
        }
        case "group_count":
          return allJournals.filter((j: any) => j.tagged_friends && j.tagged_friends.length > 0).length;
        default:
          return -1;
      }
    };

    for (const uc of ucRows as any[]) {
      if (uc.completed) continue;
      const ch = chMap.get(uc.challenge_id);
      if (!ch) continue;

      const newProgress = computeProgress(ch.goal_type);
      if (newProgress < 0) continue;

      const completed = newProgress >= (ch.goal_value || 1);
      await supabase
        .from("user_challenges")
        .update({
          progress: newProgress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        } as any)
        .eq("id", uc.id);
    }
  } catch (e) {
    console.error("[updateChallengeProgress] failed", e);
  }
}
