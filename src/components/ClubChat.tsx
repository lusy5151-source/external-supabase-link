import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ImagePlus, X, Reply, Smile } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "🏔️", "🔥", "👏"];

interface ChatMessage {
  id: string;
  club_id: string;
  user_id: string;
  message: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
  reply_to?: { message: string | null; profile?: { nickname: string | null } } | null;
  reactions?: { emoji: string; count: number; users: string[] }[];
}

interface Props {
  clubId: string;
  onUnreadCount?: (count: number) => void;
}

export default function ClubChat({ clubId, onUnreadCount }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const enrichMessages = useCallback(async (msgs: any[]): Promise<ChatMessage[]> => {
    if (msgs.length === 0) return [];
    const userIds = [...new Set(msgs.map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // Fetch reply targets
    const replyIds = msgs.filter((m: any) => m.reply_to_id).map((m: any) => m.reply_to_id);
    let replyMap = new Map<string, any>();
    if (replyIds.length > 0) {
      const { data: replies } = await supabase
        .from("club_messages" as any)
        .select("id, message, user_id")
        .in("id", replyIds);
      if (replies) {
        (replies as any[]).forEach((r) => {
          replyMap.set(r.id, { message: r.message, profile: map.get(r.user_id) || null });
        });
      }
    }

    // Fetch reactions
    const msgIds = msgs.map((m: any) => m.id);
    const { data: reactions } = await supabase
      .from("message_reactions" as any)
      .select("message_id, user_id, emoji")
      .in("message_id", msgIds);

    const reactionMap = new Map<string, Map<string, string[]>>();
    (reactions as any[] || []).forEach((r: any) => {
      if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, new Map());
      const emojiMap = reactionMap.get(r.message_id)!;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, []);
      emojiMap.get(r.emoji)!.push(r.user_id);
    });

    return msgs.map((m) => ({
      ...m,
      profile: map.get(m.user_id) || null,
      reply_to: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
      reactions: reactionMap.has(m.id)
        ? [...reactionMap.get(m.id)!.entries()].map(([emoji, users]) => ({ emoji, count: users.length, users }))
        : [],
    }));
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("club_messages" as any)
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true })
      .limit(100);
    const enriched = await enrichMessages((data as any[]) || []);
    setMessages(enriched);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [clubId, enrichMessages]);

  // Mark as read
  const markAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("message_reads" as any)
      .upsert({ club_id: clubId, user_id: user.id, last_read_at: new Date().toISOString() } as any, { onConflict: "club_id,user_id" });
  }, [clubId, user]);

  useEffect(() => { fetchMessages().then(() => markAsRead()); }, [fetchMessages, markAsRead]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`club-chat-${clubId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "club_messages",
        filter: `club_id=eq.${clubId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        const enriched = await enrichMessages([newMsg]);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, ...enriched];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        markAsRead();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubId, enrichMessages, markAsRead]);

  // Calculate unread count
  useEffect(() => {
    if (!user || !onUnreadCount) return;
    const calcUnread = async () => {
      const { data } = await supabase
        .from("message_reads" as any)
        .select("last_read_at")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .single();
      const lastRead = (data as any)?.last_read_at;
      if (!lastRead) {
        onUnreadCount(messages.length);
      } else {
        const count = messages.filter((m) => new Date(m.created_at) > new Date(lastRead) && m.user_id !== user.id).length;
        onUnreadCount(count);
      }
    };
    calcUnread();
  }, [messages, user, clubId, onUnreadCount]);

  const handleSend = async () => {
    if (!user || (!text.trim() && !imageFile)) return;
    setSending(true);

    let uploadedUrl: string | null = null;
    if (imageFile) {
      const { compressImage } = await import("@/lib/imageUpload");
      const compressed = await compressImage(imageFile, "general");
      if (!compressed) { setSending(false); return; }
      const path = `${clubId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("club-logos").upload(path, compressed, { contentType: "image/jpeg" });
      if (!error) {
        const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(path);
        uploadedUrl = urlData.publicUrl;
      }
    }

    await supabase.from("club_messages" as any).insert({
      club_id: clubId,
      user_id: user.id,
      message: text.trim() || null,
      image_url: uploadedUrl,
      reply_to_id: replyTo?.id || null,
    });

    setText("");
    setImageFile(null);
    setImagePreview(null);
    setReplyTo(null);
    setSending(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === messageId);
    const existingReaction = msg?.reactions?.find((r) => r.emoji === emoji && r.users.includes(user.id));

    if (existingReaction) {
      await supabase
        .from("message_reactions" as any)
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase
        .from("message_reactions" as any)
        .insert({ message_id: messageId, user_id: user.id, emoji } as any);
    }

    setEmojiPickerMsgId(null);
    // Refresh reactions
    const { data: allReactions } = await supabase
      .from("message_reactions" as any)
      .select("message_id, user_id, emoji")
      .eq("message_id", messageId);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const emojiMap = new Map<string, string[]>();
        ((allReactions as any[]) || []).forEach((r: any) => {
          if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, []);
          emojiMap.get(r.emoji)!.push(r.user_id);
        });
        return {
          ...m,
          reactions: [...emojiMap.entries()].map(([emoji, users]) => ({ emoji, count: users.length, users })),
        };
      })
    );
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">💬 클럽 채팅</h2>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && (
                <Avatar className="h-7 w-7 shrink-0">
                  {msg.profile?.avatar_url && <AvatarImage src={msg.profile.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-muted">{(msg.profile?.nickname || "?").charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[70%] space-y-0.5 ${isMe ? "items-end" : ""}`}>
                {!isMe && <p className="text-[10px] text-muted-foreground">{msg.profile?.nickname || "멤버"}</p>}

                {/* Reply preview */}
                {msg.reply_to && (
                  <div className={cn("rounded-lg px-2.5 py-1.5 text-[10px] border-l-2 border-primary/40 bg-muted/50 mb-0.5", isMe && "ml-auto")}>
                    <span className="font-medium text-primary/70">{msg.reply_to.profile?.nickname || "멤버"}</span>
                    <p className="text-muted-foreground truncate">{msg.reply_to.message || "📷 이미지"}</p>
                  </div>
                )}

                {msg.image_url && (
                  <img src={msg.image_url} alt="" className="rounded-lg max-h-40 object-cover" loading="lazy" />
                )}
                {msg.message && (
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    {msg.message}
                  </div>
                )}

                {/* Reactions display */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={cn("flex gap-1 flex-wrap", isMe && "justify-end")}>
                    {msg.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => toggleReaction(msg.id, r.emoji)}
                        className={cn(
                          "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors",
                          r.users.includes(user?.id || "")
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-card hover:bg-secondary"
                        )}
                      >
                        {r.emoji} <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions: time + reply + react */}
                <div className={cn("flex items-center gap-2", isMe ? "justify-end" : "")}>
                  <p className="text-[9px] text-muted-foreground">
                    {format(new Date(msg.created_at), "HH:mm", { locale: ko })}
                  </p>
                  <button onClick={() => setReplyTo(msg)} className="text-muted-foreground hover:text-foreground">
                    <Reply className="h-3 w-3" />
                  </button>
                  <div className="relative">
                    <button onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} className="text-muted-foreground hover:text-foreground">
                      <Smile className="h-3 w-3" />
                    </button>
                    {emojiPickerMsgId === msg.id && (
                      <div className={cn("absolute z-20 bottom-5 flex gap-1 rounded-xl border border-border bg-card p-1.5 shadow-lg", isMe ? "right-0" : "left-0")}>
                        {EMOJI_OPTIONS.map((e) => (
                          <button key={e} onClick={() => toggleReaction(msg.id, e)} className="text-sm hover:scale-125 transition-transform p-0.5">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 flex items-center gap-2 bg-muted/30 border-t border-border">
          <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-primary">{replyTo.profile?.nickname || "멤버"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{replyTo.message || "📷 이미지"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <img src={imagePreview} alt="" className="h-16 rounded-lg object-cover" />
          <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} className="hidden" />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="메시지를 입력하세요..."
          className="rounded-full text-sm h-9"
        />
        <Button size="icon" className="h-8 w-8 rounded-full shrink-0" disabled={sending || (!text.trim() && !imageFile)} onClick={handleSend}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
