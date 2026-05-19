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
