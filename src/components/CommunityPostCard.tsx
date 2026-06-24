import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ContentMenu } from "@/components/ContentMenu";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { categoryLabel, timeAgo } from "@/hooks/useCommunityPosts";

interface Props {
  post: CommunityPost;
  compact?: boolean;
}

export function CommunityPostCard({ post, compact }: Props) {
  const navigate = useNavigate();
  const nickname = post.profile?.nickname || "사용자";
  return (
    <Link
      to={`/community/${post.id}`}
      className="block rounded-2xl bg-card border border-border p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {categoryLabel[post.category]}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/profile/${post.user_id}`);
            }}
            className="flex min-w-0 items-center gap-1.5 rounded-full text-left hover:text-primary"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{nickname.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{nickname}</span>
          </button>
          <span className="text-[10px] text-muted-foreground">· {timeAgo(post.created_at)}</span>
        </div>
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <ContentMenu targetType="post" targetId={post.id} authorId={post.user_id} authorName={nickname} />
        </div>
      </div>
      {post.title && <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1">{post.title}</h3>}
      <p className={`text-xs text-muted-foreground whitespace-pre-wrap ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{post.body}</p>
      {!compact && post.images?.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {post.images.slice(0, 3).map((src) => (
            <img key={src} src={src} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" loading="lazy" />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-coral" /> {post.like_count || 0}</span>
        <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {post.comment_count || 0}</span>
      </div>
    </Link>
  );
}
