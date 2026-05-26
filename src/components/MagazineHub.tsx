import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Bookmark, X, Mountain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMagazine, MagazinePost, MagazineSlide } from "@/hooks/useMagazine";

const CATEGORY_BG: Record<string, string> = {
  "등산 코스": "#FAEEDA",
  "계절 추천": "#EAF3DE",
  "등산 가이드": "#EEF2FF",
};

const MagazineHub = () => {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<MagazinePost | null>(null);
  const [recent, setRecent] = useState<MagazinePost[]>([]);
  const [openPost, setOpenPost] = useState<MagazinePost | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: r }] = await Promise.all([
        (supabase as any)
          .from("magazine_posts")
          .select("*")
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from("magazine_posts")
          .select("*")
          .eq("is_featured", false)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      setFeatured(f as any);
      setRecent((r as any) || []);
    })();
  }, []);

  if (!featured && recent.length === 0) return null;

  return (
    <section className="space-y-3 -mx-1">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-foreground" style={{ fontSize: 14, fontWeight: 500 }}>
          완등 MAGAZINE
        </h2>
        <button
          onClick={() => navigate("/magazine")}
          style={{ fontSize: 12, color: "#3B6D11" }}
          className="font-medium"
        >
          전체 보기 →
        </button>
      </div>

      {featured && (
        <button
          onClick={() => setOpenPost(featured)}
          className="relative block w-full overflow-hidden rounded-2xl"
          style={{ height: 140 }}
        >
          {featured.cover_image_url ? (
            <img
              src={featured.cover_image_url}
              alt={featured.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C0DD97, #639922)" }}
            >
              <Mountain className="h-12 w-12 text-white/80" />
            </div>
          )}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "60%",
              background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
            }}
          />
          <span
            className="absolute top-2 left-2 text-white"
            style={{
              background: "#639922",
              fontSize: 10,
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {featured.category}
          </span>
          <div className="absolute left-3 right-3 bottom-2 text-left">
            <p
              className="text-white line-clamp-2"
              style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
            >
              {featured.title}
            </p>
            {featured.read_time_minutes != null && (
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
                {featured.read_time_minutes}분 읽기
              </p>
            )}
          </div>
        </button>
      )}

      {recent.length > 0 && (
        <div
          className="flex overflow-x-auto scrollbar-hide"
          style={{ gap: 10, padding: "0 4px" }}
        >
          {recent.map((p) => {
            const bg = CATEGORY_BG[p.category] || "hsl(var(--secondary))";
            return (
              <button
                key={p.id}
                onClick={() => setOpenPost(p)}
                className="shrink-0 overflow-hidden bg-card text-left"
                style={{
                  minWidth: 130,
                  borderRadius: 12,
                  border: "0.5px solid hsl(var(--border))",
                }}
              >
                <div style={{ height: 70, background: bg }} className="w-full">
                  {p.cover_image_url && (
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div style={{ padding: "6px 8px" }}>
                  <p style={{ fontSize: 9, color: "#639922" }}>{p.category}</p>
                  <p
                    className="text-foreground line-clamp-2"
                    style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3 }}
                  >
                    {p.title}
                  </p>
                  {p.read_time_minutes != null && (
                    <p
                      className="text-muted-foreground"
                      style={{ fontSize: 9, marginTop: 2 }}
                    >
                      {p.read_time_minutes}분 읽기
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openPost && (
        <MagazineDetailSheet post={openPost} onClose={() => setOpenPost(null)} />
      )}
    </section>
  );
};

const MagazineDetailSheet = ({
  post,
  onClose,
}: {
  post: MagazinePost & { content_body?: string | null; read_time_minutes?: number | null };
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { fetchSlides, toggleLike, toggleSave, getLikeCount, isLiked, isSaved } =
    useMagazine();
  const [slides, setSlides] = useState<MagazineSlide[]>([]);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSlides(post.id).then(setSlides);
    getLikeCount(post.id).then(setLikes);
    isLiked(post.id).then(setLiked);
    isSaved(post.id).then(setSaved);
  }, [post.id]);

  const onLike = async () => {
    if (!user) return;
    await toggleLike(post.id);
    const [c, l] = await Promise.all([getLikeCount(post.id), isLiked(post.id)]);
    setLikes(c);
    setLiked(l);
  };
  const onSave = async () => {
    if (!user) return;
    await toggleSave(post.id);
    setSaved(await isSaved(post.id));
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-background rounded-t-3xl sm:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full object-cover"
            style={{ height: 200 }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{ height: 200, background: "linear-gradient(135deg, #C0DD97, #639922)" }}
          >
            <Mountain className="h-14 w-14 text-white/80" />
          </div>
        )}

        <div className="p-5 space-y-3">
          <span
            className="inline-block text-white"
            style={{ background: "#639922", fontSize: 10, borderRadius: 20, padding: "2px 8px" }}
          >
            {post.category}
          </span>
          <h2 className="text-foreground" style={{ fontSize: 18, fontWeight: 500 }}>
            {post.title}
          </h2>
          {post.description && (
            <p className="text-muted-foreground text-sm">{post.description}</p>
          )}
          <div className="h-px bg-border" />
          {post.content_body && (
            <p
              className="text-foreground whitespace-pre-wrap"
              style={{ fontSize: 14, lineHeight: 1.8 }}
            >
              {post.content_body}
            </p>
          )}

          {slides.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
              {slides.map((s) => (
                <div key={s.id} className="shrink-0 w-full max-w-[88%] space-y-1">
                  <img
                    src={s.image_url}
                    alt={s.caption || ""}
                    className="w-full object-cover rounded-xl"
                    style={{ height: 160 }}
                  />
                  {s.caption && (
                    <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                      {s.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <button onClick={onLike} className="flex items-center gap-1.5 text-muted-foreground">
              <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
              <span className="text-xs">{likes}</span>
            </button>
            <button onClick={onSave} className="text-muted-foreground">
              <Bookmark className={`h-5 w-5 ${saved ? "fill-primary text-primary" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagazineHub;
