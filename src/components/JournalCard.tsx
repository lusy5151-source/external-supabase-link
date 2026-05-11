import { useState, useEffect } from "react";
import { useMountains } from "@/contexts/MountainsContext";
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
import PhotoLightbox from "@/components/PhotoLightbox";
import { JournalPhotoSlider } from "@/components/JournalPhotoSlider";
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
  slider?: boolean;
}

export function JournalCard({ journal, showAuthor = true, onRefresh, slider = false }: JournalCardProps) {
  const { mountains } = useMountains();
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startX, setStartX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);

  const vis = visibilityConfig[journal.visibility] || visibilityConfig.public;
  const VisIcon = vis.icon;

  // Load tagged friend profiles
  useEffect(() => {
    if (!journal.tagged_friends || journal.tagged_friends.length === 0) return;
    supabase
      .from("public_profiles")
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
    <div
      className="overflow-hidden mb-2.5"
      style={{
        background: "hsl(var(--card))",
        borderRadius: "var(--radius)",
      }}
    >
      {/* Author row */}
      {showAuthor && journal.profile && (
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={journal.profile.avatar_url || ""} />
            <AvatarFallback className="text-[10px]">{journal.profile.nickname?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{journal.profile.nickname || "사용자"}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("flex items-center gap-1 text-[10px]", vis.color)}>
              <VisIcon className="h-3 w-3" />
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

      {/* Photo: slider on detail page, single photo + lightbox on feed */}
      {slider ? (
        <div className="px-0">
          <JournalPhotoSlider photos={photos} />
        </div>
      ) : (
        <>
          {photos.length > 0 && (
            photos.length === 1 ? (
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="w-full relative overflow-hidden focus:outline-none bg-secondary/30"
                style={{ maxHeight: 320 }}
              >
                <img src={photos[0]} alt="" className="w-full object-contain" style={{ maxHeight: 320 }} />
              </button>
            ) : (
              <div
                className="w-full relative overflow-hidden bg-secondary/30"
                style={{ maxHeight: 320 }}
                onTouchStart={(e) => {
                  setStartX(e.touches[0].clientX);
                  setDragging(true);
                }}
                onTouchMove={(e) => {
                  if (!dragging) return;
                  setDragDelta(e.touches[0].clientX - startX);
                }}
                onTouchEnd={() => {
                  if (dragDelta < -50 && currentIdx < photos.length - 1)
                    setCurrentIdx(i => i + 1);
                  if (dragDelta > 50 && currentIdx > 0)
                    setCurrentIdx(i => i - 1);
                  setDragging(false);
                  setDragDelta(0);
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    transform: `translateX(calc(-${currentIdx * 100}% + ${dragging ? dragDelta : 0}px))`,
                    transition: dragging ? 'none' : 'transform 0.25s ease',
                  }}
                >
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="focus:outline-none"
                      style={{ flex: '0 0 100%', width: '100%' }}
                    >
                      <img
                        src={url}
                        alt=""
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          pointerEvents: 'none',
                        }}
                      />
                    </button>
                  ))}
                </div>
                {/* Counter */}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: 20,
                  padding: '2px 8px',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 500,
                }}>
                  {currentIdx + 1} / {photos.length}
                </div>
                {/* Dots */}
                <div style={{
                  position: 'absolute', bottom: 8, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', gap: 4,
                }}>
                  {photos.map((_, i) => (
                    <div key={i} style={{
                      width: i === currentIdx ? 14 : 5,
                      height: 5,
                      borderRadius: 3,
                      background: i === currentIdx ? '#c6d56c' : 'rgba(255,255,255,0.55)',
                      transition: 'all 0.2s',
                    }} />
                  ))}
                </div>
              </div>
            )
          )}
          <PhotoLightbox
            photos={photos}
            initialIndex={lightboxIndex ?? 0}
            open={lightboxIndex !== null}
            onClose={() => setLightboxIndex(null)}
          />
        </>
      )}

      {/* Content area */}
      <div className={cn("p-3 space-y-1.5", photos.length === 0 && "border-l-[3px]")} style={photos.length === 0 ? { borderLeftColor: "hsl(var(--brand-lime))" } : undefined}>
        {/* Summit claim badge */}
        {journal.notes?.includes("정상 점령 성공! 🏔") && (
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-md px-2 py-0.5 w-fit text-[11px] font-medium">
            <Mountain className="h-3 w-3" /> Summit Claim
          </div>
        )}

        {/* Mountain name */}
        <p style={{ fontSize: 15, fontWeight: 500 }} className="text-foreground">
          {allMountains.map((m) => m.nameKo).join(", ")}
        </p>

        {/* Date + course + duration */}
        <p style={{ fontSize: 12 }} className="text-muted-foreground">
          {format(new Date(journal.hiked_at), "yyyy.M.d", { locale: ko })}
          {journal.course_name && ` · ${journal.course_name}`}
          {journal.duration && ` · ${journal.duration}`}
        </p>

        {/* Memo preview */}
        {journal.notes && (
          <p style={{ fontSize: 13, marginTop: 4 }} className="text-foreground line-clamp-1">
            {journal.notes}
          </p>
        )}

        {/* Tagged friends */}
        {taggedFriends.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-primary font-medium">🤝</span>
            {taggedFriends.map((fId) => {
              const profile = taggedProfiles.get(fId);
              return (
                <span key={fId} className="text-[10px] text-foreground bg-primary/5 rounded-full px-2 py-0.5">
                  {profile?.nickname || "친구"}
                </span>
              );
            })}
          </div>
        )}

        {/* Bottom row: chips left, like/comment right */}
        <div className="flex items-center justify-between pt-1.5">
          <div className="flex items-center gap-1.5">
            {journal.weather && (
              <span className="bg-secondary/60 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">{journal.weather}</span>
            )}
            {journal.difficulty && (
              <span className="bg-secondary/60 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">{journal.difficulty}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 text-[11px] transition-colors",
                liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
              <span>{likeCount}</span>
            </button>
            <button
              onClick={handleShowComments}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{commentCount}</span>
            </button>
          </div>
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
  const { mountains } = useMountains();
  const allMts = (journal.mountain_ids?.length ? journal.mountain_ids : [journal.mountain_id])
    .map((id) => mountains.find((m) => m.id === id))
    .filter(Boolean) as typeof mountains;
  const mountain = allMts[0];
  if (!mountain) return null;
  const photo = journal.photos?.[0];

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
