import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GroupNotification {
  id: string;
  user_id: string;
  type: string;
  related_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReceivedInvitation {
  id: string; // group_invitations.id
  group_id: string;
  status: string;
  created_at: string;
  hiking_group: {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
  } | null;
  inviter: { nickname: string | null; avatar_url: string | null } | null;
  notification_id?: string | null;
}

export function useGroupNotifications() {
  const [invitations, setInvitations] = useState<ReceivedInvitation[]>([]);
  const [notifications, setNotifications] = useState<GroupNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setInvitations([]);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // 1. pending invitations where I'm the invitee (and not a self-join-request)
    const { data: invs, error: invErr } = await (supabase as any)
      .from("group_invitations")
      .select("id, group_id, inviter_id, invitee_id, status, created_at")
      .eq("invitee_id", user.id)
      .neq("inviter_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (invErr) console.error("Invitations fetch error:", JSON.stringify(invErr));

    let enriched: ReceivedInvitation[] = [];
    if (invs && invs.length > 0) {
      const groupIds = invs.map((i: any) => i.group_id);
      const inviterIds = invs.map((i: any) => i.inviter_id).filter(Boolean);
      const [{ data: groups }, { data: profiles }] = await Promise.all([
        supabase.from("hiking_group").select("id, name, description, avatar_url").in("id", groupIds),
        supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", inviterIds),
      ]);
      const gMap = new Map((groups || []).map((g: any) => [g.id, g]));
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      enriched = (invs as any[]).map((i) => ({
        id: i.id,
        group_id: i.group_id,
        status: i.status,
        created_at: i.created_at,
        hiking_group: gMap.get(i.group_id) || null,
        inviter: pMap.get(i.inviter_id) || null,
      }));
    }

    // 2. notifications for this user
    const { data: notifs, error: nErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (nErr) console.error("Notifications fetch error:", JSON.stringify(nErr));

    const nList = (notifs as GroupNotification[]) || [];

    // Link notification id to invitation id
    const notifByRelated = new Map<string, string>();
    nList
      .filter((n) => n.type === "group_invitation" && n.related_id)
      .forEach((n) => notifByRelated.set(n.related_id as string, n.id));
    enriched = enriched.map((inv) => ({
      ...inv,
      notification_id: notifByRelated.get(inv.id) || null,
    }));

    setInvitations(enriched);
    setNotifications(nList);
    setUnreadCount(nList.filter((n) => !n.is_read).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const accept = async (invitationId: string, notificationId?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "로그인이 필요합니다" } };

    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId)
      .eq("invitee_id", user.id);
    if (error) {
      console.error("Accept invitation error:", JSON.stringify(error));
      return { error };
    }
    if (notificationId) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    }
    await fetchAll();
    return { error: null };
  };

  const reject = async (invitationId: string, notificationId?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "로그인이 필요합니다" } };

    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "rejected" })
      .eq("id", invitationId)
      .eq("invitee_id", user.id);
    if (error) {
      console.error("Reject invitation error:", JSON.stringify(error));
      return { error };
    }
    if (notificationId) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    }
    await fetchAll();
    return { error: null };
  };

  const markRead = async (notificationId: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    await fetchAll();
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    await fetchAll();
  };

  return { invitations, notifications, unreadCount, loading, refresh: fetchAll, accept, reject, markRead, markAllRead };
}
