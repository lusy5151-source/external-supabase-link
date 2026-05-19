import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type XpSource = "summit" | "journal" | "challenge" | "friend";

const LEVEL_NAMES: Record<number, string> = {
  1: "새싹",
  2: "등린이",
  3: "등산러",
  4: "산악인",
  5: "프로산악인",
  6: "정복자",
};

export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Lv ${level}`;
}

// XP thresholds per level (matches Supabase calc_level)
// Lv1: 0+, Lv2: 200+, Lv3: 500+, Lv4: 1000+, Lv5: 2000+, Lv6: 4000+
export const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, 4000] as const;
export const MAX_LEVEL = 6;

export function calcLevel(xp: number): number {
  if (xp >= 4000) return 6;
  if (xp >= 2000) return 5;
  if (xp >= 1000) return 4;
  if (xp >= 500) return 3;
  if (xp >= 200) return 2;
  return 1;
}

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number; // === currentLevelMinXp when MAX
  xpIntoLevel: number;
  xpForNextLevel: number; // total xp range for current level
  xpRemaining: number; // to reach next level (0 if MAX)
  progressPct: number; // 0-100
  isMax: boolean;
}

export function getLevelInfo(xp: number, levelOverride?: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const level = levelOverride && levelOverride >= 1 && levelOverride <= MAX_LEVEL
    ? levelOverride
    : calcLevel(safeXp);
  const isMax = level >= MAX_LEVEL;
  const currentLevelMinXp = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelMinXp = isMax ? currentLevelMinXp : LEVEL_THRESHOLDS[level];
  const xpForNextLevel = Math.max(1, nextLevelMinXp - currentLevelMinXp);
  const xpIntoLevel = Math.max(0, safeXp - currentLevelMinXp);
  const xpRemaining = isMax ? 0 : Math.max(0, nextLevelMinXp - safeXp);
  const progressPct = isMax
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpForNextLevel) * 100)));
  return {
    level,
    name: levelName(level),
    xp: safeXp,
    currentLevelMinXp,
    nextLevelMinXp,
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining,
    progressPct,
    isMax,
  };
}

export interface AwardXpOptions {
  userId: string;
  amount: number;
  sourceType: XpSource;
  sourceId?: string | null;
  description?: string;
  silent?: boolean; // suppress XP gained toast (level-up toast still shown)
}

/**
 * Calls Supabase add_xp RPC. Shows level-up toast when leveled_up=true.
 * Safe: swallows errors so it never breaks the calling flow.
 */
export async function awardXp(opts: AwardXpOptions) {
  try {
    const { data, error } = await (supabase as any).rpc("add_xp", {
      p_user_id: opts.userId,
      p_amount: opts.amount,
      p_source_type: opts.sourceType,
      p_source_id: opts.sourceId ?? null,
      p_description: opts.description ?? null,
    });
    if (error) {
      console.error("[awardXp] error", error);
      return null;
    }
    const result = data as {
      old_level: number;
      new_level: number;
      leveled_up: boolean;
      xp_gained: number;
    } | null;

    if (result?.leveled_up) {
      toast.success(
        `🎉 레벨업! ${levelName(result.old_level)} → ${levelName(result.new_level)}`,
        { duration: 5000 },
      );
    }
    return result;
  } catch (e) {
    console.error("[awardXp] exception", e);
    return null;
  }
}
