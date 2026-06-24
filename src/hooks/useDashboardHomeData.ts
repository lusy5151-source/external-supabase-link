import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Character } from "@/components/CharacterAnimation";
import type { HikingJournal } from "@/hooks/useHikingJournals";
import { useChallenges, type Challenge, type UserChallenge } from "@/hooks/useChallenges";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";

type ActiveChallenge = UserChallenge & { ch: Challenge };

async function fetchPublicJournals(): Promise<HikingJournal[]> {
  const { data: journals } = await supabase
    .from("hiking_journals")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!journals || journals.length === 0) return [];

  const rows = journals as any[];
  const userIds = [...new Set(rows.map((journal) => journal.user_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("user_id, nickname, avatar_url")
    .in("user_id", userIds);

  const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
  const journalIds = rows.map((journal) => journal.id);
  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from("journal_likes").select("journal_id, user_id").in("journal_id", journalIds),
    supabase.from("journal_comments").select("journal_id").in("journal_id", journalIds),
  ]);

  const likeCounts = new Map<string, number>();
  (likes || []).forEach((like: any) => {
    likeCounts.set(like.journal_id, (likeCounts.get(like.journal_id) || 0) + 1);
  });

  const commentCounts = new Map<string, number>();
  (comments || []).forEach((comment: any) => {
    commentCounts.set(comment.journal_id, (commentCounts.get(comment.journal_id) || 0) + 1);
  });

  return rows.map((journal) => ({
    ...journal,
    profile: profileMap.get(journal.user_id) || null,
    like_count: likeCounts.get(journal.id) || 0,
    comment_count: commentCounts.get(journal.id) || 0,
  })) as HikingJournal[];
}

export function useDashboardHomeData() {
  const { user } = useAuth();
  const { fetchAllChallenges, fetchUserChallenges } = useChallenges();
  const { fetchSharedCompletions } = useSharedCompletions();
  const [recentJournals, setRecentJournals] = useState<HikingJournal[]>([]);
  const [recentCommunityPosts, setRecentCommunityPosts] = useState<any[]>([]);
  const [recentSharedCompletions, setRecentSharedCompletions] = useState<SharedCompletion[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [lastHikeDate, setLastHikeDate] = useState<string | null>(null);
  const [hasMagazinePosts, setHasMagazinePosts] = useState(false);
  const [characterId, setCharacterId] = useState<Character | null>(() => {
    try {
      return (localStorage.getItem("wandeung_character_id") as Character) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await (supabase as any)
        .from("magazine_posts")
        .select("id")
        .eq("is_published", true)
        .not("cover_image_url", "is", null)
        .limit(1);

      if (!cancelled) setHasMagazinePosts(!!data && data.length > 0);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadPrimaryData = useCallback(async () => {
    if (!user) {
      setRecentJournals([]);
      setRecentCommunityPosts([]);
      setRecentSharedCompletions([]);
      setActiveChallenges([]);
      setLastHikeDate(null);
      return;
    }

    fetchPublicJournals()
      .then(setRecentJournals)
      .catch(() => setRecentJournals([]));

    fetchSharedCompletions()
      .then((completions) => setRecentSharedCompletions(completions.slice(0, 3)))
      .catch(() => setRecentSharedCompletions([]));

    import("@/hooks/useCommunityPosts").then(({ fetchRecentCommunityPosts }) =>
      fetchRecentCommunityPosts(5, user.id)
        .then(setRecentCommunityPosts)
        .catch(() => setRecentCommunityPosts([]))
    );

    supabase
      .from("hiking_journals")
      .select("hiked_at")
      .eq("user_id", user.id)
      .order("hiked_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setLastHikeDate(data?.[0]?.hiked_at || null));

    (supabase as any)
      .from("profiles")
      .select("character_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data?.character_id) {
          setCharacterId(data.character_id as Character);
          try {
            localStorage.setItem("wandeung_character_id", data.character_id);
          } catch {}
        }
      });
  }, [fetchSharedCompletions, user]);

  useEffect(() => {
    loadPrimaryData();
  }, [loadPrimaryData]);

  useEffect(() => {
    if (!user) return;

    const deferredTimer = window.setTimeout(() => {
      Promise.all([fetchAllChallenges(), fetchUserChallenges()])
        .then(([allChallenges, userChallenges]) => {
          const active = userChallenges
            .filter((challenge) => !challenge.completed)
            .slice(0, 3)
            .map((challenge) => ({
              ...challenge,
              ch: allChallenges.find((item) => item.id === challenge.challenge_id)!,
            }))
            .filter((challenge) => challenge.ch);

          setActiveChallenges(active);
        })
        .catch(() => setActiveChallenges([]));
    }, 800);

    return () => window.clearTimeout(deferredTimer);
  }, [fetchAllChallenges, fetchUserChallenges, user]);

  return {
    activeChallenges,
    characterId,
    hasMagazinePosts,
    lastHikeDate,
    recentCommunityPosts,
    recentJournals,
    recentSharedCompletions,
  };
}
