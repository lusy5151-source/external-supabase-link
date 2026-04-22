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

  // Calculate initial unread count across all clubs
  useEffect(() => {
    if (!user) { setUnreadChatCount(0); setFriendActivityUnread(0); return; }

    const calcAllUnread = async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      if (!memberships || memberships.length === 0) return;

      const clubIds = memberships.map((m) => m.group_id);

      const { data: reads } = await (supabase as any)
        .from("message_reads")
        .select("club_id, last_read_at")
        .eq("user_id", user.id)
        .in("club_id", clubIds);

      const readMap = new Map<string, string>();
      ((reads as any[]) || []).forEach((r: any) => {
        readMap.set(r.club_id, r.last_read_at);
      });

      let total = 0;
      for (const clubId of clubIds) {
        const lastRead = readMap.get(clubId);
        let query = (supabase as any)
          .from("club_messages")
          .select("id", { count: "exact", head: true })
          .eq("club_id", clubId)
          .neq("user_id", user.id);
        if (lastRead) {
          query = query.gt("created_at", lastRead);
        }
        const { count } = await query;
        total += count || 0;
      }
      setUnreadChatCount(total);
    };

    calcAllUnread();
  }, [user]);

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
