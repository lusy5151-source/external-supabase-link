import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { badges, BadgeDefinition, EarnedBadge } from "@/data/badges";
import type { CompletionRecord } from "@/hooks/useMountainStore";
import type { GearItem } from "@/hooks/useGearStore";

const STORAGE_KEY = "korea-100-badges";
const FEATURED_KEY = "korea-100-featured-badge";
export interface SharedCompletionData { id: string; participant_count: number; }
function loadEarned(): EarnedBadge[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveEarned(earned: EarnedBadge[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(earned)); }
function getSeason(date: Date): string { const m = date.getMonth(); if (m >= 2 && m <= 4) return "spring"; if (m >= 5 && m <= 7) return "summer"; if (m >= 8 && m <= 10) return "autumn"; return "winter"; }

export function useAchievementStore(records: CompletionRecord[], gearItems: GearItem[], sharedCompletions: SharedCompletionData[] = []) {
  const [earned, setEarned] = useState<EarnedBadge[]>(loadEarned);
  const [featuredBadgeId, setFeaturedBadgeId] = useState<string | null>(() => localStorage.getItem(FEATURED_KEY));
  const [newlyEarned, setNewlyEarned] = useState<BadgeDefinition | null>(null);
  useEffect(() => { saveEarned(earned); }, [earned]);
  useEffect(() => { if (featuredBadgeId) localStorage.setItem(FEATURED_KEY, featuredBadgeId); else localStorage.removeItem(FEATURED_KEY); }, [featuredBadgeId]);
  const isEarned = useCallback((badgeId: string) => earned.some((e) => e.badgeId === badgeId), [earned]);
  const earnBadge = useCallback(async (badgeId: string) => {
    if (earned.some((e) => e.badgeId === badgeId)) return;
    setEarned((prev) => { if (prev.some((e) => e.badgeId === badgeId)) return prev; return [...prev, { badgeId, earnedAt: new Date().toISOString() }]; });
    const badge = badges.find((b) => b.id === badgeId);
    if (badge) setNewlyEarned(badge);
  }, [earned]);
  const dismissNewBadge = useCallback(() => setNewlyEarned(null), []);
  const setFeatured = useCallback((id: string | null) => setFeaturedBadgeId(id), []);
  const checkBadges = useCallback(() => {
    const count = records.length;
    const maxSharedParticipants = sharedCompletions.length > 0 ? Math.max(...sharedCompletions.map((sc) => sc.participant_count)) : 0;
    badges.forEach((badge) => {
      if (isEarned(badge.id)) return;
      const { condition } = badge; let unlocked = false;
      switch (condition.type) {
        case "completedCount": unlocked = count >= (condition.value || 0); break;
        case "specificMountain": unlocked = records.some((r) => r.mountainId === condition.mountainId); break;
        case "weather": unlocked = records.some((r) => r.weather === condition.weatherCondition); break;
        case "firstAction": if (condition.actionType === "journal") unlocked = records.some((r) => r.notes && r.notes.trim().length > 0); else if (condition.actionType === "photo") unlocked = records.some((r) => r.photos && r.photos.length > 0); else if (condition.actionType === "gear") unlocked = gearItems.length > 0; break;
        case "seasonal": unlocked = records.some((r) => getSeason(new Date(r.completedAt)) === condition.season); break;
        case "sharedParticipants": unlocked = maxSharedParticipants >= (condition.value || 0); break;
      }
      if (unlocked) earnBadge(badge.id);
    });
  }, [records, gearItems, sharedCompletions, isEarned, earnBadge]);
  useEffect(() => { checkBadges(); }, [checkBadges]);
  const earnedBadges = useMemo(() => earned.map((e) => ({ ...e, badge: badges.find((b) => b.id === e.badgeId) })).filter((e) => e.badge), [earned]);
  const featuredBadge = useMemo(() => (featuredBadgeId ? badges.find((b) => b.id === featuredBadgeId) : null), [featuredBadgeId]);
  return { earned, earnedBadges, isEarned, newlyEarned, dismissNewBadge, featuredBadge, featuredBadgeId, setFeatured, totalBadges: badges.length, earnedCount: earned.length };
}