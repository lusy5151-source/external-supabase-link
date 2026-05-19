import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getLevelInfo, type LevelInfo } from "@/lib/xp";

export interface UserXpState extends LevelInfo {
  loading: boolean;
  refresh: () => void;
}

/**
 * Reads the current user's xp + character_level from `profiles`
 * and returns derived level info (name, progress, remaining XP, etc).
 *
 * Auto-refreshes on `wandeung_xp_changed` window event so XP awards
 * elsewhere are reflected immediately.
 */
export function useUserXp(): UserXpState {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [storedLevel, setStoredLevel] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchXp = useCallback(async () => {
    if (!user) {
      setXp(0);
      setStoredLevel(undefined);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("profiles")
      .select("xp, character_level")
      .eq("user_id", user.id)
      .maybeSingle();
    setXp((data?.xp as number) ?? 0);
    setStoredLevel(data?.character_level ?? undefined);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchXp(); }, [fetchXp]);

  useEffect(() => {
    const onChange = () => fetchXp();
    window.addEventListener("wandeung_xp_changed", onChange);
    const onFocus = () => fetchXp();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("wandeung_xp_changed", onChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchXp]);

  const info = getLevelInfo(xp, storedLevel);
  return { ...info, loading, refresh: fetchXp };
}
