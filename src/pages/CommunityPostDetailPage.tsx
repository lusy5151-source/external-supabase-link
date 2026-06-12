import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Heart, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentMenu } from "@/components/ContentMenu";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCommunityPost, fetchCommunityComments, addCommunityComment, deleteCommunityComment,
  toggleCommunityLike, deleteCommunityPost, categoryLabel, timeAgo,
  type CommunityPost, type CommunityComment,
} from "@/hooks/useCommunityPosts";

export default function CommunityPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [p, c] = await Promise.all([fetchCommunityPost(id, user?.id), fetchCommunityComments(id)]);
    setPost(p);
    setComments(c);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  const handleLike = async () => {
    if (!user || !post) { navigate("/auth"); return; }
    const liked = await toggleCommunityLike(post.id, user.id);
    setPost({ ...post, is_liked: liked, like_count: (post.like_count || 0) + (liked ? 1 : -1) });
  };

  const handleComment = async () => {
    if (!user || !post) { navigate("/auth"); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await addCommunityComment(post.id, user.id, commentText.trim());
      setCommentText("");
      const c = await fetchCommunityComments(post.id);
      setComments(c);
      setPost({ ...post, comment_count: c.length });
    } catch (e: any) {
      toast({ title: "댓글 등록 실패", description: e?.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (cid: string) => {
    await deleteCommunityComment(cid);
    setComments((arr) => arr.filter((c) => c.id !== cid));
    if (post) setPost({ ...post, comment_count: Math.max(0, (post.comment_count || 1) - 1) });
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await deleteCommunityPost(post.id);
    toast({ title: "삭제되었습니다" });
    navigate("/feed");
  };

  return (
    <div className="-mx-4 -mt-6 pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/feed"))} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary" aria-label="뒤로">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">커뮤니티</h1>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : !post ? (
          <div className="py-16 text-center text-sm text-muted-foreground">게시글을 찾을 수 없습니다</div>
        ) : (
          <article className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {categoryLabel[post.category]}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={post.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{(post.profile?.nickname || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold">{post.profile?.nickname || "사용자"}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                  </div>
                </div>
                {user?.id === post.user_id ? (
                  <button onClick={handleDeletePost} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label="삭제">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <ContentMenu targetType="post" targetId={post.id} authorId={post.user_id} authorName={post.profile?.nickname || undefined} />
                )}
              </div>
              {post.title && <h2 className="text-lg font-bold mb-2">{post.title}</h2>}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.body}</p>
              {post.images?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {post.images.map((src) => (
                    <img key={src} src={src} alt="" className="w-full rounded-lg object-cover" loading="lazy" />
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-4 pt-3 border-t border-border">
                <button onClick={handleLike} className="flex items-center gap-1.5 text-sm">
                  <Heart className={`h-5 w-5 ${post.is_liked ? "fill-coral text-coral" : "text-muted-foreground"}`} />
                  <span className={post.is_liked ? "text-coral font-medium" : "text-muted-foreground"}>{post.like_count || 0}</span>
                </button>
                <span className="text-sm text-muted-foreground">댓글 {post.comment_count || 0}</span>
              </div>
            </div>

            <section className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">댓글</h3>
              <div className="space-y-3">
                {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">첫 번째 댓글을 남겨보세요</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={c.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{(c.profile?.nickname || "?").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{c.profile?.nickname || "사용자"}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                        {user?.id === c.user_id && (
                          <button onClick={() => handleDeleteComment(c.id)} className="ml-auto text-[10px] text-muted-foreground hover:text-destructive">삭제</button>
                        )}
                        {user && user.id !== c.user_id && (
                          <div className="ml-auto"><ContentMenu targetType="comment" targetId={c.id} authorId={c.user_id} authorName={c.profile?.nickname || undefined} /></div>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              {user ? (
                <div className="mt-3 flex gap-2">
                  <Input placeholder="댓글 추가..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()} />
                  <Button size="icon" onClick={handleComment} disabled={submitting || !commentText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/auth")}>로그인하고 댓글 달기</Button>
              )}
            </section>
          </article>
        )}
      </div>
    </div>
  );
}
