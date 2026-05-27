import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

interface MagazinePostRow {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  is_published: boolean | null;
  created_at: string;
}

const AdminMagazinePage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const nav = useNavigate();
  const [posts, setPosts] = useState<MagazinePostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("magazine_posts")
        .select("id, title, category, cover_image_url, is_published, created_at")
        .order("created_at", { ascending: false });
      setPosts(data || []);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (adminLoading) {
    return <div className="py-16 text-center text-muted-foreground text-sm">로딩 중...</div>;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="pb-24 -mx-5">
      {/* Top app bar */}
      <div
        className="sticky top-14 z-10 flex items-center justify-between bg-background"
        style={{ padding: "12px 16px", borderBottom: "0.5px solid hsl(var(--border))" }}
      >
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-1 text-foreground"
          style={{ fontSize: 13 }}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
          뒤로
        </button>
        <h1 className="font-bold text-foreground" style={{ fontSize: 15 }}>
          콘텐츠 관리
        </h1>
        <Link
          to="/admin/magazine/new"
          className="flex items-center gap-1 text-white"
          style={{
            background: "#639922",
            borderRadius: 20,
            fontSize: 13,
            padding: "6px 14px",
            fontWeight: 600,
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />새 글
        </Link>
      </div>

      {/* Post list */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-10">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">등록된 글이 없습니다</p>
      ) : (
        <div>
          {posts.map((post) => {
            const published = post.is_published === true;
            return (
              <div
                key={post.id}
                className="flex items-center gap-3"
                style={{
                  padding: "12px 16px",
                  borderBottom: "0.5px solid hsl(var(--border))",
                }}
              >
                <div
                  className="shrink-0 overflow-hidden"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: post.cover_image_url ? "transparent" : "#EAF3DE",
                  }}
                >
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-foreground truncate"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  >
                    {post.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {post.category && (
                      <span style={{ fontSize: 11, color: "#639922" }}>
                        {post.category}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 10,
                        fontWeight: 600,
                        background: published ? "#EAF3DE" : "#FAEEDA",
                        color: published ? "#27500A" : "#633806",
                      }}
                    >
                      {published ? "발행됨" : "임시저장"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => nav(`/admin/magazine/${post.id}/edit`)}
                  style={{
                    border: "0.5px solid #639922",
                    color: "#3B6D11",
                    borderRadius: 20,
                    fontSize: 11,
                    padding: "3px 8px",
                    fontWeight: 600,
                    background: "transparent",
                  }}
                >
                  편집
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminMagazinePage;
