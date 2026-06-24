import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotification } from "@/hooks/usePushNotification";

const SETTINGS_KEY = "notification_settings";

function isEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).journalEngagement !== false;
  } catch {}
  return true;
}

async function getNickname(userId: string) {
  const { data } = await supabase
    .from("public_profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as any)?.nickname || "누군가";
}

export function useJournalEngagementNotifications() {
  const { user } = useAuth();
  const { isGranted, sendLocalNotification } = usePushNotification();
  const isGrantedRef = useRef(isGranted);
  const sendRef = useRef(sendLocalNotification);

  isGrantedRef.current = isGranted;
  sendRef.current = sendLocalNotification;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`journal-engagement-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "journal_likes" }, async (payload) => {
        const row = payload.new as any;
        if (!isEnabled() || !isGrantedRef.current || row.user_id === user.id) return;

        const { data: journal } = await supabase
          .from("hiking_journals")
          .select("id, user_id")
          .eq("id", row.journal_id)
          .maybeSingle();
        if ((journal as any)?.user_id !== user.id) return;

        const nickname = await getNickname(row.user_id);
        sendRef.current("등산일지에 좋아요가 달렸어요", `${nickname}님이 내 일지를 좋아해요.`, {
          data: { route: `/journals/${row.journal_id}` },
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "journal_comments" }, async (payload) => {
        const row = payload.new as any;
        if (!isEnabled() || !isGrantedRef.current || row.user_id === user.id) return;

        const { data: journal } = await supabase
          .from("hiking_journals")
          .select("id, user_id")
          .eq("id", row.journal_id)
          .maybeSingle();
        if ((journal as any)?.user_id !== user.id) return;

        const nickname = await getNickname(row.user_id);
        const content = row.content ? String(row.content) : "새 댓글이 달렸어요.";
        sendRef.current("등산일지에 댓글이 달렸어요", `${nickname}: ${content.length > 40 ? `${content.slice(0, 40)}...` : content}`, {
          data: { route: `/journals/${row.journal_id}` },
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
