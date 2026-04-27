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
  invitee_id: string;
  inviter_id: string | null;
  status: string;
  created_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
  group?: { id: string; name: string; description: string | null; avatar_url: string | null };
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

  const createGroup = async (params: { name: string; description?: string; is_public?: boolean; avatar_url?: string }) => {
    // Always resolve creator_id from supabase.auth (must equal auth.uid() for RLS)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      const err = { message: "로그인이 필요합니다", code: "NOT_AUTHENTICATED" };
      console.error("Group create aborted:", err);
      return { data: null, error: err };
    }

    const insertPayload = {
      name: params.name,
      description: params.description || null,
      creator_id: authUser.id, // ← must be auth.uid()
      avatar_url: params.avatar_url || null,
      is_public: params.is_public ?? true,
    };

    const { data, error } = await supabase
      .from("hiking_group")
      .insert(insertPayload as any)
      .select()
      .single();

    if (error) {
      console.error("Group create error:", JSON.stringify(error));
      return { data: null, error };
    }

    // DB trigger auto_add_creator_to_group adds the creator as admin automatically.
    fetchMyGroups();
    return { data: data as HikingGroup | null, error: null };
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
      .from("public_profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (members as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) || null }));
  };

  const sendInvite = async (groupId: string, inviteeUserId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: { message: "로그인이 필요합니다" } };
    const { error } = await (supabase as any)
      .from("group_invitations")
      .insert({
        group_id: groupId,
        inviter_id: authUser.id,   // ← auth.uid()
        invitee_id: inviteeUserId, // ← target user's auth ID
        status: "pending",
      });
    if (error) console.error("Invite error:", JSON.stringify(error));
    return { error };
  };

  const requestJoin = async (groupId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: { message: "로그인이 필요합니다" } };
    // Self-invite: inviter_id == invitee_id signals a join request (no type column in new schema)
    const { error } = await (supabase as any)
      .from("group_invitations")
      .insert({
        group_id: groupId,
        inviter_id: authUser.id,
        invitee_id: authUser.id,
        status: "pending",
      });
    if (error) console.error("Request join error:", JSON.stringify(error));
    return { error };
  };

  const fetchInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
    const { data } = await (supabase as any)
      .from("group_invitations")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "pending");
    if (!data || (data as any[]).length === 0) return [];
    const userIds = (data as any[]).map((d: any) => d.invitee_id);
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (data as any[]).map((inv: any) => ({ ...inv, profile: profileMap.get(inv.invitee_id) || null }));
  };

  const fetchMyInvitations = async (): Promise<GroupInvitation[]> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];
    const { data, error } = await (supabase as any)
      .from("group_invitations")
      .select("id, group_id, inviter_id, invitee_id, status, created_at")
      .eq("invitee_id", authUser.id)
      .neq("inviter_id", authUser.id) // exclude own join requests
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Fetch invitations error:", JSON.stringify(error));
      return [];
    }
    if (!data || (data as any[]).length === 0) return [];
    const groupIds = (data as any[]).map((d: any) => d.group_id);
    const inviterIds = (data as any[]).map((d: any) => d.inviter_id).filter(Boolean);
    const [{ data: groups }, { data: profiles }] = await Promise.all([
      supabase.from("hiking_group").select("id, name, description, avatar_url").in("id", groupIds),
      supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", inviterIds),
    ]);
    const groupMap = new Map((groups || []).map((g: any) => [g.id, g]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (data as any[]).map((inv: any) => ({
      ...inv,
      group: groupMap.get(inv.group_id) || null,
      profile: profileMap.get(inv.inviter_id) || null,
    }));
  };

  const respondToInvitation = async (invitationId: string, accept: boolean, groupId?: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: { message: "로그인이 필요합니다" } };
    const status = accept ? "accepted" : "rejected";
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status })
      .eq("id", invitationId)
      .eq("invitee_id", authUser.id);
    if (error) {
      console.error("Respond invitation error:", JSON.stringify(error));
      return { error };
    }
    // DB trigger handle_invitation_accepted auto-adds the user to group_members on accept.
    if (accept) fetchMyGroups();
    return { error: null };
  };

  const acceptJoinRequest = async (invitationId: string, _groupId: string, _userId: string) => {
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
    if (error) console.error("Accept join request error:", JSON.stringify(error));
    // DB trigger inserts the user into group_members
    return { error };
  };

  const rejectJoinRequest = async (invitationId: string) => {
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "rejected" })
      .eq("id", invitationId);
    if (error) console.error("Reject join request error:", JSON.stringify(error));
    return { error };
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    // Use profiles.user_id (must match auth.uid() for invitee_id)
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .ilike("nickname", `%${query}%`)
      .limit(10);
    if (error) console.error("Search users error:", JSON.stringify(error));
    return (data as any[]) || [];
  };

  return {
    myGroups, loading, fetchMyGroups, fetchPublicGroups, fetchGroupById,
    createGroup, updateGroup, deleteGroup, joinGroup, leaveGroup, removeMember,
    fetchGroupMembers, sendInvite, requestJoin, fetchInvitations, fetchMyInvitations,
    respondToInvitation, acceptJoinRequest, rejectJoinRequest, searchUsers,
  };
}
