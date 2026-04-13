import { MagazinePost } from "@/hooks/useMagazine";
import { Heart, Bookmark, Share2 } from "lucide-react";
import MountainMascot from "@/components/MountainMascot";

interface Props {
  post: MagazinePost;
  meta: { likes: number; liked: boolean; saved: boolean };
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onShare: (post: MagazinePost) => void;
}

const MagazinePostCard = ({ post, meta, onLike, onSave, onShare }: Props) => {
  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{post.category}</span>
        <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</span>
      </div>
      <div className="relative w-full" style={{ aspectRatio: "4 / 5" }}>
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <MountainMascot size={80} />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 pointer-events-none bg-gradient-to-b from-black/60 to-transparent px-4 pt-4 pb-10">
          <h3 className="text-white font-bold text-lg leading-snug drop-shadow-md">{post.title}</h3>
          {post.description && <p className="text-white/80 text-xs mt-1 line-clamp-1">{post.description}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-4">
          <button onClick={() => onLike(post.id)} className="flex items-center gap-1 text-muted-foreground hover:text-red-500">
            <Heart className={`h-5 w-5 ${meta.liked ? "fill-red-500 text-red-500" : ""}`} />
            {meta.likes > 0 && <span className="text-xs font-medium">{meta.likes}</span>}
          </button>
          <button onClick={() => onShare(post)} className="text-muted-foreground hover:text-foreground"><Share2 className="h-5 w-5" /></button>
        </div>
        <button onClick={() => onSave(post.id)} className="text-muted-foreground hover:text-primary">
          <Bookmark className={`h-5 w-5 ${meta.saved ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>
    </article>
  );
};

export default MagazinePostCard;
