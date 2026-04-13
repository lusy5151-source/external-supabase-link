import { useState, useEffect } from "react";
import { useMagazine, MagazinePost } from "@/hooks/useMagazine";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import MountainMascot from "@/components/MountainMascot";
import MagazinePostCard from "@/components/MagazinePostCard";

const CATEGORIES = ["전체", "등산 코스", "산 소개", "등산 장비", "등산 안전", "맛집 추천"];

const MagazinePage = () => {
  const { posts, loading, toggleLike, toggleSave, getLikeCount, isLiked, isSaved } = useMagazine();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("전체");
  const [postMeta, setPostMeta] = useState<Record<string, { likes: number; liked: boolean; saved: boolean }>>({});

  useEffect(() => {
    const loadMeta = async () => {
      const meta: Record<string, { likes: number; liked: boolean; saved: boolean }> = {};
      for (const p of posts) {
        const [likes, liked, saved] = await Promise.all([getLikeCount(p.id), isLiked(p.id), isSaved(p.id)]);
        meta[p.id] = { likes, liked, saved };
      }
      setPostMeta(meta);
    };
    if (posts.length > 0) loadMeta();
  }, [posts, user]);

  const handleLike = async (postId: string) => { await toggleLike(postId); const [likes, liked] = await Promise.all([getLikeCount(postId), isLiked(postId)]); setPostMeta((prev) => ({ ...prev, [postId]: { ...prev[postId], likes, liked } })); };
  const handleSave = async (postId: string) => { await toggleSave(postId); const saved = await isSaved(postId); setPostMeta((prev) => ({ ...prev, [postId]: { ...prev[postId], saved } })); };
  const handleShare = async (post: MagazinePost) => { if (navigator.share) { try { await navigator.share({ title: post.title, text: post.description || "", url: window.location.href }); } catch {} } };

  const filteredPosts = activeCategory === "전체" ? posts : posts.filter((p) => p.category === activeCategory);

  return (
    <div className="pb-24 -mx-1">
      <div className="flex items-center gap-3 mb-5"><Link to="/" className="rounded-xl p-2 hover:bg-accent transition-colors"><ArrowLeft className="h-5 w-5 text-foreground" /></Link><div><h1 className="text-xl font-bold text-foreground">완등 MAGAZINE</h1><p className="text-xs text-muted-foreground">등산 정보 · 코스 · 장비 · 안전 팁</p></div></div>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">{CATEGORIES.map((cat) => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{cat}</button>))}</div>
      {loading ? <div className="flex flex-col items-center py-16"><MountainMascot size={64} /><p className="mt-3 text-sm text-muted-foreground">매거진을 불러오는 중...</p></div> : filteredPosts.length === 0 ? <div className="flex flex-col items-center py-16"><MountainMascot size={64} /><p className="mt-3 text-sm text-muted-foreground">{activeCategory === "전체" ? "아직 등록된 매거진이 없습니다" : `${activeCategory} 카테고리에 매거진이 없습니다`}</p></div> : (
        <div className="space-y-6">{filteredPosts.map((post) => (<MagazinePostCard key={post.id} post={post} meta={postMeta[post.id] || { likes: 0, liked: false, saved: false }} onLike={handleLike} onSave={handleSave} onShare={handleShare} />))}</div>
      )}
    </div>
  );
};

export default MagazinePage;