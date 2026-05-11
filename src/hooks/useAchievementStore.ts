import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { badges, BadgeDefinition, EarnedBadge } from "@/data/badges";
import type { CompletionRecord } from "@/hooks/useMountainStore";
import type { GearItem } from "@/hooks/useGearStore";

const STORAGE_KEY = "korea-100-badges";
const FEATURED_KEY = "korea-100-featured-badge";
export interface SharedCompletionData { id: string; participant_count: number; }

interface JournalLite {
  mountain_id: number;
  notes: string | null;
  photos: string[] | null;
  hiked_at: string | null;
}

function loadEarned(): EarnedBadge[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveEarned(earned: EarnedBadge[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(earned)); }
function getSeason(date: Date): string {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

export function useAchievementStore(
  records: CompletionRecord[],
  gearItems: GearItem[],
  sharedCompletions: SharedCompletionData[] = []
) {
  const [earned, setEarned] = useState<EarnedBadge[]>(loadEarned);
  const [featuredBadgeId, setFeaturedBadgeId] = useState<string | null>(() => localStorage.getItem(FEATURED_KEY));
  const [newlyEarned, setNewlyEarned] = useState<BadgeDefinition | null>(null);
  const [claimedMountainIds, setClaimedMountainIds] = useState<Set<number>>(new Set());
  const [journals, setJournals] = useState<JournalLite[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch summit_claims, hiking_journals, and existing user_achievements
  const refetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: claims }, { data: js }, { data: ua }] = await Promise.all([
      (supabase as any).from("summit_claims").select("mountain_id").eq("user_id", user.id),
      (supabase as any).from("hiking_journals").select("mountain_id, notes, photos, hiked_at").eq("user_id", user.id),
      (supabase as any).from("user_achievements").select("badge_id, earned_at").eq("user_id", user.id),
    ]);

    if (claims) {
      const ids = new Set<number>((claims as any[]).map((c) => c.mountain_id).filter((v) => v != null));
      setClaimedMountainIds(ids);
    }
    if (js) setJournals(js as JournalLite[]);

    if (ua && (ua as any[]).length > 0) {
      const remote: EarnedBadge[] = (ua as any[]).map((r) => ({
        badgeId: r.badge_id,
        earnedAt: r.earned_at || new Date().toISOString(),
      }));
      setEarned((prev) => {
        const map = new Map<string, EarnedBadge>();
        [...prev, ...remote].forEach((e) => { if (!map.has(e.badgeId)) map.set(e.badgeId, e); });
        return Array.from(map.values());
      });
    }
  }, []);

  useEffect(() => {
    refetch();
    const onJournalChange = () => refetch();
    window.addEventListener("wandeung_journal_changed", onJournalChange);
    return () => window.removeEventListener("wandeung_journal_changed", onJournalChange);
  }, [refetch]);


  useEffect(() => { saveEarned(earned); }, [earned]);
  useEffect(() => {
    if (featuredBadgeId) localStorage.setItem(FEATURED_KEY, featuredBadgeId);
    else localStorage.removeItem(FEATURED_KEY);
  }, [featuredBadgeId]);

  const isEarned = useCallback((badgeId: string) => earned.some((e) => e.badgeId === badgeId), [earned]);

  const earnBadge = useCallback(async (badgeId: string) => {
    if (earned.some((e) => e.badgeId === badgeId)) return;
    const earnedAt = new Date().toISOString();
    setEarned((prev) => {
      if (prev.some((e) => e.badgeId === badgeId)) return prev;
      return [...prev, { badgeId, earnedAt }];
    });
    const badge = badges.find((b) => b.id === badgeId);
    if (badge) {
      setNewlyEarned(badge);
      // Toast notification
      try {
        const { toast } = await import("sonner");
        toast.success(`🏆 새 업적 달성! ${badge.name}`, { description: badge.description });
      } catch {}
    }
    // Persist to Supabase user_achievements (skip if no user)
    if (userId) {
      try {
        await (supabase as any)
          .from("user_achievements")
          .insert({ user_id: userId, badge_id: badgeId, earned_at: earnedAt } as any);
      } catch (e) {
        console.warn("user_achievements insert failed:", e);
      }
    }
  }, [earned, userId]);

  const dismissNewBadge = useCallback(() => setNewlyEarned(null), []);
  const setFeatured = useCallback((id: string | null) => setFeaturedBadgeId(id), []);

  const checkBadges = useCallback(() => {
    // Merge sources for completion count: localStorage records + summit_claims + hiking_journals
    const mergedIds = new Set<number>(claimedMountainIds);
    records.forEach((r) => mergedIds.add(r.mountainId));
    journals.forEach((j) => { if (j.mountain_id != null) mergedIds.add(j.mountain_id); });
    const count = Math.max(records.length, mergedIds.size);

    const hasJournalNotes =
      records.some((r) => r.notes && r.notes.trim().length > 0) ||
      journals.some((j) => j.notes && j.notes.trim().length > 0);
    const hasPhoto =
      records.some((r) => r.photos && r.photos.length > 0) ||
      journals.some((j) => j.photos && j.photos.length > 0);

    const maxSharedParticipants = sharedCompletions.length > 0
      ? Math.max(...sharedCompletions.map((sc) => sc.participant_count))
      : 0;

    badges.forEach((badge) => {
      if (isEarned(badge.id)) return;
      const { condition } = badge;
      let unlocked = false;
      switch (condition.type) {
        case "completedCount":
          unlocked = count >= (condition.value || 0);
          break;
        case "specificMountain":
          unlocked =
            records.some((r) => r.mountainId === condition.mountainId) ||
            (condition.mountainId != null && claimedMountainIds.has(condition.mountainId)) ||
            (condition.mountainId != null && journals.some((j) => j.mountain_id === condition.mountainId));
          break;
        case "weather":
          unlocked = records.some((r) => r.weather === condition.weatherCondition);
          break;
        case "firstAction":
          if (condition.actionType === "journal") unlocked = hasJournalNotes;
          else if (condition.actionType === "photo") unlocked = hasPhoto;
          else if (condition.actionType === "gear") unlocked = gearItems.length > 0;
          break;
        case "seasonal": {
          const fromRecords = records.some((r) => getSeason(new Date(r.completedAt)) === condition.season);
          const fromJournals = journals.some((j) => j.hiked_at && getSeason(new Date(j.hiked_at)) === condition.season);
          unlocked = fromRecords || fromJournals;
          break;
        }
        case "sharedParticipants":
          unlocked = maxSharedParticipants >= (condition.value || 0);
          break;
      }
      if (unlocked) earnBadge(badge.id);
    });
  }, [records, gearItems, sharedCompletions, claimedMountainIds, journals, isEarned, earnBadge]);

  useEffect(() => { checkBadges(); }, [checkBadges]);

  const earnedBadges = useMemo(
    () => earned.map((e) => ({ ...e, badge: badges.find((b) => b.id === e.badgeId) })).filter((e) => e.badge),
    [earned]
  );
  const featuredBadge = useMemo(
    () => (featuredBadgeId ? badges.find((b) => b.id === featuredBadgeId) : null),
    [featuredBadgeId]
  );

  return {
    earned,
    earnedBadges,
    isEarned,
    newlyEarned,
    dismissNewBadge,
    featuredBadge,
    featuredBadgeId,
    setFeatured,
    totalBadges: badges.length,
    earnedCount: earned.length,
    recheckAchievements: checkBadges,
  };
}
