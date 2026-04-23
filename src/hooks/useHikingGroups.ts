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
  type: string;
  status: string;
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
    const groupIds = memberships.map((m) => m.group_id);
    const { data: groups } = await supabase
      .from("hiking_group")
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
      ((groups as any[]) || []).map((g: any) => ({ ...g, member_count: countMap.get(g.id) || 0 }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMyGroups(); }, [fetchMyGroups]);

  const fetchPublicGroups = async (): Promise<HikingGroup[]> => {
    const { data } = await supabase
      .from("hiking_group")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as any[]) || [];
  };

  const fetchGroupById = async (groupId: string): Promise<HikingGroup | null> => {
    const { data } = await supabase
      .from("hiking_group")
      .select("*")
      .eq("id", groupId)
      .single();
    return (data as any) || null;
  };

  const createGroup = async (params: { name: string; description?: string; is_public?: boolean }) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("hiking_group")
      .insert({ ...params, creator_id: user.id } as any)
      .select()
      .single();
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
      .from("hiking_group")
      .delete()
      .eq("id", groupId);
    if (!error) fetchMyGroups();
    return { error };
  };

  const updateGroup = async (groupId: string, params: { name?: string; description?: string; is_public?: boolean }) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("hiking_group")
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
      .from("public_profiles" as any)
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (members as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) || null }));
  };

  const sendInvite = async (groupId: string, userId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await (supabase as any)
      .from("group_invitations")
      .insert({ group_id: groupId, user_id: userId, invited_by: user.id, type: "invite", status: "pending" });
    return { error };
  };

  const requestJoin = async (groupId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await (supabase as any)
      .from("group_invitations")
      .insert({ group_id: groupId, user_id: user.id, type: "request", status: "pending" });
    return { error };
  };

  const fetchInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
    const { data } = await (supabase as any)
      .from("group_invitations")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "pending");
    if (!data || (data as any[]).length === 0) return [];
    const userIds = (data as any[]).map((d: any) => d.user_id);
    const { data: profiles } = await supabase
      .from("public_profiles" as any)
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (data as any[]).map((inv: any) => ({ ...inv, profile: profileMap.get(inv.user_id) || null }));
  };

  const fetchMyInvitations = async (): Promise<GroupInvitation[]> => {
    if (!user) return [];
    const { data } = await (supabase as any)
      .from("group_invitations")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "invite")
      .eq("status", "pending");
    return (data as any[]) || [];
  };

  const respondToInvitation = async (invitationId: string, accept: boolean, groupId?: string) => {
    const status = accept ? "accepted" : "rejected";
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status })
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
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "accepted" })
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
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "rejected" })
      .eq("id", invitationId);
    return { error };
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    const { data } = await supabase
      .from("public_profiles" as any)
      .select("user_id, nickname, avatar_url")
      .ilike("nickname", `%${query}%`)
      .limit(10);
    return (data as any[]) || [];
  };

  return {
    myGroups, loading, fetchMyGroups, fetchPublicGroups, fetchGroupById,
    createGroup, updateGroup, deleteGroup, joinGroup, leaveGroup, removeMember,
    fetchGroupMembers, sendInvite, requestJoin, fetchInvitations, fetchMyInvitations,
    respondToInvitation, acceptJoinRequest, rejectJoinRequest, searchUsers,
  };
}
