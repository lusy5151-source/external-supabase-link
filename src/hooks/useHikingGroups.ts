import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HikingGroup {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  user_id: string;
  invited_by: string | null;
  type: string; // 'invite' | 'request'
  status: string; // 'pending' | 'accepted' | 'rejected'
  created_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
}

export function useHikingGroups() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<HikingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyGroups = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    if (!memberships || memberships.length === 0) {
      setMyGroups([]);
      setLoading(false);
      return;
    }
    const groupIds = (memberships as any[]).map((m) => m.group_id);
    const { data: groups } = await supabase
      .from("hiking_groups")
      .select("*")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    const { data: allMembers } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds);
    const countMap = new Map<string, number>();
    (allMembers || []).forEach((m: any) => {
      countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1);
    });

    setMyGroups(
      ((groups as any[]) || []).map((g) => ({ ...g, member_count: countMap.get(g.id) || 0 }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMyGroups(); }, [fetchMyGroups]);

  const fetchPublicGroups = async (): Promise<HikingGroup[]> => {
    const { data } = await supabase
      .from("hiking_groups")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as any[]) || [];
  };

  const fetchGroupById = async (groupId: string): Promise<HikingGroup | null> => {
    const { data } = await supabase
      .from("hiking_groups")
      .select("*")
      .eq("id", groupId)
      .single();
    return (data as any) || null;
  };

  const createGroup = async (params: { name: string; description?: string; is_public?: boolean }) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("hiking_groups")
      .insert({ ...params, creator_id: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error("Failed to create group:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    }
    if (!error && data) {
      await supabase.from("group_members").insert({
        group_id: (data as any).id,
        user_id: user.id,
        role: "admin",
      } as any);
      fetchMyGroups();
    }
    return { data: data as HikingGroup | null, error };
  };

  const deleteGroup = async (groupId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("hiking_groups")
      .delete()
      .eq("id", groupId);
    if (!error) fetchMyGroups();
    return { error };
  };

  const updateGroup = async (groupId: string, params: { name?: string; description?: string; is_public?: boolean }) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("hiking_groups")
      .update(params as any)
      .eq("id", groupId);
    if (!error) fetchMyGroups();
    return { error };
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: user.id, role: "member" } as any);
    if (!error) fetchMyGroups();
    return { error };
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    if (!error) fetchMyGroups();
    return { error };
  };

  const removeMember = async (groupId: string, userId: string) => {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    return { error };
  };

  const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    const { data: members } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);
    if (!members || members.length === 0) return [];
    const userIds = (members as any[]).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (members as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) || null }));
  };

  // Invitations / Join requests
  const sendInvite = async (groupId: string, userId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("group_invitations" as any)
      .insert({ group_id: groupId, user_id: userId, invited_by: user.id, type: "invite", status: "pending" });
    return { error };
  };

  const requestJoin = async (groupId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("group_invitations" as any)
      .insert({ group_id: groupId, user_id: user.id, type: "request", status: "pending" });
    return { error };
  };

  const fetchInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
    const { data } = await supabase
      .from("group_invitations" as any)
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "pending");
    if (!data || (data as any[]).length === 0) return [];
    const userIds = (data as any[]).map((d: any) => d.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (data as any[]).map((inv: any) => ({ ...inv, profile: profileMap.get(inv.user_id) || null }));
  };

  const fetchMyInvitations = async (): Promise<GroupInvitation[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from("group_invitations" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "invite")
      .eq("status", "pending");
    return (data as any[]) || [];
  };

  const respondToInvitation = async (invitationId: string, accept: boolean, groupId?: string) => {
    const status = accept ? "accepted" : "rejected";
    const { error } = await supabase
      .from("group_invitations" as any)
      .update({ status } as any)
      .eq("id", invitationId);
    if (!error && accept && groupId && user) {
      await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      } as any);
      fetchMyGroups();
    }
    return { error };
  };

  const acceptJoinRequest = async (invitationId: string, groupId: string, userId: string) => {
    const { error } = await supabase
      .from("group_invitations" as any)
      .update({ status: "accepted" } as any)
      .eq("id", invitationId);
    if (!error) {
      await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      } as any);
    }
    return { error };
  };

  const rejectJoinRequest = async (invitationId: string) => {
    const { error } = await supabase
      .from("group_invitations" as any)
      .update({ status: "rejected" } as any)
      .eq("id", invitationId);
    return { error };
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .ilike("nickname", `%${query}%`)
      .limit(10);
    return (data as any[]) || [];
  };

  return {
    myGroups,
    loading,
    fetchMyGroups,
    fetchPublicGroups,
    fetchGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
    removeMember,
    fetchGroupMembers,
    sendInvite,
    requestJoin,
    fetchInvitations,
    fetchMyInvitations,
    respondToInvitation,
    acceptJoinRequest,
    rejectJoinRequest,
    searchUsers,
  };
}
