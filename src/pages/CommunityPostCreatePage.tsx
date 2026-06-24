import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { createCommunityPost, categoryLabel, type CommunityCategory } from "@/hooks/useCommunityPosts";
import { compressImageToDataUrl, IMAGE_ACCEPT } from "@/lib/imageUpload";

const CATEGORIES: CommunityCategory[] = ["story", "mountain_info", "gear"];
const MAX_IMAGES = 5;

export default function CommunityPostCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = new URLSearchParams(window.location.search);
  const initialCat = (params.get("category") as CommunityCategory) || "story";
  const [category, setCategory] = useState<CommunityCategory>(initialCat);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        로그인이 필요합니다.
        <div className="mt-4"><Button onClick={() => navigate("/auth")}>로그인</Button></div>
      </div>
    );
  }

  const onSubmit = async () => {
    if (!body.trim()) { toast({ title: "본문을 입력해주세요", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const created = await createCommunityPost({
        category,
        title: title.trim() || undefined,
        body: body.trim(),
        images,
      }, user.id);
      toast({ title: "게시글이 등록되었어요" });
      navigate(`/community/${created.id}`, { replace: true });
    } catch (e: any) {
      toast({ title: "등록 실패", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleImages = async (files: FileList | null) => {
    if (!files?.length) return;

    const availableSlots = MAX_IMAGES - images.length;
    if (availableSlots <= 0) {
      toast({ title: `사진은 최대 ${MAX_IMAGES}장까지 올릴 수 있어요`, variant: "destructive" });
      return;
    }

    const selected = Array.from(files).slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast({ title: `사진은 최대 ${MAX_IMAGES}장까지 추가됩니다` });
    }

    setProcessingImages(true);
    try {
      const processed = await Promise.all(
        selected.map((file) => compressImageToDataUrl(file, "general"))
      );
      const validImages = processed.filter(Boolean) as string[];
      setImages((prev) => [...prev, ...validImages].slice(0, MAX_IMAGES));
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="-mx-4 -mt-6 pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary" aria-label="뒤로">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">새 글 작성</h1>
      </div>
      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="text-xs font-semibold mb-2">카테고리</p>
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
              >
                {categoryLabel[c]}
              </button>
            ))}
          </div>
        </div>
        <Input placeholder="제목 (선택)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((image, index) => (
                <div key={`${image.slice(0, 24)}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
                  <img src={image} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background"
                    aria-label="사진 삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Textarea
            placeholder="사진과 함께 산행 이야기, 코스 정보, 장비 후기를 자유롭게 남겨보세요"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            maxLength={4000}
            className="min-h-[260px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImages || images.length >= MAX_IMAGES}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
              {processingImages ? "사진 처리 중..." : "사진 추가"}
            </button>
            <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => handleImages(e.target.files)}
            />
          </div>
        </div>
        <Button onClick={onSubmit} disabled={saving || processingImages || !body.trim()} className="w-full">
          {saving ? "등록 중..." : "등록하기"}
        </Button>
      </div>
    </div>
  );
}
