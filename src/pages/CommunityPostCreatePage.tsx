import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { createCommunityPost, categoryLabel, type CommunityCategory } from "@/hooks/useCommunityPosts";

const CATEGORIES: CommunityCategory[] = ["story", "mountain_info", "gear"];

export default function CommunityPostCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const initialCat = (params.get("category") as CommunityCategory) || "story";
  const [category, setCategory] = useState<CommunityCategory>(initialCat);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
      const created = await createCommunityPost({ category, title: title.trim() || undefined, body: body.trim() }, user.id);
      toast({ title: "게시글이 등록되었어요" });
      navigate(`/community/${created.id}`, { replace: true });
    } catch (e: any) {
      toast({ title: "등록 실패", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
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
        <Textarea placeholder="본문을 입력하세요" value={body} onChange={(e) => setBody(e.target.value)} rows={10} maxLength={4000} />
        <Button onClick={onSubmit} disabled={saving || !body.trim()} className="w-full">
          {saving ? "등록 중..." : "등록하기"}
        </Button>
      </div>
    </div>
  );
}
