import { useState, useEffect } from "react";
import { useMagazine, MagazinePost, MagazineSlide } from "@/hooks/useMagazine";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Star, Image, GripVertical } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["등산 코스", "산 소개", "등산 장비", "등산 안전", "맛집 추천"];

const AdminMagazinePage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { posts, loading, fetchPosts, createPost, updatePost, deletePost, addSlide, deleteSlide, fetchSlides, uploadImage } = useMagazine();
  const { toast } = useToast();

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingPost, setEditingPost] = useState<MagazinePost | null>(null);
  const [editSlides, setEditSlides] = useState<MagazineSlide[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [slideFiles, setSlideFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (adminLoading) return <div className="py-16 text-center text-muted-foreground">로딩 중...</div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const resetForm = () => {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setIsFeatured(false);
    setCoverFile(null);
    setSlideFiles([]);
    setEditingPost(null);
    setEditSlides([]);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let coverUrl: string | undefined;
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "covers");
      }

      const post = await createPost({
        title,
        category,
        description,
        cover_image_url: coverUrl,
        is_featured: isFeatured,
      });

      if (post && slideFiles.length > 0) {
        for (let i = 0; i < slideFiles.length; i++) {
          const url = await uploadImage(slideFiles[i], "slides");
          await addSlide(post.id, url, i);
        }
      }

      toast({ title: "매거진이 등록되었습니다" });
      resetForm();
      setMode("list");
      fetchPosts();
    } catch (e: any) {
      toast({ title: "오류가 발생했습니다", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (post: MagazinePost) => {
    setEditingPost(post);
    setTitle(post.title);
    setCategory(post.category);
    setDescription(post.description || "");
    setIsFeatured(post.is_featured);
    const slides = await fetchSlides(post.id);
    setEditSlides(slides);
    setMode("edit");
  };

  const handleUpdate = async () => {
    if (!editingPost) return;
    setSubmitting(true);
    try {
      let coverUrl = editingPost.cover_image_url;
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "covers");
      }

      await updatePost(editingPost.id, {
        title,
        category,
        description,
        cover_image_url: coverUrl,
        is_featured: isFeatured,
      } as any);

      // Upload new slides
      if (slideFiles.length > 0) {
        const maxOrder = editSlides.length > 0 ? Math.max(...editSlides.map((s) => s.slide_order)) + 1 : 0;
        for (let i = 0; i < slideFiles.length; i++) {
          const url = await uploadImage(slideFiles[i], "slides");
          await addSlide(editingPost.id, url, maxOrder + i);
        }
      }

      toast({ title: "매거진이 수정되었습니다" });
      resetForm();
      setMode("list");
      fetchPosts();
    } catch (e: any) {
      toast({ title: "오류가 발생했습니다", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deletePost(id);
      toast({ title: "삭제되었습니다" });
      fetchPosts();
    } catch (e: any) {
      toast({ title: "삭제 실패", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    await deleteSlide(slideId);
    setEditSlides((prev) => prev.filter((s) => s.id !== slideId));
  };

  const handleToggleFeatured = async (post: MagazinePost) => {
    await updatePost(post.id, { is_featured: !post.is_featured } as any);
    fetchPosts();
    toast({ title: post.is_featured ? "팝업 해제됨" : "팝업 설정됨" });
  };

  // ── Form UI ──
  const renderForm = () => (
    <div className="space-y-5">
      <div>
        <Label className="text-xs font-semibold">제목</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="매거진 제목" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs font-semibold">카테고리</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold">설명</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="간단한 설명"
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none h-20"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold">커버 이미지</Label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-xs"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold">슬라이드 이미지 (여러 장 선택 가능)</Label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setSlideFiles(Array.from(e.target.files || []))}
          className="mt-1 block w-full text-xs"
        />
        {slideFiles.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">{slideFiles.length}장 선택됨</p>
        )}
      </div>

      {/* Existing slides (edit mode) */}
      {editSlides.length > 0 && (
        <div>
          <Label className="text-xs font-semibold">기존 슬라이드</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {editSlides.map((slide) => (
              <div key={slide.id} className="relative rounded-lg overflow-hidden aspect-square group">
                <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeleteSlide(slide.id)}
                  className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[8px] text-white">
                  #{slide.slide_order + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="featured"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="featured" className="text-xs">앱 실행 시 팝업으로 표시</Label>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={mode === "create" ? handleCreate : handleUpdate}
          disabled={submitting}
          className="flex-1 rounded-xl"
        >
          {submitting ? "업로드 중..." : mode === "create" ? "등록하기" : "수정하기"}
        </Button>
        <Button variant="outline" onClick={() => { resetForm(); setMode("list"); }} className="rounded-xl">
          취소
        </Button>
      </div>
    </div>
  );

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/profile" className="rounded-xl p-2 hover:bg-accent transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">매거진 관리</h1>
      </div>

      {mode === "list" ? (
        <>
          <Button onClick={() => { resetForm(); setMode("create"); }} className="w-full rounded-xl mb-5 gap-2">
            <Plus className="h-4 w-4" /> 새 매거진 만들기
          </Button>

          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">불러오는 중...</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">등록된 매거진이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-2xl bg-card border border-border p-4 flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted">
                    {post.cover_image_url ? (
                      <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🏔️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground truncate">{post.title}</h3>
                        <p className="text-[10px] text-muted-foreground">{post.category}</p>
                      </div>
                      {post.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(post)}
                        className="text-[10px] font-semibold text-amber-600 hover:underline"
                      >
                        {post.is_featured ? "팝업 해제" : "팝업 설정"}
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-[10px] font-semibold text-destructive hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        renderForm()
      )}
    </div>
  );
};

export default AdminMagazinePage;
