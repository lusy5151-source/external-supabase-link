import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { awardXp } from "@/lib/xp";
import { sendServerPush } from "@/lib/serverPush";

type Friendship = Tables<"friendships">;
type PublicProfile = Pick<
  Tables<"profiles">,
  "user_id" | "nickname" | "avatar_url" | "bio" | "location" | "hiking_styles" | "is_active" | "created_at" | "updated_at"
>;

interface FriendWithProfile extends Friendship {
  friendProfile: PublicProfile;
}

const FRIENDS_CACHE_TTL = 5 * 60 * 1000;
const cacheKey = (userId: string) => `friends_cache_${userId}`;

function readFriendsCache(userId: string) {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      friends: FriendWithProfile[];
      pendingReceived: FriendWithProfile[];
      pendingSent: FriendWithProfile[];
    };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > FRIENDS_CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFriendsCache(userId: string, data: {
  friends: FriendWithProfile[];
  pendingReceived: FriendWithProfile[];
  pendingSent: FriendWithProfile[];
}) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {}
}

export function useFriends() {
  const { user } = useAuth();
  const cached = user?.id ? readFriendsCache(user.id) : null;
  const [friends, setFriends] = useState<FriendWithProfile[]>(cached?.friends || []);
  const [pendingReceived, setPendingReceived] = useState<FriendWithProfile[]>(cached?.pendingReceived || []);
  const [pendingSent, setPendingSent] = useState<FriendWithProfile[]>(cached?.pendingSent || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const fetchFriendships = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      setError(null);
      const { data: friendships, error: fetchError } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;
      if (!friendships) { setLoading(false); return; }

      // Get all unique user IDs that aren't the current user
      const userIds = [
        ...new Set(
          friendships.map((f) =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          )
        ),
      ];

      const { data: profiles } = userIds.length > 0
        ? await supabase.from("public_profiles").select("user_id, nickname, avatar_url, bio, location, hiking_styles, is_active, created_at, updated_at").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const withProfiles = friendships
        .map((f) => {
          const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const friendProfile = profileMap.get(friendId);
          return friendProfile ? { ...f, friendProfile } : null;
        })
        .filter(Boolean) as FriendWithProfile[];

      const nextFriends = withProfiles.filter((f) => f.status === "accepted");
      const nextPendingReceived = withProfiles.filter((f) => f.status === "pending" && f.addressee_id === user.id);
      const nextPendingSent = withProfiles.filter((f) => f.status === "pending" && f.requester_id === user.id);

      setFriends(nextFriends);
      setPendingReceived(nextPendingReceived);
      setPendingSent(nextPendingSent);
      writeFriendsCache(user.id, {
        friends: nextFriends,
        pendingReceived: nextPendingReceived,
        pendingSent: nextPendingSent,
      });
    } catch (err) {
      console.error("Failed to fetch friendships:", err);
      setError("친구 목록을 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      const nextCached = readFriendsCache(user.id);
      if (nextCached) {
        setFriends(nextCached.friends || []);
        setPendingReceived(nextCached.pendingReceived || []);
        setPendingSent(nextCached.pendingSent || []);
        setLoading(false);
      }
    }
    fetchFriendships();
  }, [fetchFriendships]);

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
    });
    if (error) {
      console.error("Failed to send friend request:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } else {
      fetchFriendships();
      void (async () => {
        const { data: profile } = await supabase
          .from("public_profiles")
          .select("nickname")
          .eq("user_id", user.id)
          .maybeSingle();
        await sendServerPush({
          userId: addresseeId,
          title: "친구 신청이 도착했어요",
          body: `${(profile as any)?.nickname || "누군가"}님이 친구를 신청했어요.`,
          data: { route: `/profile/${user.id}`, url: `/profile/${user.id}` },
        });
      })();
    }
    return { error };
  };

  const acceptRequest = async (friendshipId: string) => {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("id", friendshipId)
      .maybeSingle();
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (!error) {
      const requesterId = (friendship as any)?.requester_id;
      if (user?.id && requesterId && requesterId !== user.id) {
        void (async () => {
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("nickname")
            .eq("user_id", user.id)
            .maybeSingle();
          await sendServerPush({
            userId: requesterId,
            title: "친구 신청이 수락됐어요",
            body: `${(profile as any)?.nickname || "상대방"}님과 친구가 되었어요.`,
            data: { route: `/profile/${user.id}`, url: `/profile/${user.id}` },
          });
        })();
      }
      fetchFriendships();
      // XP: +10 friend accept (award to current user)
      if (user?.id) {
        try {
          await awardXp({
            userId: user.id,
            amount: 10,
            sourceType: "friend",
            sourceId: friendshipId,
            description: "친구 요청 수락",
          });
        } catch (e) { console.error("[awardXp friend] failed", e); }
      }
    }
    return { error };
  };

  const declineRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);
    if (!error) fetchFriendships();
    return { error };
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);
    if (!error) fetchFriendships();
    return { error };
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return [];
    const { data } = await supabase
      .from("public_profiles")
      .select("user_id, nickname, avatar_url, bio, location, hiking_styles, is_active, created_at, updated_at")
      .neq("user_id", user.id)
      .ilike("nickname", `%${query}%`)
      .limit(10);
    return data || [];
  };

  return {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    searchUsers,
    refetch: fetchFriendships,
  };
}
