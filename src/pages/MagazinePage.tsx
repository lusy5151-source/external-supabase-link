import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import MountainMascot from "@/components/MountainMascot";

interface MagazinePost {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  description: string | null;
  content_body?: string | null;
  is_featured: boolean;
  is_published?: boolean;
  created_at: string;
}

const CATEGORY_PILL: Record<string, { bg: string; fg: string }> = {
  "등산 코스": { bg: "#EAF3DE", fg: "#3B6D11" },
  "등산 안전": { bg: "#FBE6DD", fg: "#B5421A" },
  "계절 추천": { bg: "#FFF1D6", fg: "#8A5A12" },
  "등산 가이드": { bg: "#DEEAF5", fg: "#1E4775" },
};

const WANDEUNG_GREEN = "#8fb93f";

const pillStyle = (category: string, solid = false): React.CSSProperties => {
  const c = CATEGORY_PILL[category] || { bg: "#EAF3DE", fg: "#3B6D11" };
  return {
    background: solid ? WANDEUNG_GREEN : c.bg,
    color: solid ? "#ffffff" : c.fg,
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 999,
    padding: "3px 10px",
    display: "inline-block",
    lineHeight: 1.4,
  };
};

const PlaceholderCover = () => (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{
      background:
        "linear-gradient(135deg, #d8e3b8 0%, #b9cf7e 50%, #8fb93f 100%)",
    }}
  >
    <MountainMascot size={56} />
  </div>
);

const MagazinePage = () => {
  const [posts, setPosts] = useState<MagazinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPost, setOpenPost] = useState<MagazinePost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("magazine_posts")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      setPosts((data as MagazinePost[]) || []);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(() => posts.find((p) => p.is_featured) || posts[0], [posts]);
  const rest = useMemo(() => posts.filter((p) => p.id !== featured?.id), [posts, featured]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.category && set.add(p.category));
    return ["전체", ...Array.from(set)];
  }, [posts]);

  const recommended = rest.slice(0, 8);
  const recommendedIds = useMemo(() => new Set(recommended.map((p) => p.id)), [recommended]);
  const filteredList =
    selectedCategory === "전체"
      ? rest.filter((p) => !recommendedIds.has(p.id))
      : rest.filter((p) => p.category === selectedCategory);

  if (openPost) {
    return <MagazineDetail post={openPost} onBack={() => setOpenPost(null)} />;
  }

  return (
    <div className="pb-24 min-h-screen" style={{ background: "#f7f6e4" }}>
      {/* Top bar */}
      <div className="flex items-center px-3 py-3 relative" style={{ background: "#f7f6e4" }}>
        <Link to="/" className="rounded-xl p-2 hover:bg-accent transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <h1
          className="absolute left-1/2 -translate-x-1/2 text-foreground"
          style={{ fontSize: 16, fontWeight: 500 }}
        >
          완등 MAGAZINE
        </h1>
      </div>

      <p
        className="text-center text-muted-foreground"
        style={{ fontSize: 12, marginBottom: 16, fontWeight: 400 }}
      >
        등산 정보 · 코스 · 장비 · 안전 팁
      </p>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <MountainMascot size={64} />
          <p className="mt-3 text-sm text-muted-foreground">매거진을 불러오는 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <MountainMascot size={64} />
          <p className="mt-3 text-sm text-muted-foreground">아직 등록된 매거진이 없습니다</p>
        </div>
      ) : (
        <>
          {/* Featured hero card — full-bleed photo, 16:10, single title */}
          {featured && (
            <button
              onClick={() => setOpenPost(featured)}
              className="block relative overflow-hidden text-left"
              style={{
                margin: "0 16px",
                borderRadius: 16,
                width: "calc(100% - 32px)",
                aspectRatio: "16 / 10",
                background: "#e8e6cf",
              }}
            >
              {featured.cover_image_url ? (
                <img
                  src={featured.cover_image_url}
                  alt={featured.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="absolute inset-0">
                  <PlaceholderCover />
                </div>
              )}

              {/* Bottom gradient overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 60%)",
                }}
              />

              {/* Category pill top-left */}
              <span
                className="absolute"
                style={{ top: 12, left: 12, ...pillStyle(featured.category, true) }}
              >
                {featured.category}
              </span>

              {/* Mascot corner mark bottom-right */}
              <div
                className="absolute pointer-events-none"
                style={{ bottom: 10, right: 12, width: 40, height: 40, opacity: 0.95 }}
              >
                <MountainMascot size={40} />
              </div>

              {/* Title + subtitle bottom-left */}
              <div
                className="absolute left-0 right-0 bottom-0"
                style={{ padding: "0 60px 14px 14px", color: "#fff" }}
              >
                <div
                  className="line-clamp-2"
                  style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.35 }}
                >
                  {featured.title}
                </div>
                {featured.description && (
                  <div
                    className="line-clamp-1"
                    style={{ fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.85 }}
                  >
                    {featured.description}
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Category chips */}
          <div
            className="flex overflow-x-auto no-scrollbar"
            style={{ padding: "16px 16px 8px", gap: 8 }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="flex-shrink-0 whitespace-nowrap"
                  style={{
                    background: active ? WANDEUNG_GREEN : "#ffffff",
                    color: active ? "white" : "hsl(var(--muted-foreground))",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "6px 14px",
                    border: active ? "none" : "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Recommended (horizontal) */}
          {selectedCategory === "전체" && recommended.length > 0 && (
            <>
              <h2
                className="text-foreground"
                style={{ fontSize: 14, fontWeight: 500, padding: "8px 16px 8px" }}
              >
                이런 글은 어때요?
              </h2>
              <div
                className="flex overflow-x-auto no-scrollbar"
                style={{ padding: "0 16px 16px", gap: 12 }}
              >
                {recommended.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setOpenPost(post)}
                    className="flex-shrink-0 overflow-hidden text-left"
                    style={{ width: 180, background: "#ffffff", borderRadius: 14 }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 9",
                        overflow: "hidden",
                        background: "#e8e6cf",
                      }}
                    >
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <PlaceholderCover />
                      )}
                    </div>
                    <div style={{ padding: "8px 10px 10px" }}>
                      <span style={pillStyle(post.category)}>{post.category}</span>
                      <div
                        className="text-foreground line-clamp-2"
                        style={{ fontSize: 12, fontWeight: 500, marginTop: 6, lineHeight: 1.4 }}
                      >
                        {post.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Full list — 2-column card grid */}
          <h2
            className="text-foreground"
            style={{ fontSize: 14, fontWeight: 500, padding: "8px 16px 8px" }}
          >
            전체 글
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              padding: "0 16px",
            }}
          >
            {filteredList.map((post) => (
              <button
                key={post.id}
                onClick={() => setOpenPost(post)}
                className="overflow-hidden text-left"
                style={{ background: "#ffffff", borderRadius: 14 }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    overflow: "hidden",
                    background: "#e8e6cf",
                  }}
                >
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <PlaceholderCover />
                  )}
                </div>
                <div style={{ padding: "8px 10px 12px" }}>
                  <span style={pillStyle(post.category)}>{post.category}</span>
                  <div
                    className="text-foreground line-clamp-2"
                    style={{ fontSize: 13, fontWeight: 500, marginTop: 6, lineHeight: 1.4 }}
                  >
                    {post.title}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Instagram follow banner */}
          <div
            className="flex items-center"
            style={{
              background: "linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)",
              borderRadius: 14,
              padding: 16,
              margin: "16px 16px 24px",
              gap: 12,
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "white",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: 22, height: 22 }}
              >
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F58529" />
                    <stop offset="50%" stopColor="#DD2A7B" />
                    <stop offset="100%" stopColor="#8134AF" />
                  </linearGradient>
                </defs>
                <rect
                  x="2" y="2" width="20" height="20" rx="5" ry="5"
                  fill="none"
                  stroke="url(#ig-grad)"
                  strokeWidth="2"
                />
                <circle
                  cx="12" cy="12" r="4"
                  fill="none"
                  stroke="url(#ig-grad)"
                  strokeWidth="2"
                />
                <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-grad)" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "white",
                }}
              >
                인스타그램에서 완등을 팔로우하세요
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 2,
                }}
              >
                등산 정보, 코스, 이벤트 소식을 먼저 받아보세요
              </div>
            </div>
            <button
              onClick={() => window.open("https://www.instagram.com/wan_deung.official", "_blank", "noopener,noreferrer")}
              style={{
                background: "white",
                color: "#DD2A7B",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 20,
                padding: "6px 12px",
                flexShrink: 0,
              }}
            >
              팔로우
            </button>
          </div>
        </>
      )}
    </div>
  );
};

interface ContentBlock {
  id: string;
  block_type: string;
  heading_text: string | null;
  image_url: string | null;
  image_caption: string | null;
  body_text: string | null;
  block_order: number;
}

const MagazineDetail = ({ post, onBack }: { post: MagazinePost; onBack: () => void }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("magazine_content_blocks")
        .select("*")
        .eq("post_id", post.id)
        .order("block_order");
      setBlocks((data as ContentBlock[]) || []);
      setLoaded(true);
    })();
  }, [post.id]);

  const fallbackBody = post.content_body || post.description || "";

  return (
    <div className="bg-background min-h-screen" style={{ paddingBottom: 40 }}>
      <div className="relative">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full object-cover"
            style={{ height: 220 }}
          />
        ) : (
          <div style={{ height: 220 }}>
            <PlaceholderCover />
          </div>
        )}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 rounded-full p-2"
          style={{ background: "rgba(255,255,255,0.9)" }}
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <span
          style={{
            background: "#EAF3DE",
            color: "#3B6D11",
            borderRadius: 20,
            fontSize: 11,
            padding: "3px 10px",
          }}
        >
          {post.category}
        </span>
        <h1
          className="text-foreground"
          style={{ fontSize: 20, fontWeight: 500, marginTop: 8 }}
        >
          {post.title}
        </h1>
        <div
          style={{
            height: 0,
            borderTop: "0.5px solid hsl(var(--border))",
            margin: "12px 0",
          }}
        />

        {loaded && blocks.length > 0 ? (
          <div>
            {blocks.map((b) => {
              if (b.block_type === "heading") {
                return (
                  <div
                    key={b.id}
                    className="text-foreground"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      borderLeft: "3px solid #639922",
                      paddingLeft: 10,
                      margin: "16px 0 8px",
                    }}
                  >
                    {b.heading_text}
                  </div>
                );
              }
              if (b.block_type === "image_text") {
                return (
                  <div key={b.id} style={{ margin: "12px 0" }}>
                    {b.image_url && (
                      <img
                        src={b.image_url}
                        alt={b.image_caption || ""}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          height: "auto",
                          objectFit: "contain",
                        }}
                      />
                    )}
                    {b.image_caption && (
                      <p
                        className="text-muted-foreground"
                        style={{
                          fontSize: 11,
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
                        {b.image_caption}
                      </p>
                    )}
                    {b.body_text && (
                      <p
                        className="text-muted-foreground"
                        style={{
                          fontSize: 13,
                          lineHeight: 1.7,
                          marginTop: 8,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {b.body_text}
                      </p>
                    )}
                  </div>
                );
              }
              if (b.block_type === "text_only") {
                return (
                  <p
                    key={b.id}
                    className="text-muted-foreground"
                    style={{
                      fontSize: 13,
                      lineHeight: 1.75,
                      margin: "8px 0",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {b.body_text}
                  </p>
                );
              }
              if (b.block_type === "tip") {
                return (
                  <div
                    key={b.id}
                    style={{
                      background: "#EAF3DE",
                      borderRadius: 8,
                      padding: "10px 12px",
                      margin: "10px 0",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#27500A",
                        marginBottom: 3,
                      }}
                    >
                      팁
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#3B6D11",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {b.body_text}
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : (
          <div
            className="text-muted-foreground"
            style={{ fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap" }}
          >
            {fallbackBody}
          </div>
        )}
      </div>
    </div>
  );
};

export default MagazinePage;

