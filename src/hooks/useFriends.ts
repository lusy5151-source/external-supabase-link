import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Friendship = Tables<"friendships">;
type Profile = Tables<"profiles">;

interface FriendWithProfile extends Friendship {
  friendProfile: Profile;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendWithProfile[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriendships = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      setError(null);
      const { data: friendships, error: fetchError } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

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
        ? await supabase.from("profiles").select("*").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const withProfiles = friendships
        .map((f) => {
          const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const friendProfile = profileMap.get(friendId);
          return friendProfile ? { ...f, friendProfile } : null;
        })
        .filter(Boolean) as FriendWithProfile[];

      setFriends(withProfiles.filter((f) => f.status === "accepted"));
      setPendingReceived(
        withProfiles.filter((f) => f.status === "pending" && f.addressee_id === user.id)
      );
      setPendingSent(
        withProfiles.filter((f) => f.status === "pending" && f.requester_id === user.id)
      );
    } catch (err) {
      console.error("Failed to fetch friendships:", err);
      setError("친구 목록을 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
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
    }
    return { error };
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (!error) fetchFriendships();
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
      .from("profiles")
      .select("*")
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
