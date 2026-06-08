import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClubChatNotifications } from "@/hooks/useClubChatNotifications";
import { useFriendActivityNotifications } from "@/hooks/useFriendActivityNotifications";

interface UnreadChatContextType {
  unreadChatCount: number;
  increment: () => void;
  reset: () => void;
  activeClubId: string | null;
  setActiveClubId: (id: string | null) => void;
  isChatNotifEnabled: boolean;
  setChatNotifEnabled: (enabled: boolean) => void;
  // Friend activity
  friendActivityUnread: number;
  resetFriendActivityUnread: () => void;
  isFriendActivityEnabled: boolean;
  setFriendActivityEnabled: (enabled: boolean) => void;
}

const UnreadChatContext = createContext<UnreadChatContextType>({
  unreadChatCount: 0,
  increment: () => {},
  reset: () => {},
  activeClubId: null,
  setActiveClubId: () => {},
  isChatNotifEnabled: true,
  setChatNotifEnabled: () => {},
  friendActivityUnread: 0,
  resetFriendActivityUnread: () => {},
  isFriendActivityEnabled: true,
  setFriendActivityEnabled: () => {},
});

export const useUnreadChat = () => useContext(UnreadChatContext);

export const UnreadChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [friendActivityUnread, setFriendActivityUnread] = useState(0);
  const increment = useCallback(() => setUnreadChatCount((c) => c + 1), []);
  const reset = useCallback(() => setUnreadChatCount(0), []);
  const incrementFriendActivity = useCallback(() => setFriendActivityUnread((c) => c + 1), []);
  const resetFriendActivityUnread = useCallback(() => setFriendActivityUnread(0), []);

  // Club chat realtime notifications
  const { isChatNotifEnabled, setChatNotifEnabled } = useClubChatNotifications({
    activeClubId,
    onUnread: increment,
  });

  // Friend activity realtime notifications
  const { isFriendActivityEnabled, setFriendActivityEnabled } = useFriendActivityNotifications({
    onUnread: incrementFriendActivity,
  });

  // Calculate initial unread count across all clubs — deferred & batched
  useEffect(() => {
    if (!user) { setUnreadChatCount(0); setFriendActivityUnread(0); return; }

    let cancelled = false;
    const calcAllUnread = async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      if (cancelled || !memberships || memberships.length === 0) return;

      const clubIds = memberships.map((m) => m.group_id);

      const { data: reads } = await (supabase as any)
        .from("message_reads")
        .select("club_id, last_read_at")
        .eq("user_id", user.id)
        .in("club_id", clubIds);
      if (cancelled) return;

      const readMap = new Map<string, string>();
      ((reads as any[]) || []).forEach((r: any) => readMap.set(r.club_id, r.last_read_at));

      // Single query: fetch ids only of unread-eligible messages, then bucket client-side.
      const oldestRead = ((reads as any[]) || [])
        .map((r) => r.last_read_at)
        .sort()[0];
      let q = (supabase as any)
        .from("club_messages")
        .select("club_id, created_at, user_id")
        .in("club_id", clubIds)
        .neq("user_id", user.id);
      if (oldestRead) q = q.gt("created_at", oldestRead);
      const { data: msgs } = await q.limit(500);
      if (cancelled) return;

      let total = 0;
      ((msgs as any[]) || []).forEach((m) => {
        const lr = readMap.get(m.club_id);
        if (!lr || m.created_at > lr) total += 1;
      });
      // For clubs with no read row, count all messages not authored by user
      clubIds.forEach((cid) => {
        if (!readMap.has(cid)) {
          // already counted above (lr undefined)
        }
      });
      setUnreadChatCount(total);
    };

    const w = window as any;
    const handle = w.requestIdleCallback
      ? w.requestIdleCallback(() => calcAllUnread(), { timeout: 5000 })
      : window.setTimeout(calcAllUnread, 3000);

    return () => {
      cancelled = true;
      if (w.cancelIdleCallback && typeof handle === "number") w.cancelIdleCallback(handle);
      else clearTimeout(handle as any);
    };
  }, [user?.id]);


  return (
    <UnreadChatContext.Provider value={{
      unreadChatCount,
      increment,
      reset,
      activeClubId,
      setActiveClubId,
      isChatNotifEnabled,
      setChatNotifEnabled,
      friendActivityUnread,
      resetFriendActivityUnread,
      isFriendActivityEnabled,
      setFriendActivityEnabled,
    }}>
      {children}
    </UnreadChatContext.Provider>
  );
};
