import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMountains } from "@/contexts/MountainsContext";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { useChallenges } from "@/hooks/useChallenges";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Mountain, Camera, X, Clock, Route, Globe, Users, Lock, Loader2, Plus, ChevronDown,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface JournalFormProps {
  editJournal?: HikingJournal | null;
  onClose: () => void;
  onSaved: (saved?: { mode: "create" | "update"; journal: HikingJournal }) => void;
  prefillMountainId?: number;
  prefillDate?: string;
}
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
};

const weatherOptions = ["☀️ 맑음", "⛅ 구름", "☁️ 흐림", "🌧️ 비", "❄️ 눈", "🌫️ 안개"];
const difficultyOptions = ["쉬움", "보통", "어려움", "매우 어려움"];
const visibilityOptions = [
  { value: "public", label: "전체 공개", icon: Globe },
  { value: "friends", label: "친구 공개", icon: Users },
  { value: "private", label: "나만 보기", icon: Lock },
];
function PhotoPickerButton({
  saving,
  onNativePick,
  onWebFiles,
}: {
  saving: boolean;
  onNativePick: () => void | Promise<void>;
  onWebFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        setIsNative(Capacitor.isNativePlatform());
      } catch {
        setIsNative(false);
      }
    })();
  }, []);

  const baseClass = cn(
    "flex shrink-0 flex-col items-center justify-center border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors gap-1",
    saving && "pointer-events-none opacity-50"
  );
  const baseStyle = { width: 80, height: 80, borderRadius: 8 } as const;

  if (isNative) {
    return (
      <button
        type="button"
        onClick={() => { void onNativePick(); }}
        disabled={saving}
        className={baseClass}
        style={baseStyle}
      >
        <Camera className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">사진 추가</span>
      </button>
    );
  }

  return (
    <label className={baseClass} style={baseStyle}>
      <Camera className="h-4 w-4 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">사진 추가</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={onWebFiles}
        disabled={saving}
      />
    </label>
  );
}

export function JournalForm({ editJournal, onClose, onSaved, prefillMountainId, prefillDate }: JournalFormProps) {
  const { mountains } = useMountains();
  const { user } = useAuth();
  const { createJournal, updateJournal, uploadPhoto } = useHikingJournals();
  const { recalculateProgress } = useChallenges();
  const { friends } = useFriends();
  const { toast } = useToast();
  const { isPrivateAccount, defaultJournalVisibility } = usePrivacySettings();

  const [mountainIds, setMountainIds] = useState<number[]>(
    editJournal?.mountain_ids?.length
      ? (editJournal.mountain_ids as number[])
      : editJournal?.mountain_id
        ? [editJournal.mountain_id]
        : prefillMountainId
          ? [prefillMountainId]
          : []
  );
  const [hikedAt, setHikedAt] = useState(editJournal?.hiked_at || prefillDate || new Date().toISOString().split("T")[0]);
  const [courseName, setCourseName] = useState(editJournal?.course_name || "");
  const [courseStartingPoint, setCourseStartingPoint] = useState(editJournal?.course_starting_point || "");
  const [courseNotes, setCourseNotes] = useState(editJournal?.course_notes || "");
  const [duration, setDuration] = useState(editJournal?.duration || "");
  const [difficulty, setDifficulty] = useState(editJournal?.difficulty || "");
  const [weather, setWeather] = useState(editJournal?.weather || "");
  const [notes, setNotes] = useState(editJournal?.notes || "");
  const [visibility, setVisibility] = useState(
    editJournal?.visibility || (isPrivateAccount ? (defaultJournalVisibility === "public" ? "friends" : defaultJournalVisibility) : defaultJournalVisibility)
  );
  const [photos, setPhotos] = useState<string[]>(editJournal?.photos || []);
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [taggedFriends, setTaggedFriends] = useState<string[]>(editJournal?.tagged_friends || []);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [mountainSearch, setMountainSearch] = useState("");
  const [showMountainSearch, setShowMountainSearch] = useState(false);
  const [showOptional, setShowOptional] = useState(!!editJournal);
  const [plannedItems, setPlannedItems] = useState<{ mountain: any; plan: any }[]>([]);
  const [planLoading, setPlanLoading] = useState(true);

  const MAX_PHOTOS = 5;

  useEffect(() => {
    if (!user?.id) {
      setPlanLoading(false);
      return;
    }
    if (mountains.length === 0) return;
    (async () => {
      try {
        const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data } = await (supabase as any)
          .from("hiking_plans")
          .select("id, mountain_id, trail_name, planned_date, trail_id")
          .eq("creator_id", user.id)
          .gte("planned_date", past30)
          .lte("planned_date", future30)
          .order("planned_date", { ascending: false })
          .limit(10);
        if (data) {
          const items = data
            .map((plan: any) => ({ mountain: mountains.find((m) => m.id === plan.mountain_id), plan }))
            .filter((it: any) => it.mountain);
          setPlannedItems(items);
        }
      } finally {
        setPlanLoading(false);
      }
    })();
  }, [user?.id, mountains]);


  const isEdit = !!editJournal;

  const filteredMountains = mountainSearch
    ? mountains.filter((m) =>
        !mountainIds.includes(m.id) &&
        (m.nameKo.includes(mountainSearch) || m.name.toLowerCase().includes(mountainSearch.toLowerCase()))
      )
    : mountains.filter((m) => !mountainIds.includes(m.id));

  const selectedMountains = mountainIds.map((id) => mountains.find((m) => m.id === id)).filter(Boolean) as typeof mountains;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

  const addFilesToPending = async (files: File[]) => {
    const currentTotal = photos.length + pendingPhotos.length;
    const remaining = MAX_PHOTOS - currentTotal;
    if (remaining <= 0 || files.length > remaining) {
      toast({ title: `사진은 최대 ${MAX_PHOTOS}장까지 첨부 가능해요`, variant: "destructive" });
      if (remaining <= 0) return;
    }
    const incoming = files.slice(0, Math.max(0, remaining));
    const filtered: File[] = [];
    for (const file of incoming) {
      if (file.type && !allowedTypes.includes(file.type)) {
        toast({ title: "JPG, PNG, WEBP 형식의 사진만 업로드 가능해요", variant: "destructive" });
        continue;
      }
      if (file.size > 30 * 1024 * 1024) {
        toast({ title: "사진 크기는 30MB 이하여야 해요", variant: "destructive" });
        continue;
      }
      filtered.push(file);
    }
    const compressed = await Promise.all(filtered.map((f) => compressImage(f)));
    const newPending = compressed.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPendingPhotos((prev) => [...prev, ...newPending]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    void addFilesToPending(Array.from(files));
    e.target.value = "";
  };


  const handleNativePhotoPick = async () => {
    try {
      const remaining = MAX_PHOTOS - (photos.length + pendingPhotos.length);
      if (remaining <= 0) {
        toast({ title: `사진은 최대 ${MAX_PHOTOS}장까지 첨부 가능해요`, variant: "destructive" });
        return;
      }
      const { Camera } = await import("@capacitor/camera");
      const result = await Camera.pickImages({ quality: 80, limit: remaining });
      const photosArr = result?.photos || [];
      if (photosArr.length === 0) return;
      const files = await Promise.all(
        photosArr.map(async (photo, idx) => {
          const src = photo.webPath || (photo as any).path;
          const response = await fetch(src as string);
          const blob = await response.blob();
          const ext = (photo.format || "jpeg").toLowerCase();
          const mime = blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
          return new File([blob], `photo_${Date.now()}_${idx}.${ext === "jpeg" ? "jpg" : ext}`, { type: mime });
        })
      );
      await addFilesToPending(files);
    } catch (err: any) {
      // User cancellation throws — ignore silently
      const msg = String(err?.message || err || "");
      if (/cancel/i.test(msg)) return;
      console.error("Native photo pick error:", err);
      toast({ title: "사진을 불러오지 못했어요", variant: "destructive" });
    }
  };


  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removePendingPhoto = (index: number) => {
    setPendingPhotos((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const toggleFriend = (friendId: string) => {
    setTaggedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSubmit = async () => {
    if (mountainIds.length === 0) {
      toast({ title: "산을 선택해주세요", variant: "destructive" });
      return;
    }
    setSaving(true);

    // 1. Upload pending photos first
    let uploadedUrls: string[] = [];
    if (pendingPhotos.length > 0) {
      setUploadProgress({ current: 0, total: pendingPhotos.length });
      try {
        for (let i = 0; i < pendingPhotos.length; i++) {
          const url = await uploadPhoto(pendingPhotos[i].file);
          if (!url) throw new Error("사진 업로드에 실패했어요");
          uploadedUrls.push(url);
          setUploadProgress({ current: i + 1, total: pendingPhotos.length });
        }
      } catch (err: any) {
        console.error("Photo upload error:", err);
        toast({ title: err.message || "사진 업로드 실패", variant: "destructive" });
        setUploadProgress(null);
        setSaving(false);
        return;
      }
      setUploadProgress(null);
    }

    const allPhotos = [...photos, ...uploadedUrls];

    const journalData = {
      mountain_id: Number(mountainIds[0]),
      mountain_ids: mountainIds,
      hiked_at: hikedAt,
      course_name: courseName || undefined,
      course_starting_point: courseStartingPoint || undefined,
      course_notes: courseNotes || undefined,
      duration: duration || undefined,
      difficulty: difficulty || undefined,
      weather: weather || undefined,
      notes: notes || undefined,
      photos: allPhotos,
      tagged_friends: taggedFriends,
      visibility,
    };

    // Debug: log payload + auth state before submit
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const authUser = (await supabase.auth.getUser()).data.user;
      console.log("Submitting journal:", {
        user_id: authUser?.id,
        user_id_from_context: user?.id,
        mountain_id: journalData.mountain_id,
        mountain_id_type: typeof journalData.mountain_id,
        hiked_at: journalData.hiked_at,
        visibility: journalData.visibility,
        photos_count: photos.length,
        tagged_friends_count: taggedFriends.length,
        isEdit,
      });
    } catch (e) {
      console.warn("Pre-submit debug log failed:", e);
    }

    try {
      if (isEdit && editJournal) {
        const { error } = await updateJournal(editJournal.id, journalData);
        if (error) {
          console.error("Journal update error:", JSON.stringify(error));
          const msg = (error as any).message || "알 수 없는 오류";
          const code = (error as any).code || "n/a";
          toast({
            title: "수정 실패",
            description: `${msg} (code: ${code})`,
            variant: "destructive",
          });
          alert(`저장 실패: ${msg} / code: ${code}`);
        } else {
          toast({ title: "일지를 수정했습니다 ✏️" });
          onSaved({ mode: "update", journal: { ...(editJournal as HikingJournal), ...(journalData as any) } });
        }
      } else {
        const { data: createdData, error } = await createJournal(journalData);
        if (error) {
          console.error("Journal insert error:", JSON.stringify(error));
          const msg = (error as any).message || "알 수 없는 오류";
          const code = (error as any).code || "n/a";
          toast({
            title: "작성 실패",
            description: `${msg} (code: ${code})`,
            variant: "destructive",
          });
          alert(`저장 실패: ${msg} / code: ${code}`);
        } else {
          toast({ title: "일지를 작성했습니다 🏔️" });
          // Sync local completion + challenge progress + suggest summit claim
          // Sync local completion (localStorage) so achievements/dashboard reflect immediately
          try {
            const STORAGE_KEY = "korea-100-mountains";
            const raw = localStorage.getItem(STORAGE_KEY);
            const records: any[] = raw ? JSON.parse(raw) : [];
            const mid = Number(mountainIds[0]);
            if (mid && !records.some((r) => r.mountainId === mid)) {
              records.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                mountainId: mid, completedAt: new Date().toISOString(),
                notes: "", weather: "", photos: [], taggedFriends: [],
              });
              localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
            }
          } catch {}
          try {
            const { updateChallengeProgress } = await import("@/lib/challengeUtils");
            updateChallengeProgress(user?.id);
          } catch {}
          try { recalculateProgress(); } catch {}
          try {
            const { toast: sonnerToast } = await import("sonner");
            sonnerToast.success("📔 일지가 저장됐어요! 정상 인증도 남겨볼까요?", {
              action: {
                label: "인증하기",
                onClick: () => { window.location.href = "/summit-claim"; },
              },
              duration: 6000,
            });
          } catch {}
          onSaved(createdData ? { mode: "create", journal: createdData } : undefined);
        }
      }
    } catch (e: any) {
      console.error("Unexpected error during journal submission:", e);
      const msg = e?.message || String(e);
      toast({
        title: "예상치 못한 오류",
        description: msg,
        variant: "destructive",
      });
      alert(`예상치 못한 오류: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const acceptedFriends = friends.filter((f) => f.status === "accepted");

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl overflow-y-auto pb-24 sm:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            {isEdit ? "일지 수정" : "등산 일지 작성"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* ═══ REQUIRED: Mountain Selection ═══ */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">산 선택 * <span className="text-muted-foreground font-normal">(여러 개 가능)</span></label>
            {selectedMountains.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {selectedMountains.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                    <Mountain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{m.nameKo}</span>
                    <span className="text-[10px] text-muted-foreground">{m.region} · {m.height}m</span>
                    {idx > 0 && (
                      <button
                        onClick={() => setMountainIds((prev) => prev.filter((id) => id !== m.id))}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {idx === 0 && selectedMountains.length > 1 && (
                      <span className="ml-auto text-[9px] text-muted-foreground">대표</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {showMountainSearch ? (
              <div>
                {user?.id && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">🗓 계획한 등산</p>
                    {planLoading ? (
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                        불러오는 중...
                      </div>
                    ) : plannedItems.filter(({ mountain }) => !mountainIds.includes(mountain.id)).length > 0 ? (
                      <div className="rounded-lg border border-border bg-primary/5 overflow-hidden">
                        {plannedItems
                          .filter(({ mountain }) => !mountainIds.includes(mountain.id))
                          .map(({ mountain, plan }) => (
                            <button
                              key={plan.id}
                              onClick={() => {
                                setMountainIds((prev) => [...prev, mountain.id]);
                                if (plan.trail_name && !courseName) setCourseName(plan.trail_name);
                                if (plan.planned_date) setHikedAt(plan.planned_date);
                                setMountainSearch("");
                                setShowMountainSearch(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex items-center gap-2 border-b border-border/40 last:border-b-0"
                            >
                              <Mountain className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-foreground font-medium">{mountain.nameKo}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto truncate">
                                {plan.planned_date}{plan.trail_name ? ` · ${plan.trail_name}` : ""}
                              </span>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                        최근 계획한 등산이 없어요
                      </div>
                    )}
                  </div>
                )}
                {user?.id && (
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">🔍 전체 산 검색</p>
                )}
                <Input
                  placeholder="산 이름 검색..."
                  value={mountainSearch}
                  onChange={(e) => setMountainSearch(e.target.value)}
                  className="mb-2"
                  autoFocus
                />
                {mountainSearch && (

                  <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-background mb-2">
                    {filteredMountains.slice(0, 10).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMountainIds((prev) => [...prev, m.id]);
                          setMountainSearch("");
                          setShowMountainSearch(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
                      >
                        <Mountain className="h-3.5 w-3.5 text-primary" />
                        <span className="text-foreground">{m.nameKo}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{m.region} · {m.height}m</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowMountainSearch(false); setMountainSearch(""); }}
                  className="text-xs text-muted-foreground"
                >
                  취소
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMountainSearch(true)}
                className="rounded-full gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {selectedMountains.length === 0 ? "산 선택" : "산 추가"}
              </Button>
            )}
          </div>

          {/* ═══ REQUIRED: Date ═══ */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">등산 날짜 *</label>
            <Input type="date" value={hikedAt} onChange={(e) => setHikedAt(e.target.value)} />
          </div>

          {/* ═══ Visibility ═══ */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">공개 범위</label>
            <div className="flex gap-2">
              {visibilityOptions.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.value}
                    onClick={() => setVisibility(v.value as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-colors",
                      visibility === v.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {v.label}
                  </button>
                );
              })}
          </div>
          </div>

          {/* ═══ Memo (always visible, optional) ═══ */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block" style={{ fontSize: 12 }}>한 줄 메모 (선택)</label>
            <textarea
              placeholder="오늘 등산 한 줄 소감을 남겨보세요..."
              value={notes}
              onChange={(e) => { if (e.target.value.length <= 100) setNotes(e.target.value); }}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ fontSize: 13, borderWidth: "0.5px", padding: "10px 12px" }}
            />
            <p className="text-right mt-1" style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{notes.length}/100</p>
          </div>

          {/* ═══ Toggle for optional fields ═══ */}
          <button
            onClick={() => setShowOptional((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5"
            style={{ fontSize: 13, color: "#3B6D11" }}
          >
            {showOptional ? "간단히 기록하기" : "+ 더 자세히 기록하기"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showOptional && "rotate-180")} />
          </button>

          {/* ═══ OPTIONAL FIELDS ═══ */}
          {showOptional && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Course info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">코스명</label>
                  <Input placeholder="예: 백운대 코스" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">출발점</label>
                  <Input placeholder="예: 북한산성 탐방지원센터" value={courseStartingPoint} onChange={(e) => setCourseStartingPoint(e.target.value)} />
                </div>
              </div>

              {/* Duration & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">소요 시간</label>
                  <Input placeholder="예: 3시간 30분" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">난이도</label>
                  <div className="flex flex-wrap gap-1.5">
                    {difficultyOptions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(difficulty === d ? "" : d)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                          difficulty === d
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-background text-muted-foreground hover:bg-secondary/50"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weather */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">날씨</label>
                <div className="flex flex-wrap gap-1.5">
                  {weatherOptions.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeather(weather === w ? "" : w)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                        weather === w
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary/50"
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">사진</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((url, i) => (
                    <div
                      key={`u-${i}`}
                      className="relative shrink-0 overflow-hidden border border-border"
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                    >
                      <img src={url} alt="" className="h-full w-full" style={{ objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 bg-foreground/60 text-background rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {pendingPhotos.map((p, i) => (
                    <div
                      key={`p-${i}`}
                      className="relative shrink-0 overflow-hidden border border-border"
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                    >
                      <img src={p.preview} alt="" className="h-full w-full" style={{ objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => removePendingPhoto(i)}
                        className="absolute top-0.5 right-0.5 bg-foreground/60 text-background rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length + pendingPhotos.length < MAX_PHOTOS && (
                    <PhotoPickerButton
                      saving={saving}
                      onNativePick={handleNativePhotoPick}
                      onWebFiles={handlePhotoSelect}
                    />
                  )}

                </div>
                <p className="mt-1" style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                  (최대 {MAX_PHOTOS}장)
                </p>
              </div>

              {/* Course Notes */}

              {/* Course Notes */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">코스 메모</label>
                <Textarea placeholder="코스에 대한 참고사항..." value={courseNotes} onChange={(e) => setCourseNotes(e.target.value)} rows={2} />
              </div>

              {/* Tag Friends */}
              {acceptedFriends.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">함께한 친구 태그</label>
                  <div className="flex flex-wrap gap-1.5">
                    {acceptedFriends.map((f) => {
                      const fId = f.friendProfile.user_id;
                      const isTagged = taggedFriends.includes(fId);
                      return (
                        <button
                          key={fId}
                          onClick={() => toggleFriend(fId)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            isTagged
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-secondary/50"
                          )}
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={f.friendProfile.avatar_url || ""} />
                            <AvatarFallback className="text-[7px]">{f.friendProfile.nickname?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          {f.friendProfile.nickname || "친구"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 z-[61] bg-card border-t border-border p-4 pb-6 sm:pb-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">취소</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || mountainIds.length === 0}
            className="flex-1 text-white"
            style={{ background: "hsl(var(--brand-forest))" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {uploadProgress
              ? `사진 업로드 중 (${uploadProgress.current}/${uploadProgress.total})...`
              : saving
                ? "저장 중..."
                : isEdit
                  ? "수정 완료"
                  : showOptional
                    ? "상세 기록 저장"
                    : "빠른 기록 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

