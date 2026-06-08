import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SharedCompletionData } from "@/hooks/useAchievementStore";

const inFlight = new Map<string, Promise<SharedCompletionData[]>>();
const cache = new Map<string, { ts: number; data: SharedCompletionData[] }>();
const TTL = 5 * 60 * 1000;

async function fetchCounts(userId: string): Promise<SharedCompletionData[]> {
  const existing = inFlight.get(userId);
  if (existing) return existing;
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const p = (async () => {
    try {
      const { data: myParts } = await supabase
        .from("shared_completion_participants")
        .select("shared_completion_id")
        .eq("user_id", userId);
      if (!myParts || myParts.length === 0) {
        cache.set(userId, { ts: Date.now(), data: [] });
        return [];
      }
      const scIds = myParts.map((p: any) => p.shared_completion_id);
      const { data: allParts } = await supabase
        .from("shared_completion_participants")
        .select("shared_completion_id")
        .in("shared_completion_id", scIds);
      if (!allParts) {
        cache.set(userId, { ts: Date.now(), data: [] });
        return [];
      }
      const countMap = new Map<string, number>();
      allParts.forEach((p: any) => {
        countMap.set(p.shared_completion_id, (countMap.get(p.shared_completion_id) || 0) + 1);
      });
      const result = Array.from(countMap.entries()).map(([id, count]) => ({ id, participant_count: count }));
      cache.set(userId, { ts: Date.now(), data: result });
      return result;
    } catch (e) {
      console.error("Failed to fetch shared completion counts:", e);
      return [];
    } finally {
      inFlight.delete(userId);
    }
  })();
  inFlight.set(userId, p);
  return p;
}

export function useSharedCompletionCounts(): SharedCompletionData[] {
  const { user } = useAuth();
  const [data, setData] = useState<SharedCompletionData[]>(() => {
    if (!user) return [];
    return cache.get(user.id)?.data ?? [];
  });

  useEffect(() => {
    if (!user) { setData([]); return; }
    let cancelled = false;
    fetchCounts(user.id).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [user?.id]);

  return data;
}
