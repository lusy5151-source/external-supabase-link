import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChallenges, type Challenge, type UserChallenge } from "@/hooks/useChallenges";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import type { Character } from "@/components/CharacterAnimation";

type ActiveChallenge = UserChallenge & { ch: Challenge };

type DashboardHomeData = {
  recentCommunityPosts: any[];
  recentCommunityLoading: boolean;
  recentSharedCompletions: SharedCompletion[];
  activeChallenges: ActiveChallenge[];
  hasMagazinePosts: boolean;
  lastHikeDate: string | null;
  characterId: Character | null;
};

const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

function readCachedCharacter(): Character | null {
  try {
    return (localStorage.getItem("wandeung_character_id") as Character) || null;
  } catch {
    return null;
  }
}

function cacheKey(userId: string) {
  return `wandeung_dashboard_home:${userId}`;
}

function readDashboardCache(userId?: string | null): Partial<DashboardHomeData> | null {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; value: Partial<DashboardHomeData> };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > DASHBOARD_CACHE_TTL) return null;
    return parsed.value || null;
  } catch {
    return null;
  }
}

function writeDashboardCache(userId: string, patch: Partial<DashboardHomeData>) {
  try {
    const prev = readDashboardCache(userId) || {};
    sessionStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ savedAt: Date.now(), value: { ...prev, ...patch } })
    );
  } catch {}
}

export function useDashboardHomeData(userId?: string | null): DashboardHomeData {
  const { fetchAllChallenges, fetchUserChallenges } = useChallenges();
  const { fetchSharedCompletions } = useSharedCompletions();
  const cached = readDashboardCache(userId);

  const [recentCommunityPosts, setRecentCommunityPosts] = useState<any[]>(cached?.recentCommunityPosts || []);
  const [recentCommunityLoading, setRecentCommunityLoading] = useState(!cached?.recentCommunityPosts?.length && !!userId);
  const [recentSharedCompletions, setRecentSharedCompletions] = useState<SharedCompletion[]>(cached?.recentSharedCompletions || []);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>(cached?.activeChallenges || []);
  const [hasMagazinePosts, setHasMagazinePosts] = useState(cached?.hasMagazinePosts || false);
  const [lastHikeDate, setLastHikeDate] = useState<string | null>(cached?.lastHikeDate || null);
  const [characterId, setCharacterId] = useState<Character | null>(cached?.characterId || readCachedCharacter);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("magazine_posts")
        .select("id")
        .eq("is_published", true)
        .not("cover_image_url", "is", null)
        .limit(1);
      if (!cancelled) {
        const next = !!data && data.length > 0;
        setHasMagazinePosts(next);
        if (userId) writeDashboardCache(userId, { hasMagazinePosts: next });
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setRecentCommunityPosts([]);
      setRecentCommunityLoading(false);
      setRecentSharedCompletions([]);
      setActiveChallenges([]);
      setLastHikeDate(null);
      return;
    }

    const nextCached = readDashboardCache(userId);
    if (nextCached) {
      setRecentCommunityPosts(nextCached.recentCommunityPosts || []);
      setRecentSharedCompletions(nextCached.recentSharedCompletions || []);
      setActiveChallenges(nextCached.activeChallenges || []);
      setLastHikeDate(nextCached.lastHikeDate || null);
      if (typeof nextCached.hasMagazinePosts === "boolean") setHasMagazinePosts(nextCached.hasMagazinePosts);
      if (nextCached.characterId) setCharacterId(nextCached.characterId);
    }

    let cancelled = false;

    fetchSharedCompletions(undefined, 3).then((nextShared) => {
      if (cancelled) return;
      setRecentSharedCompletions(nextShared.slice(0, 3));
      writeDashboardCache(userId, {
        recentSharedCompletions: nextShared.slice(0, 3),
      });
    }).catch(() => {});

    setRecentCommunityLoading(!nextCached?.recentCommunityPosts?.length);
    import("@/hooks/useCommunityPosts")
      .then(({ fetchRecentCommunityPostPreviews }) => fetchRecentCommunityPostPreviews(3))
      .then((nextCommunity) => {
        if (cancelled) return;
        setRecentCommunityPosts(nextCommunity);
        setRecentCommunityLoading(false);
        writeDashboardCache(userId, { recentCommunityPosts: nextCommunity });
      })
      .catch((error) => {
        console.warn("[dashboard] recent community fetch failed", error);
        if (!cancelled) {
          setRecentCommunityLoading(false);
        }
      });

    const challengeTimer = window.setTimeout(() => {
      Promise.all([fetchAllChallenges(), fetchUserChallenges()])
        .then(([all, mine]) => {
          if (cancelled) return;
          const active = mine
            .filter((uc) => !uc.completed)
            .slice(0, 3)
            .map((uc) => ({ ...uc, ch: all.find((c) => c.id === uc.challenge_id)! }))
            .filter((uc) => uc.ch);
          setActiveChallenges(active);
          writeDashboardCache(userId, { activeChallenges: active });
        })
        .catch(() => {
          if (!cancelled) setActiveChallenges([]);
        });
    }, 800);

    const profileTimer = window.setTimeout(() => {
      Promise.allSettled([
        supabase
          .from("hiking_journals")
          .select("hiked_at")
          .eq("user_id", userId)
          .order("hiked_at", { ascending: false })
          .limit(1),
        (supabase as any)
          .from("profiles")
          .select("character_id")
          .eq("user_id", userId)
          .maybeSingle(),
      ]).then(([hikeResult, profileResult]) => {
        if (cancelled) return;
        if (hikeResult.status === "fulfilled") {
          const nextLastHikeDate = hikeResult.value.data?.[0]?.hiked_at || null;
          setLastHikeDate(nextLastHikeDate);
          writeDashboardCache(userId, { lastHikeDate: nextLastHikeDate });
        }
        if (profileResult.status === "fulfilled" && profileResult.value.data?.character_id) {
          const nextCharacterId = profileResult.value.data.character_id as Character;
          setCharacterId(nextCharacterId);
          writeDashboardCache(userId, { characterId: nextCharacterId });
          try {
            localStorage.setItem("wandeung_character_id", profileResult.value.data.character_id);
          } catch {}
        }
      });
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(challengeTimer);
      window.clearTimeout(profileTimer);
    };
  }, [userId, fetchSharedCompletions, fetchAllChallenges, fetchUserChallenges]);

  return {
    recentCommunityPosts,
    recentCommunityLoading,
    recentSharedCompletions,
    activeChallenges,
    hasMagazinePosts,
    lastHikeDate,
    characterId,
  };
}
