import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runAfterStartup } from "@/lib/idle";
import { deleteSummitClaimRecord } from "@/lib/summitClaimActions";

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

const LIVE_FEED_CACHE_KEY = "wandeung_live_summit_feed";
const LIVE_FEED_CACHE_TTL = 5 * 60 * 1000;

function readLiveFeedCache(): { claims: LiveSummitClaim[]; kingOfDay: MountainKingOfDay | null } | null {
  try {
    const raw = sessionStorage.getItem(LIVE_FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      claims: LiveSummitClaim[];
      kingOfDay: MountainKingOfDay | null;
    };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > LIVE_FEED_CACHE_TTL) return null;
    return { claims: parsed.claims || [], kingOfDay: parsed.kingOfDay || null };
  } catch {
    return null;
  }
}

function writeLiveFeedCache(claims: LiveSummitClaim[], kingOfDay: MountainKingOfDay | null) {
  try {
    sessionStorage.setItem(
      LIVE_FEED_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), claims, kingOfDay })
    );
  } catch {}
}

export function useLiveSummitFeed() {
  const cached = readLiveFeedCache();
  const hasCachedClaims = !!cached?.claims?.length;
  const hasCachedKing = !!cached?.kingOfDay;
  const [claims, setClaims] = useState<LiveSummitClaim[]>(cached?.claims || []);
  const [kingOfDay, setKingOfDay] = useState<MountainKingOfDay | null>(cached?.kingOfDay || null);
  const [loading, setLoading] = useState(false);

  const enrichClaims = useCallback(async (rawClaims: any[]): Promise<LiveSummitClaim[]> => {
    if (rawClaims.length === 0) return [];

    const userIds = [...new Set(rawClaims.map((c) => c.user_id))];
    const summitIds = [...new Set(rawClaims.map((c) => c.summit_id))];

    const [{ data: profiles }, { data: summits }] = await Promise.all([
      supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", userIds),
      (supabase as any).from("summits").select("id, summit_name").in("id", summitIds),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const summitMap = new Map((summits || []).map((s: any) => [s.id, s.summit_name]));

    return rawClaims.map((c) => ({
      ...c,
      summit_name: summitMap.get(c.summit_id) || null,
      nickname: profileMap.get(c.user_id)?.nickname || null,
      avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
    }));
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("summit_claims")
        .select("id, user_id, mountain_id, summit_id, photo_url, claimed_at")
        .not("photo_url", "is", null)
        .order("claimed_at", { ascending: false })
        .limit(5);

      const enriched = await enrichClaims((data as any[]) || []);
      setClaims(enriched);
    } catch (error) {
      console.warn("[useLiveSummitFeed] recent fetch failed", error);
      if (!hasCachedClaims) setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [hasCachedClaims, enrichClaims]);

  const fetchKingOfDay = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await (supabase as any)
        .from("summit_claims")
        .select("user_id")
        .not("photo_url", "is", null)
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
        .from("public_profiles")
        .select("user_id, nickname, avatar_url")
        .eq("user_id", topUser)
        .maybeSingle();

      const nextKing = {
        user_id: topUser,
        nickname: (profile as any)?.nickname || null,
        avatar_url: (profile as any)?.avatar_url || null,
        claim_count: topCount,
      };
      setKingOfDay(nextKing);
    } catch (error) {
      console.warn("[useLiveSummitFeed] king fetch failed", error);
      if (!hasCachedKing) setKingOfDay(null);
    }
  }, [hasCachedKing]);

  const deleteClaim = useCallback(async (claim: LiveSummitClaim, currentUserId?: string | null) => {
    await deleteSummitClaimRecord(claim, currentUserId);
    setClaims((prev) => {
      const next = prev.filter((item) => item.id !== claim.id);
      writeLiveFeedCache(next, kingOfDay);
      return next;
    });
    void fetchKingOfDay();
  }, [fetchKingOfDay, kingOfDay]);

  useEffect(() => {
    if (claims.length > 0 || kingOfDay) {
      writeLiveFeedCache(claims, kingOfDay);
    }
  }, [claims, kingOfDay]);

  useEffect(() => {
    let channel: any = null;
    let cancelled = false;

    const refreshVisibleData = async () => {
      if (cancelled) return;
      await Promise.all([fetchRecent(), fetchKingOfDay()]);
    };

    const setupRealtime = () => {
      if (cancelled) return;
      channel = supabase
        .channel("live-summit-claims")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "summit_claims" },
          async (payload) => {
            const newClaim = payload.new as any;
            if (!newClaim?.photo_url) return;
            const enriched = await enrichClaims([newClaim]);
            setClaims((prev) => [...enriched, ...prev].slice(0, 5));
            fetchKingOfDay();
          }
        )
        .subscribe();
    };

    const cancelRefresh = runAfterStartup(() => {
      void refreshVisibleData();
    }, cached ? 1200 : 300, 4000);
    const w = window as any;
    const handle = w.requestIdleCallback
      ? w.requestIdleCallback(setupRealtime, { timeout: 4000 })
      : window.setTimeout(setupRealtime, 1200);

    return () => {
      cancelled = true;
      cancelRefresh();
      if (w.cancelIdleCallback && typeof handle === "number") w.cancelIdleCallback(handle);
      else clearTimeout(handle as any);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchRecent, fetchKingOfDay, enrichClaims]);


  return { claims, kingOfDay, loading, deleteClaim, refresh: fetchRecent };
}
