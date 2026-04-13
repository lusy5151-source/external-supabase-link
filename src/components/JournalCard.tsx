import { useState, useEffect } from "react";
import { mountains } from "@/data/mountains";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingJournals, type HikingJournal, type JournalComment } from "@/hooks/useHikingJournals";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Heart, MessageCircle, Mountain, Calendar, Clock, Route, Flag,
  Globe, Users, Lock, ChevronDown, Send, Trash2, X,
} from "lucide-react";
import { ContentMenu } from "@/components/ContentMenu";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

const visibilityConfig = {
  public: { icon: Globe, label: "전체 공개", color: "text-primary" },
  friends: { icon: Users, label: "친구 공개", color: "text-amber-500" },
  private: { icon: Lock, label: "나만 보기", color: "text-muted-foreground" },
};

interface JournalCardProps {
  journal: HikingJournal;
  showAuthor?: boolean;
  onRefresh?: () => void;
}

export function JournalCard({ journal, showAuthor = true, onRefresh }: JournalCardProps) {
  const { user } = useAuth();
  const { toggleLike, fetchComments, addComment, deleteComment } = useHikingJournals();
  const mountain = mountains.find((m) => m.id === journal.mountain_id);
  const allMountains = (journal.mountain_ids?.length ? journal.mountain_ids : [journal.mountain_id])
    .map((id) => mountains.find((m) => m.id === id))
    .filter(Boolean) as typeof mountains;

  const [liked, setLiked] = useState(journal.is_liked || false);
  const [likeCount, setLikeCount] = useState(journal.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<JournalComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(journal.comment_count || 0);

  // Sync counts when journal prop updates
  useEffect(() => {
    setLikeCount(journal.like_count || 0);
    setCommentCount(journal.comment_count || 0);
    setLiked(journal.is_liked || false);
  }, [journal.id, journal.like_count, journal.comment_count, journal.is_liked]);
  const [expanded, setExpanded] = useState(false);
  const [taggedProfiles, setTaggedProfiles] = useState<Map<string, { nickname: string | null; avatar_url: string | null }>>(new Map());
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<{ user_id: string; nickname: string | null; avatar_url: string | null }[]>([]);

  const vis = visibilityConfig[journal.visibility] || visibilityConfig.public;
  const VisIcon = vis.icon;

  // Load tagged friend profiles
  useEffect(() => {
    if (!journal.tagged_friends || journal.tagged_friends.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", journal.tagged_friends)
      .then(({ data }) => {
        if (data) setTaggedProfiles(new Map(data.map((p) => [p.user_id, p])));
      });
  }, [journal.tagged_friends]);

  const handleLike = async () => {
    if (!user) return;
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    await toggleLike(journal.id, liked);
  };

  const handleShowComments = async () => {
    if (!showComments) {
      const data = await fetchComments(journal.id);
      setComments(data);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const { error } = await addComment(journal.id, commentText.trim());
    if (!error) {
      setCommentText("");
      setCommentCount((c) => c + 1);
      const data = await fetchComments(journal.id);
      setComments(data);
    }
  };

  const handleDeleteComment = async (id: string) => {
    await deleteComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    setCommentCount((c) => c - 1);
  };

  if (!mountain) return null;

  const photos = journal.photos || [];
  const taggedFriends = journal.tagged_friends || [];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Author row */}
      {showAuthor && journal.profile && (
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={journal.profile.avatar_url || ""} />
            <AvatarFallback className="text-xs">{journal.profile.nickname?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{journal.profile.nickname || "사용자"}</p>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(journal.hiked_at), "M월 d일", { locale: ko })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("flex items-center gap-1 text-[10px]", vis.color)}>
              <VisIcon className="h-3 w-3" />
              <span>{vis.label}</span>
            </div>
            <ContentMenu
              targetType="journal"
              targetId={journal.id}
              authorId={journal.user_id}
              authorName={journal.profile?.nickname || undefined}
            />
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className={cn("grid gap-0.5", photos.length === 1 ? "" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {photos.slice(0, 3).map((src, i) => (
            <div key={i} className="aspect-square relative overflow-hidden">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 2 && photos.length > 3 && (
                <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">+{photos.length - 3}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Summit claim badge */}
        {journal.notes?.includes("정상 점령 성공! 🏔") && (
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-lg px-2.5 py-1 w-fit text-xs font-medium">
            <Mountain className="h-3.5 w-3.5" /> Summit Claim
          </div>
        )}

        {/* Mountain info */}
        <div className="space-y-1">
          {allMountains.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground text-sm">{m.nameKo}</span>
              <span className="text-[10px] text-muted-foreground">{m.region} · {m.height}m</span>
            </div>
          ))}
        </div>

        {/* Course & duration */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {journal.course_name && (
            <span className="flex items-center gap-1 bg-secondary/60 rounded-md px-2 py-0.5">
              <Route className="h-3 w-3" /> {journal.course_name}
            </span>
          )}
          {journal.duration && (
            <span className="flex items-center gap-1 bg-secondary/60 rounded-md px-2 py-0.5">
              <Clock className="h-3 w-3" /> {journal.duration}
            </span>
          )}
          {journal.weather && (
            <span className="bg-secondary/60 rounded-md px-2 py-0.5">{journal.weather}</span>
          )}
          {journal.difficulty && (
            <span className="bg-secondary/60 rounded-md px-2 py-0.5">{journal.difficulty}</span>
          )}
        </div>

        {/* Notes */}
        {journal.notes && (
          <div>
            <p className={cn("text-sm text-foreground leading-relaxed", !expanded && "line-clamp-3")}>
              {journal.notes}
            </p>
            {journal.notes.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline mt-0.5"
              >
                {expanded ? "접기" : "더 보기"}
              </button>
            )}
          </div>
        )}

        {/* Tagged friends */}
        {taggedFriends.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-primary font-medium">🤝 함께한 친구:</span>
            {taggedFriends.map((fId) => {
              const profile = taggedProfiles.get(fId);
              return (
                <span key={fId} className="flex items-center gap-1 text-[10px] text-foreground bg-primary/5 rounded-full px-2 py-0.5">
                  {profile?.nickname || "친구"}
                </span>
              );
            })}
          </div>
        )}

        {/* Like & Comment row */}
        <div className="flex items-center gap-4 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              <span>{likeCount}</span>
            </button>
            {likeCount > 0 && (
              <button
                onClick={async () => {
                  const { data } = await supabase
                    .from("journal_likes")
                    .select("user_id")
                    .eq("journal_id", journal.id);
                  if (data) {
                    const userIds = data.map((d: any) => d.user_id);
                    const { data: profiles } = await supabase
                      .from("profiles")
                      .select("user_id, nickname, avatar_url")
                      .in("user_id", userIds);
                    setLikers(profiles || []);
                    setShowLikers((v) => !v);
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="좋아요 누른 사람 보기"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showLikers && "rotate-180")} />
              </button>
            )}
          </div>
          <button
            onClick={handleShowComments}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{commentCount}</span>
          </button>
          {!showAuthor && (
            <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(journal.hiked_at), "yyyy.M.d", { locale: ko })}
            </div>
          )}
        </div>

        {/* Likers popup */}
        {showLikers && (
          <div className="rounded-xl bg-secondary/80 p-3 space-y-2 border border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">좋아요 {likeCount}명</p>
              <button onClick={() => setShowLikers(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {likers.map((l) => (
              <div key={l.user_id} className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={l.avatar_url || ""} />
                  <AvatarFallback className="text-[8px]">{l.nickname?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground">{l.nickname || "사용자"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Comments section */}
        {showComments && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">아직 댓글이 없습니다</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar className="h-6 w-6 mt-0.5">
                  <AvatarImage src={c.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[8px]">{c.profile?.nickname?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-medium text-foreground">{c.profile?.nickname || "사용자"}</span>{" "}
                    <span className="text-foreground/80">{c.content}</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {format(new Date(c.created_at), "M/d HH:mm", { locale: ko })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {c.user_id === user?.id ? (
                    <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : (
                    <ContentMenu
                      targetType="comment"
                      targetId={c.id}
                      authorId={c.user_id}
                      authorName={c.profile?.nickname || undefined}
                    />
                  )}
                </div>
              </div>
            ))}

            {user && (
              <div className="flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="댓글 달기..."
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="text-primary disabled:text-muted-foreground"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact card for profile grid
export function JournalGridCard({ journal, onClick }: { journal: HikingJournal; onClick?: () => void }) {
  const allMts = (journal.mountain_ids?.length ? journal.mountain_ids : [journal.mountain_id])
    .map((id) => mountains.find((m) => m.id === id))
    .filter(Boolean) as typeof mountains;
  const mountain = allMts[0];
  if (!mountain) return null;
  const photo = journal.photos?.[0];

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-secondary/30 relative">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Mountain className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {/* Visibility badge */}
        <div className="absolute top-1.5 right-1.5">
          {journal.visibility === "friends" && <Users className="h-3 w-3 text-white drop-shadow-md" />}
          {journal.visibility === "private" && <Lock className="h-3 w-3 text-white drop-shadow-md" />}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-foreground truncate">
          {allMts.map((m) => m.nameKo).join(", ")}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {format(new Date(journal.hiked_at), "yyyy.M.d", { locale: ko })}
        </p>
        {journal.course_name && (
          <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">🥾 {journal.course_name}</p>
        )}
      </div>
    </button>
  );
}
