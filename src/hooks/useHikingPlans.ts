import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HikingPlan { id: string; creator_id: string; mountain_id: number; trail_name: string | null; planned_date: string; start_time: string | null; notes: string | null; invite_code: string; status: string; group_id: string | null; is_public: boolean; meeting_location: string | null; created_at: string; updated_at: string; }
export interface PlanNotification { id: string; user_id: string; plan_id: string; type: string; message: string; is_read: boolean; created_at: string; }

export function useHikingPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<HikingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<PlanNotification[]>([]);

  const fetchPlans = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("hiking_plans").select("*").order("planned_date", { ascending: true });
    setPlans((data as HikingPlan[]) || []); setLoading(false);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("plan_notifications").select("*").eq("user_id", user.id).eq("is_read", false).order("created_at", { ascending: false });
    setNotifications((data as PlanNotification[]) || []);
  }, [user]);

  useEffect(() => { fetchPlans(); fetchNotifications(); }, [fetchPlans, fetchNotifications]);

  const createPlan = async (plan: any) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase.from("hiking_plans").insert({ ...plan, creator_id: user.id } as any).select().single();
    if (!error) fetchPlans();
    return { data: data as HikingPlan | null, error };
  };

  const markNotificationRead = async (notificationId: string) => {
    await supabase.from("plan_notifications").update({ is_read: true } as any).eq("id", notificationId);
    fetchNotifications();
  };

  const joinByCode = async (code: string) => {
    if (!user) return { error: { message: "Not authenticated" }, data: null };
    const { data: plan } = await supabase.from("hiking_plans").select("*").eq("invite_code", code).single();
    if (!plan) return { error: { message: "유효하지 않은 초대 코드입니다" }, data: null };
    const { error } = await supabase.from("plan_participants").insert({ plan_id: (plan as any).id, user_id: user.id } as any);
    if (!error) fetchPlans();
    return { data: plan as HikingPlan, error };
  };

  return { plans, loading, notifications, createPlan, markNotificationRead, joinByCode, refetch: fetchPlans };
}