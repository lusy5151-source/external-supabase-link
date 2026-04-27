import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  related_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    userIdRef.current = user.id;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error("Notifications fetch error:", JSON.stringify(error));
    const list = (data as AppNotification[]) || [];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      await fetchNotifications();
      if (cancelled || !userIdRef.current) return;

      const uniq = Math.random().toString(36).slice(2, 10);
      channel = supabase
        .channel(`notifications_realtime_${userIdRef.current}_${uniq}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          (payload) => {
            const n = payload.new as AppNotification;
            setNotifications((prev) => [n, ...prev]);
            if (!n.is_read) setUnreadCount((c) => c + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          () => {
            fetchNotifications();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          (payload) => {
            const oldId = (payload.old as any)?.id;
            if (oldId) {
              setNotifications((prev) => prev.filter((n) => n.id !== oldId));
            }
            fetchNotifications();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) console.error("markAllRead error:", JSON.stringify(error));
    await fetchNotifications();
  }, [fetchNotifications]);

  const deleteAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    if (error) console.error("deleteAll error:", JSON.stringify(error));
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const deleteOne = useCallback(async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) console.error("deleteOne error:", JSON.stringify(error));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => {
      const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
      return wasUnread ? Math.max(0, c - 1) : c;
    });
  }, [notifications]);

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (error) console.error("markRead error:", JSON.stringify(error));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAllRead,
    deleteAll,
    deleteOne,
    markRead,
  };
}
