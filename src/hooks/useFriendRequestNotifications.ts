import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotification } from "@/hooks/usePushNotification";

const SETTINGS_KEY = "notification_settings";

function isEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).friendRequests !== false;
  } catch {}
  return true;
}

async function getNickname(userId: string) {
  const { data } = await supabase
    .from("public_profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as any)?.nickname || "상대방";
}

export function useFriendRequestNotifications() {
  const { user } = useAuth();
  const { isGranted, sendLocalNotification } = usePushNotification();
  const isGrantedRef = useRef(isGranted);
  const sendRef = useRef(sendLocalNotification);

  isGrantedRef.current = isGranted;
  sendRef.current = sendLocalNotification;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`friend-request-notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friendships" }, async (payload) => {
        const row = payload.new as any;
        if (!isEnabled() || !isGrantedRef.current) return;
        if (row.addressee_id !== user.id || row.requester_id === user.id) return;

        const nickname = await getNickname(row.requester_id);
        sendRef.current("친구 신청이 도착했어요", `${nickname}님이 친구를 신청했어요.`, {
          data: { route: `/profile/${row.requester_id}` },
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "friendships" }, async (payload) => {
        const row = payload.new as any;
        const old = payload.old as any;
        if (!isEnabled() || !isGrantedRef.current) return;
        if (row.status !== "accepted" || old?.status === "accepted") return;
        if (row.requester_id !== user.id || row.addressee_id === user.id) return;

        const nickname = await getNickname(row.addressee_id);
        sendRef.current("친구 신청이 수락됐어요", `${nickname}님과 친구가 되었어요.`, {
          data: { route: `/profile/${row.addressee_id}` },
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
