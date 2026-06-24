import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, X, GripVertical, Image as ImageIcon, Mountain as MountainIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import RichTextEditor from "@/components/magazine/RichTextEditor";
import MountainPickerModal from "@/components/magazine/MountainPickerModal";
import MountainRefCard from "@/components/magazine/MountainRefCard";

const CATEGORIES = ["등산 코스", "등산 안전", "장비", "계절 추천", "초보 가이드", "등산 가이드"];

type BlockType = "heading" | "image_text" | "text_only" | "tip" | "mountain_ref";

interface Block {
  id?: string;
  block_type: BlockType;
  heading_text?: string | null;
  image_url?: string | null;
  image_caption?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  mountain_id?: number | null;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "소제목",
  image_text: "사진 + 설명",
  text_only: "본문 (서식 가능)",
  tip: "팁 박스",
  mountain_ref: "산 정보 카드",
};

const AdminMagazineEditorPage = () => {
  const { id: postId } = useParams<{ id: string }>();
  const isEdit = !!postId;
  const nav = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    cover_image_url: "" as string | null,
    description: "",
    is_featured: false,
  });
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    if (!isEdit || !isAdmin) return;
    (async () => {
      setLoading(true);
      const { data: post } = await (supabase as any)
        .from("magazine_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();
      if (post) {
        setForm({
          title: post.title || "",
          category: post.category || CATEGORIES[0],
          cover_image_url: post.cover_image_url || "",
          description: post.description || "",
          is_featured: !!post.is_featured,
        });
      }
      const { data: bs } = await (supabase as any)
        .from("magazine_content_blocks")
        .select("*")
        .eq("post_id", postId)
        .order("block_order");
      setBlocks((bs || []).map((b: any) => ({
        id: b.id,
        block_type: b.block_type as BlockType,
        heading_text: b.heading_text,
        image_url: b.image_url,
        image_caption: b.image_caption,
        body_text: b.body_text,
        body_html: b.body_html,
        mountain_id: b.mountain_id ?? null,
      })));
      setLoading(false);
    })();
  }, [postId, isEdit, isAdmin]);

  if (adminLoading) return <div className="py-16 text-center text-muted-foreground text-sm">로딩 중...</div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const uploadImage = async (file: File, folder: "covers" | "blocks"): Promise<string | null> => {
    try {
      const { compressImage } = await import("@/lib/imageUpload");
      const compressed = await compressImage(file, "general");
      if (!compressed) return null;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${folder}/${Date.now()}_${safeName.replace(/\.[^.]+$/, "")}.jpg`;
      const { error } = await supabase.storage.from("magazine-images").upload(path, compressed, { contentType: "image/jpeg" });
      if (error) throw error;
      return supabase.storage.from("magazine-images").getPublicUrl(path).data.publicUrl;
    } catch (e: any) {
      toast.error(e?.message || "업로드 실패");
      return null;
    }
  };

  const onCoverSelect = async (file: File) => {
    setUploadingCover(true);
    const url = await uploadImage(file, "covers");
    if (url) setForm((f) => ({ ...f, cover_image_url: url }));
    setUploadingCover(false);
  };

  const addBlock = (type: BlockType) => {
    setBlocks((bs) => [...bs, { block_type: type }]);
    setShowAddSheet(false);
  };

  const updateBlock = (i: number, patch: Partial<Block>) => {
    setBlocks((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };

  const removeBlock = (i: number) => {
    setBlocks((bs) => bs.filter((_, idx) => idx !== i));
  };

  const moveBlock = (i: number, dir: -1 | 1) => {
    setBlocks((bs) => {
      const next = [...bs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return bs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const savePost = async (isPublished: boolean) => {
    if (!form.title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        category: form.category,
        cover_image_url: form.cover_image_url || null,
        description: form.description || null,
        is_featured: form.is_featured,
        is_published: isPublished,
        created_by: user.id,
      };
      if (postId) payload.id = postId;

      const { data: post, error } = await (supabase as any)
        .from("magazine_posts")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;

      await (supabase as any)
        .from("magazine_content_blocks")
        .delete()
        .eq("post_id", post.id);

      const blocksToInsert = blocks.map((b, i) => ({
        post_id: post.id,
        block_order: i + 1,
        block_type: b.block_type,
        image_url: b.image_url || null,
        image_caption: b.image_caption || null,
        body_text: b.body_text || null,
        heading_text: b.heading_text || null,
      }));
      if (blocksToInsert.length > 0) {
        const { error: bErr } = await (supabase as any)
          .from("magazine_content_blocks")
          .insert(blocksToInsert);
        if (bErr) throw bErr;
      }

      toast.success(isPublished ? "발행되었어요!" : "임시저장 되었어요");
      nav("/admin/magazine");
    } catch (e: any) {
      toast.error(e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground text-sm">불러오는 중...</div>;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "0.5px solid #EAE7DD",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="pb-56 -mx-5">
      {/* Top bar */}
      <div
        className="sticky top-14 z-10 flex items-center justify-between bg-background"
        style={{ padding: "12px 16px", borderBottom: "0.5px solid #EAE7DD" }}
      >
        <button onClick={() => nav(-1)} className="flex items-center gap-1 text-foreground" style={{ fontSize: 13 }}>
          <ArrowLeft style={{ width: 18, height: 18 }} /> 뒤로
        </button>
        <h1 className="font-bold text-foreground" style={{ fontSize: 15 }}>
          {isEdit ? "글 편집" : "새 글 작성"}
        </h1>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: "16px" }}>
        {/* SECTION 1 — 기본 정보 */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="글 제목을 입력하세요"
            style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }}
          />

          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={inputStyle}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 20,
                border: "0.5px solid #639922",
                color: "#3B6D11",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: "transparent",
              }}
            >
              <ImageIcon style={{ width: 14, height: 14 }} />
              {uploadingCover ? "업로드 중..." : "대표 이미지 선택"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onCoverSelect(f);
                  e.target.value = "";
                }}
              />
            </label>
            {form.cover_image_url && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden" }}>
                <img
                  src={form.cover_image_url}
                  alt=""
                  style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                />
              </div>
            )}
          </div>

          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="목록에서 보이는 한 줄 설명"
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 8,
              border: "0.5px solid #EAE7DD",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <span>메인에 크게 노출</span>
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: "#639922" }}
            />
          </label>
        </section>

        {/* SECTION 2 — 콘텐츠 블록 */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#639922", marginBottom: 8 }}>
            콘텐츠
          </h2>

          {blocks.length === 0 && (
            <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", padding: "16px 0" }}>
              아래 "블록 추가"로 콘텐츠를 만들어주세요
            </p>
          )}

          {blocks.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                padding: "12px 0",
                borderBottom: "0.5px solid #EAE7DD",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", paddingTop: 4 }}>
                <button onClick={() => moveBlock(i, -1)} style={{ fontSize: 14, color: "#888", lineHeight: 1 }}>▲</button>
                <GripVertical style={{ width: 14, height: 14, color: "#888" }} />
                <button onClick={() => moveBlock(i, 1)} style={{ fontSize: 14, color: "#888", lineHeight: 1 }}>▼</button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#639922", marginBottom: 6, fontWeight: 600 }}>
                  {BLOCK_LABELS[b.block_type]}
                </div>

                {b.block_type === "heading" && (
                  <input
                    type="text"
                    value={b.heading_text || ""}
                    onChange={(e) => updateBlock(i, { heading_text: e.target.value })}
                    placeholder="소제목"
                    style={{ ...inputStyle, borderLeft: "3px solid #639922", fontWeight: 600 }}
                  />
                )}

                {b.block_type === "image_text" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 16,
                        border: "0.5px solid #639922",
                        color: "#3B6D11",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      <ImageIcon style={{ width: 12, height: 12 }} />
                      {b.image_url ? "사진 변경" : "사진 선택"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const url = await uploadImage(f, "blocks");
                            if (url) updateBlock(i, { image_url: url });
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {b.image_url && (
                      <img
                        src={b.image_url}
                        alt=""
                        style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
                      />
                    )}
                    <input
                      type="text"
                      value={b.image_caption || ""}
                      onChange={(e) => updateBlock(i, { image_caption: e.target.value })}
                      placeholder="사진 설명 (선택)"
                      style={{ ...inputStyle, fontSize: 13 }}
                    />
                    <textarea
                      value={b.body_text || ""}
                      onChange={(e) => updateBlock(i, { body_text: e.target.value })}
                      placeholder="사진 아래 본문 내용"
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </div>
                )}

                {b.block_type === "text_only" && (
                  <textarea
                    value={b.body_text || ""}
                    onChange={(e) => updateBlock(i, { body_text: e.target.value })}
                    placeholder="본문 내용을 입력하세요"
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                )}

                {b.block_type === "tip" && (
                  <textarea
                    value={b.body_text || ""}
                    onChange={(e) => updateBlock(i, { body_text: e.target.value })}
                    placeholder="팁 내용을 입력하세요"
                    rows={2}
                    style={{
                      ...inputStyle,
                      background: "#EAF3DE",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                )}
              </div>

              <button
                onClick={() => removeBlock(i)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: "transparent",
                  color: "#888",
                  fontSize: 16,
                  lineHeight: 1,
                  alignSelf: "flex-start",
                }}
                aria-label="삭제"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}

          {/* Add block */}
          <div style={{ position: "relative", marginTop: 16 }}>
            <button
              onClick={() => setShowAddSheet((s) => !s)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                background: "#EAF3DE",
                color: "#3B6D11",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> 블록 추가
            </button>

            {showAddSheet && (
              <div
                style={{
                  marginTop: 8,
                  background: "hsl(var(--background))",
                  border: "0.5px solid #EAE7DD",
                  borderRadius: 12,
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => addBlock(t)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      background: "hsl(var(--background-secondary, var(--muted)))",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {BLOCK_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SECTION 3 — Bottom actions */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          background: "hsl(var(--background))",
          borderTop: "0.5px solid #EAE7DD",
          padding: "12px 16px",
          display: "flex",
          gap: 8,
          zIndex: 20,
        }}
      >
        <button
          disabled={saving}
          onClick={() => savePost(false)}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 24,
            border: "0.5px solid #639922",
            color: "#3B6D11",
            background: "transparent",
            fontSize: 14,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          임시저장
        </button>
        <button
          disabled={saving}
          onClick={() => savePost(true)}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 24,
            background: "#639922",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          발행하기
        </button>
      </div>
    </div>
  );
};

export default AdminMagazineEditorPage;
