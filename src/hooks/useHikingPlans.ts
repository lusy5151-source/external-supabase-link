import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HikingPlan {
  id: string;
  creator_id: string;
  mountain_id: number;
  trail_name: string | null;
  planned_date: string;
  start_time: string | null;
  notes: string | null;
  invite_code: string;
  status: string;
  group_id: string | null;
  is_public: boolean;
  meeting_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanParticipant {
  id: string;
  plan_id: string;
  user_id: string;
  rsvp_status: string;
  invited_at: string;
  responded_at: string | null;
  profile?: {
    nickname: string | null;
    avatar_url: string | null;
  };
}

export interface PlanNotification {
  id: string;
  user_id: string;
  plan_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PlanEditHistory {
  id: string;
  plan_id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profile?: {
    nickname: string | null;
  };
}

export function useHikingPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<HikingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<PlanNotification[]>([]);

  const fetchPlans = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("hiking_plans")
      .select("*")
      .order("planned_date", { ascending: true });
    setPlans((data as HikingPlan[]) || []);
    setLoading(false);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("plan_notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false });
    setNotifications((data as PlanNotification[]) || []);
  }, [user]);

  useEffect(() => {
    fetchPlans();
    fetchNotifications();
  }, [fetchPlans, fetchNotifications]);

  const createPlan = async (plan: {
    mountain_id: number;
    trail_name?: string;
    planned_date: string;
    start_time?: string;
    notes?: string;
    meeting_location?: string;
    is_public?: boolean;
    max_participants?: number;
  }) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("hiking_plans")
      .insert({ ...plan, creator_id: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error("Failed to create plan:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    }
    if (!error && data) {
      fetchPlans();
      // Send auto welcome message for plan chat
      const mt = (await import("@/data/mountains")).mountains.find((m) => m.id === plan.mountain_id);
      const mtName = mt?.nameKo || "등산";
      await supabase.from("plan_messages").insert({
        plan_id: (data as any).id,
        user_id: user.id,
        message: `📅 ${mtName} 등산 계획 채팅방이 생성되었어요!\n참가자들과 자유롭게 이야기해보세요 🏔`,
      } as any);
    }
    return { data: data as HikingPlan | null, error };
  };

  const updatePlan = async (planId: string, updates: Partial<HikingPlan>) => {
    const { error } = await supabase
      .from("hiking_plans")
      .update(updates as any)
      .eq("id", planId);
    if (!error) fetchPlans();
    return { error };
  };

  const updatePlanWithHistory = async (
    planId: string,
    updates: Partial<HikingPlan>,
    oldPlan: HikingPlan,
    fieldLabel: Record<string, string>
  ) => {
    if (!user) return { error: { message: "Not authenticated" } };

    // Record edit history
    const historyEntries = Object.entries(updates)
      .filter(([key]) => key in fieldLabel)
      .map(([key, value]) => ({
        plan_id: planId,
        user_id: user.id,
        field_name: fieldLabel[key] || key,
        old_value: String((oldPlan as any)[key] ?? ""),
        new_value: String(value ?? ""),
      }));

    const { error } = await supabase
      .from("hiking_plans")
      .update(updates as any)
      .eq("id", planId);

    if (!error && historyEntries.length > 0) {
      await supabase.from("plan_edit_history").insert(historyEntries as any);

      // Notify other participants about the update
      const { data: participants } = await supabase
        .from("plan_participants")
        .select("user_id")
        .eq("plan_id", planId);

      const plan = plans.find((p) => p.id === planId);
      const otherUsers = [
        ...(participants || []).map((p: any) => p.user_id),
        plan?.creator_id,
      ].filter((uid) => uid && uid !== user.id);

      const uniqueUsers = [...new Set(otherUsers)];
      if (uniqueUsers.length > 0) {
        const changedFields = historyEntries.map((h) => h.field_name).join(", ");
        await supabase.from("plan_notifications").insert(
          uniqueUsers.map((uid) => ({
            user_id: uid,
            plan_id: planId,
            type: "plan_update",
            message: `계획이 수정되었습니다: ${changedFields}`,
          })) as any
        );
      }
    }

    if (!error) fetchPlans();
    return { error };
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase
      .from("hiking_plans")
      .delete()
      .eq("id", planId);
    if (!error) fetchPlans();
    return { error };
  };

  const fetchParticipants = async (planId: string): Promise<PlanParticipant[]> => {
    const { data: participants } = await supabase
      .from("plan_participants")
      .select("*")
      .eq("plan_id", planId);
    if (!participants || participants.length === 0) return [];
    const userIds = participants.map((p: any) => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (participants as any[]).map((p) => ({
      ...p,
      profile: profileMap.get(p.user_id) || null,
    }));
  };

  const fetchEditHistory = async (planId: string): Promise<PlanEditHistory[]> => {
    const { data } = await supabase
      .from("plan_edit_history")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data || data.length === 0) return [];
    const userIds = [...new Set((data as any[]).map((d) => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (data as any[]).map((d) => ({
      ...d,
      profile: profileMap.get(d.user_id) || null,
    }));
  };

  const inviteFriend = async (planId: string, friendUserId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    // Insert participant with status=pending and invited_by
    const { error: partErr } = await supabase
      .from("plan_participants")
      .insert({
        plan_id: planId,
        user_id: friendUserId,
        status: "pending",
        rsvp_status: "pending",
        invited_by: user.id,
      } as any);
    if (partErr) return { error: partErr };

    const plan = plans.find((p) => p.id === planId);
    const { error } = await supabase.from("plan_notifications").insert({
      user_id: friendUserId,
      plan_id: planId,
      type: "invitation",
      message: `등산 계획에 초대되었습니다${plan ? ` (${plan.planned_date})` : ""}`,
    } as any);
    return { error };
  };

  const joinPlan = async (planId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("plan_participants")
      .insert({ plan_id: planId, user_id: user.id } as any);
    if (!error) fetchPlans();
    return { error };
  };

  const updateRsvp = async (planId: string, status: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("plan_participants")
      .update({ rsvp_status: status, responded_at: new Date().toISOString() } as any)
      .eq("plan_id", planId)
      .eq("user_id", user.id);

    if (!error) {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        const statusLabels: Record<string, string> = {
          going: "참석",
          interested: "관심",
          declined: "불참",
        };
        await supabase.from("plan_notifications").insert({
          user_id: plan.creator_id,
          plan_id: planId,
          type: "rsvp_change",
          message: `참가자가 "${statusLabels[status] || status}"(으)로 응답했습니다`,
        } as any);
      }
    }
    return { error };
  };

  const acceptInvitation = async (planId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    // Update existing participant record to accepted
    const { error: updateErr } = await supabase
      .from("plan_participants")
      .update({
        status: "accepted",
        rsvp_status: "going",
        responded_at: new Date().toISOString(),
      } as any)
      .eq("plan_id", planId)
      .eq("user_id", user.id);
    if (updateErr) return { error: updateErr };

    // Notify creator
    const { data: planData } = await supabase
      .from("hiking_plans")
      .select("creator_id")
      .eq("id", planId)
      .single();

    if (planData) {
      // Get current user's nickname
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("user_id", user.id)
        .single();
      const name = (profile as any)?.nickname || "누군가";
      await supabase.from("plan_notifications").insert({
        user_id: (planData as any).creator_id,
        plan_id: planId,
        type: "plan_accept",
        message: `${name}님이 등산 계획에 참여했습니다`,
      } as any);
    }

    fetchPlans();
    return { error: null };
  };

  const declineInvitation = async (planId: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    // Update existing participant record to rejected
    const { error: updateErr } = await supabase
      .from("plan_participants")
      .update({
        status: "rejected",
        rsvp_status: "declined",
        responded_at: new Date().toISOString(),
      } as any)
      .eq("plan_id", planId)
      .eq("user_id", user.id);
    if (updateErr) return { error: updateErr };

    fetchPlans();
    return { error: null };
  };

  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from("plan_notifications")
      .update({ is_read: true } as any)
      .eq("id", notificationId);
    fetchNotifications();
  };

  const joinByCode = async (code: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data: plan } = await supabase
      .from("hiking_plans")
      .select("*")
      .eq("invite_code", code)
      .single();
    if (!plan) return { error: { message: "유효하지 않은 초대 코드입니다" } };
    const { error } = await supabase
      .from("plan_participants")
      .insert({ plan_id: (plan as any).id, user_id: user.id } as any);
    if (!error) fetchPlans();
    return { data: plan as HikingPlan, error };
  };

  return {
    plans,
    loading,
    notifications,
    createPlan,
    updatePlan,
    updatePlanWithHistory,
    deletePlan,
    fetchParticipants,
    fetchEditHistory,
    inviteFriend,
    joinPlan,
    updateRsvp,
    acceptInvitation,
    declineInvitation,
    markNotificationRead,
    joinByCode,
    refetch: fetchPlans,
  };
}
