import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UnreadChatContextType {
  unreadChatCount: number;
  increment: () => void;
  reset: () => void;
}

const UnreadChatContext = createContext<UnreadChatContextType>({
  unreadChatCount: 0,
  increment: () => {},
  reset: () => {},
});

export const useUnreadChat = () => useContext(UnreadChatContext);

export const UnreadChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const increment = useCallback(() => setUnreadChatCount((c) => c + 1), []);
  const reset = useCallback(() => setUnreadChatCount(0), []);

  // Calculate initial unread count across all clubs
  useEffect(() => {
    if (!user) { setUnreadChatCount(0); return; }

    const calcAllUnread = async () => {
      // Get clubs user belongs to
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      if (!memberships || memberships.length === 0) return;

      const clubIds = memberships.map((m) => m.group_id);

      // Get user's last read times
      const { data: reads } = await (supabase as any)
        .from("message_reads")
        .select("club_id, last_read_at")
        .eq("user_id", user.id)
        .in("club_id", clubIds);

      const readMap = new Map<string, string>();
      ((reads as any[]) || []).forEach((r: any) => {
        readMap.set(r.club_id, r.last_read_at);
      });

      // Count unread messages across all clubs
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

  // Listen for new messages in real-time across all clubs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-chat-unread")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "club_messages",
      }, (payload) => {
        const newMsg = payload.new as any;
        // Only increment if the message is from someone else
        if (newMsg.user_id !== user.id) {
          setUnreadChatCount((c) => c + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <UnreadChatContext.Provider value={{ unreadChatCount, increment, reset }}>
      {children}
    </UnreadChatContext.Provider>
  );
};
