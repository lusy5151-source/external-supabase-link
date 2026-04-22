import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotification } from "./usePushNotification";
import { toast } from "sonner";

const SETTINGS_KEY = "notification_settings";

function getChatNotifEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.clubChat !== false; // default true
    }
  } catch {}
  return true;
}

function saveChatNotifEnabled(enabled: boolean) {
  let settings: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = JSON.parse(raw);
  } catch {}
  settings.clubChat = enabled;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface UseClubChatNotificationsOptions {
  /** Currently active/viewing club chat ID — suppress notifications for this club */
  activeClubId?: string | null;
  /** Callback when a new unread message arrives (for badge increment) */
  onUnread?: () => void;
}

export function useClubChatNotifications({
  activeClubId,
  onUnread,
}: UseClubChatNotificationsOptions = {}) {
  const { user } = useAuth();
  const { isGranted, sendLocalNotification } = usePushNotification();

  const activeClubIdRef = useRef(activeClubId);
  activeClubIdRef.current = activeClubId;

  const onUnreadRef = useRef(onUnread);
  onUnreadRef.current = onUnread;

  const isGrantedRef = useRef(isGranted);
  isGrantedRef.current = isGranted;

  const sendRef = useRef(sendLocalNotification);
  sendRef.current = sendLocalNotification;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const clubIdsRef = useRef<string[]>([]);
  const clubNamesRef = useRef<Map<string, string>>(new Map());

  // Fetch club memberships and names
  const fetchClubs = useCallback(async (userId: string) => {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      clubIdsRef.current = [];
      return;
    }

    const ids = memberships.map((m) => m.group_id);
    clubIdsRef.current = ids;

    // Fetch club names for notification titles
    const { data: groups } = await supabase
      .from("hiking_group")
      .select("id, name")
      .in("id", ids);

    const nameMap = new Map<string, string>();
    (groups || []).forEach((g) => nameMap.set(g.id, g.name));
    clubNamesRef.current = nameMap;
  }, []);

  // Fetch sender nickname
  const fetchNickname = useCallback(async (userId: string): Promise<string> => {
    const { data } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("user_id", userId)
      .single();
    return data?.nickname || "멤버";
  }, []);

  const subscribe = useCallback(() => {
    if (!user || clubIdsRef.current.length === 0) return;

    // Clean up existing
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel("club_chat_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "club_messages" },
        async (payload) => {
          const msg = payload.new as any;

          // Skip own messages
          if (msg.user_id === user.id) return;

          // Skip if not in user's clubs
          if (!clubIdsRef.current.includes(msg.club_id)) return;

          // Skip if user is currently viewing this club's chat
          if (activeClubIdRef.current === msg.club_id) return;

          // Increment in-app badge
          onUnreadRef.current?.();

          // Send browser notification if enabled and permitted
          if (!getChatNotifEnabled()) return;
          if (!isGrantedRef.current) return;

          const clubName = clubNamesRef.current.get(msg.club_id) || "산악회";
          const nickname = await fetchNickname(msg.user_id);
          const content = msg.message
            ? msg.message.length > 50
              ? msg.message.slice(0, 50) + "..."
              : msg.message
            : "📷 사진을 보냈습니다";

          sendRef.current(`${clubName} 채팅 💬`, `${nickname}: ${content}`);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [user, fetchNickname]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Main effect: fetch clubs, then subscribe
  useEffect(() => {
    if (!user) {
      unsubscribe();
      return;
    }

    if (!getChatNotifEnabled()) return;

    let cancelled = false;

    (async () => {
      await fetchClubs(user.id);
      if (cancelled) return;
      subscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user, fetchClubs, subscribe, unsubscribe]);

  // Toggle setting
  const isChatNotifEnabled = getChatNotifEnabled();

  const setChatNotifEnabled = useCallback(
    (enabled: boolean) => {
      saveChatNotifEnabled(enabled);
      if (enabled) {
        if (user && clubIdsRef.current.length > 0) {
          subscribe();
        }
      } else {
        unsubscribe();
      }
    },
    [user, subscribe, unsubscribe]
  );

  return {
    isChatNotifEnabled,
    setChatNotifEnabled,
  };
}
