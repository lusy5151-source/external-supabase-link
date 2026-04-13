import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Message {
  id: string;
  plan_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface Props {
  planId: string;
}

export default function PlanChat({ planId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("plan_messages")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true })
      .limit(200);

    const msgs = (data as any[] || []) as Message[];
    setMessages(msgs);

    // Fetch profiles for all message senders
    const userIds = [...new Set(msgs.map((m) => m.user_id))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", userIds);
      const pMap = new Map<string, Profile>();
      (profileData as any[] || []).forEach((p) => pMap.set(p.user_id, p));
      setProfiles(pMap);
    }
  }, [planId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`plan-chat-${planId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plan_messages", filter: `plan_id=eq.${planId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          // Fetch profile if not cached
          if (!profiles.has(newMsg.user_id)) {
            const { data } = await supabase
              .from("profiles")
              .select("user_id, nickname, avatar_url")
              .eq("user_id", newMsg.user_id)
              .single();
            if (data) {
              setProfiles((prev) => new Map(prev).set(newMsg.user_id, data as Profile));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [planId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !input.trim()) return;
    setSending(true);
    await supabase.from("plan_messages").insert({
      plan_id: planId,
      user_id: user.id,
      message: input.trim(),
    } as any);
    setInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "a h:mm", { locale: ko });
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            아직 메시지가 없습니다. 첫 메시지를 보내보세요!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const profile = profiles.get(msg.user_id);
          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {!isMe && (
                <Avatar className="h-7 w-7 shrink-0 mt-1">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">
                    {profile?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {!isMe && (
                  <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                    {profile?.nickname || "사용자"}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-sm break-words ${
                    isMe
                      ? "bg-[#C7D66D] text-[#2F403A]"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="rounded-full"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          size="icon"
          className="rounded-full shrink-0 bg-[#C7D66D] hover:bg-[#b5c45d] text-[#2F403A]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
