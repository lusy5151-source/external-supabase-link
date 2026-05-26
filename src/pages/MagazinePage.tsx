import { useState, useEffect } from "react";
import { useMagazine, MagazinePost } from "@/hooks/useMagazine";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import MountainMascot from "@/components/MountainMascot";
import MagazineSlideViewer from "@/components/MagazineSlideViewer";

const MagazinePage = () => {
  const { posts, loading } = useMagazine();
  const [openPost, setOpenPost] = useState<MagazinePost | null>(null);

  const published = posts.filter((p) => (p as any).is_published === true);

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 mb-5 px-4">
        <Link to="/" className="rounded-xl p-2 hover:bg-accent transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">완등 MAGAZINE</h1>
          <p className="text-xs text-muted-foreground">등산 정보 · 코스 · 장비 · 안전 팁</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <MountainMascot size={64} />
          <p className="mt-3 text-sm text-muted-foreground">매거진을 불러오는 중...</p>
        </div>
      ) : published.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <MountainMascot size={64} />
          <p className="mt-3 text-sm text-muted-foreground">아직 등록된 매거진이 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col px-4" style={{ gap: 12 }}>
          {published.map((post) => {
            const readTime = (post as any).read_time_minutes as number | null;
            return (
              <button
                key={post.id}
                onClick={() => setOpenPost(post)}
                className="text-left overflow-hidden bg-card"
                style={{ borderRadius: 16, border: "0.5px solid hsl(var(--border))" }}
              >
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full object-cover"
                    style={{ height: 160 }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="w-full"
                    style={{ height: 160, background: "linear-gradient(135deg, #C0DD97, #639922)" }}
                  />
                )}
                <div className="p-3 space-y-1.5">
                  <span
                    className="inline-block text-white"
                    style={{ background: "#639922", fontSize: 10, borderRadius: 20, padding: "2px 8px" }}
                  >
                    {post.category}
                  </span>
                  <h3 className="text-foreground" style={{ fontSize: 15, fontWeight: 500 }}>
                    {post.title}
                  </h3>
                  {post.description && (
                    <p
                      className="text-muted-foreground line-clamp-2"
                      style={{ fontSize: 13 }}
                    >
                      {post.description}
                    </p>
                  )}
                  {readTime != null && (
                    <p className="text-muted-foreground" style={{ fontSize: 11 }}>
                      {readTime}분 읽기
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openPost && (
        <MagazineSlideViewer post={openPost} onClose={() => setOpenPost(null)} />
      )}
    </div>
  );
};

export default MagazinePage;
