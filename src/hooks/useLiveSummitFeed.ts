import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveSummitClaim {
  id: string;
  user_id: string;
  mountain_id: number;
  summit_id: string;
  photo_url: string;
  claimed_at: string;
  summit_name?: string;
  nickname?: string | null;
  avatar_url?: string | null;
}

export interface MountainKingOfDay {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  claim_count: number;
}

export function useLiveSummitFeed() {
  const [claims, setClaims] = useState<LiveSummitClaim[]>([]);
  const [kingOfDay, setKingOfDay] = useState<MountainKingOfDay | null>(null);
  const [loading, setLoading] = useState(true);

  const enrichClaims = useCallback(async (rawClaims: any[]): Promise<LiveSummitClaim[]> => {
    if (rawClaims.length === 0) return [];

    const userIds = [...new Set(rawClaims.map((c) => c.user_id))];
    const summitIds = [...new Set(rawClaims.map((c) => c.summit_id))];

    const [{ data: profiles }, { data: summits }] = await Promise.all([
      supabase.from("profiles").select("user_id, nickname, avatar_url").in("user_id", userIds),
      supabase.from("summits").select("id, summit_name").in("id", summitIds),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const summitMap = new Map((summits || []).map((s: any) => [s.id, s.summit_name]));

    return rawClaims.map((c) => ({
      ...c,
      summit_name: summitMap.get(c.summit_id) || "정상",
      nickname: profileMap.get(c.user_id)?.nickname || null,
      avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
    }));
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("summit_claims")
      .select("id, user_id, mountain_id, summit_id, photo_url, claimed_at")
      .order("claimed_at", { ascending: false })
      .limit(20);

    const enriched = await enrichClaims((data as any[]) || []);
    setClaims(enriched);
    setLoading(false);
  }, [enrichClaims]);

  const fetchKingOfDay = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("summit_claims")
      .select("user_id")
      .gte("claimed_at", todayStart.toISOString());

    if (!data || (data as any[]).length === 0) {
      setKingOfDay(null);
      return;
    }

    const counts = new Map<string, number>();
    (data as any[]).forEach((c) => {
      counts.set(c.user_id, (counts.get(c.user_id) || 0) + 1);
    });

    let topUser = "";
    let topCount = 0;
    counts.forEach((count, userId) => {
      if (count > topCount) {
        topUser = userId;
        topCount = count;
      }
    });

    if (!topUser) {
      setKingOfDay(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .eq("user_id", topUser)
      .single();

    setKingOfDay({
      user_id: topUser,
      nickname: (profile as any)?.nickname || null,
      avatar_url: (profile as any)?.avatar_url || null,
      claim_count: topCount,
    });
  }, []);

  useEffect(() => {
    fetchRecent();
    fetchKingOfDay();

    // Realtime subscription
    const channel = supabase
      .channel("live-summit-claims")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "summit_claims" },
        async (payload) => {
          const newClaim = payload.new as any;
          const enriched = await enrichClaims([newClaim]);
          setClaims((prev) => [...enriched, ...prev].slice(0, 20));
          fetchKingOfDay();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecent, fetchKingOfDay, enrichClaims]);

  return { claims, kingOfDay, loading };
}
