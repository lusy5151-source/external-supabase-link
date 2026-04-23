import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SharedCompletion {
  id: string;
  plan_id: string | null;
  mountain_id: number;
  completed_at: string;
  group_id: string | null;
  created_by: string;
  created_at: string;
  participants?: SharedCompletionParticipant[];
}

export interface SharedCompletionParticipant {
  id: string;
  shared_completion_id: string;
  user_id: string;
  verified: boolean;
  verified_at: string | null;
  profile?: { nickname: string | null; avatar_url: string | null };
}

export function useSharedCompletions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchSharedCompletions = useCallback(async (mountainId?: number): Promise<SharedCompletion[]> => {
    try {
      let query = supabase.from("shared_completion").select("*").order("completed_at", { ascending: false });
      if (mountainId) query = query.eq("mountain_id", mountainId);
      const { data, error } = await query;
      if (error || !data || data.length === 0) return [];

      const ids = (data as any[]).map((d) => d.id);
      const { data: participants } = await supabase
        .from("shared_completion_participants")
        .select("*")
        .in("shared_completion_id", ids);

      const userIds = [...new Set((participants || []).map((p: any) => p.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("public_profiles).select("user_id, nickname, avatar_url").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const partMap = new Map<string, SharedCompletionParticipant[]>();
      (participants || []).forEach((p: any) => {
        const list = partMap.get(p.shared_completion_id) || [];
        list.push({ ...p, profile: profileMap.get(p.user_id) || null });
        partMap.set(p.shared_completion_id, list);
      });

      return (data as any[]).map((d) => ({
        ...d,
        participants: partMap.get(d.id) || [],
      }));
    } catch (e) {
      console.error("Failed to fetch shared completions:", e);
      return [];
    }
  }, []);

  const fetchMySharedCompletions = useCallback(async (): Promise<SharedCompletion[]> => {
    try {
      if (!user) return [];
      const { data: myParts } = await supabase
        .from("shared_completion_participants")
        .select("shared_completion_id")
        .eq("user_id", user.id);
      if (!myParts || myParts.length === 0) return [];
      const scIds = (myParts as any[]).map((p) => p.shared_completion_id);
      const { data } = await supabase
        .from("shared_completion")
        .select("*")
        .in("id", scIds)
        .order("completed_at", { ascending: false });
      return (data as any[]) || [];
    } catch (e) {
      console.error("Failed to fetch my shared completions:", e);
      return [];
    }
  }, [user]);

  const createSharedCompletion = async (params: {
    plan_id?: string;
    mountain_id: number;
    participant_user_ids: string[];
    group_id?: string;
  }) => {
    try {
      if (!user) return { error: { message: "Not authenticated" } };
      const { data: sc, error } = await supabase
        .from("shared_completion")
        .insert({
          plan_id: params.plan_id || null,
          mountain_id: params.mountain_id,
          group_id: params.group_id || null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error || !sc) return { error: error || { message: "Failed to create" } };

      const allUserIds = [...new Set([user.id, ...params.participant_user_ids])];
      const participantRows = allUserIds.map((uid) => ({
        shared_completion_id: (sc as any).id,
        user_id: uid,
        verified: uid === user.id,
        verified_at: uid === user.id ? new Date().toISOString() : null,
      }));
      await supabase.from("shared_completion_participants").insert(participantRows as any);
      return { data: sc as SharedCompletion, error: null };
    } catch (e) {
      console.error("Failed to create shared completion:", e);
      return { error: { message: "공동 완등 기록에 실패했습니다" } };
    }
  };

  const verifyCompletion = async (sharedCompletionId: string) => {
    try {
      if (!user) return { error: { message: "Not authenticated" } };
      const { error } = await supabase
        .from("shared_completion_participants")
        .update({ verified: true, verified_at: new Date().toISOString() } as any)
        .eq("shared_completion_id", sharedCompletionId)
        .eq("user_id", user.id);
      return { error };
    } catch (e) {
      return { error: { message: "확인에 실패했습니다" } };
    }
  };

  const isSharedCompleted = useCallback(async (mountainId: number): Promise<boolean> => {
    try {
      if (!user) return false;
      const { data: myParts } = await supabase
        .from("shared_completion_participants")
        .select("shared_completion_id")
        .eq("user_id", user.id);
      if (!myParts || myParts.length === 0) return false;
      const scIds = (myParts as any[]).map((p) => p.shared_completion_id);
      const { data } = await supabase
        .from("shared_completion")
        .select("id")
        .in("id", scIds)
        .eq("mountain_id", mountainId)
        .limit(1);
      return (data && data.length > 0) || false;
    } catch (e) {
      return false;
    }
  }, [user]);

  return {
    loading,
    fetchSharedCompletions,
    fetchMySharedCompletions,
    createSharedCompletion,
    verifyCompletion,
    isSharedCompleted,
  };
}
