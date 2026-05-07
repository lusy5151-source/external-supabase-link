import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Camera,
  RefreshCw,
  X,
  Upload,
} from "lucide-react";

const PAGE_SIZE = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BUCKET = "mountain-images";

type FilterMode = "all" | "with" | "without";

interface MountainRow {
  id: number;
  name_ko: string | null;
  name: string | null;
  region: string | null;
  height: number | null;
  image_url: string | null;
  image_credit: string | null;
  image_license: string | null;
  image_position: string | null;
  is_bac100: boolean | null;
  is_bac100_blackyak: boolean | null;
}

const parsePosition = (pos: string | null | undefined): { x: number; y: number } => {
  if (!pos) return { x: 50, y: 50 };
  const m = pos.match(/(-?\d+(?:\.\d+)?)\s*%\s+(-?\d+(?:\.\d+)?)\s*%/);
  if (!m) return { x: 50, y: 50 };
  return {
    x: Math.min(100, Math.max(0, parseFloat(m[1]))),
    y: Math.min(100, Math.max(0, parseFloat(m[2]))),
  };
};

type CreditType = "self" | "public" | "other";

export default function AdminMountainPhotosPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [mountains, setMountains] = useState<MountainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("without");

  // Upload modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState<MountainRow | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creditType, setCreditType] = useState<CreditType>("self");
  const [creditSource, setCreditSource] = useState("");
  const [creditCustom, setCreditCustom] = useState("");
  const [licenseInput, setLicenseInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MountainRow | null>(null);

  // Position adjust
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [savingPos, setSavingPos] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  const loadMountains = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("mountains")
      .select(
        "id, name_ko, name, region, height, image_url, image_credit, image_license, image_position, is_bac100, is_bac100_blackyak"
      )
      .order("name_ko", { ascending: true })
      .limit(2000);
    if (error) {
      toast.error("산 목록 로드 실패: " + error.message);
    } else {
      setMountains((data || []) as MountainRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMountains();
  }, [loadMountains]);

  const stats = useMemo(() => {
    const total = mountains.length;
    const withPhoto = mountains.filter((m) => !!m.image_url).length;
    return { total, withPhoto, missing: total - withPhoto };
  }, [mountains]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = mountains.filter((m) => {
      if (filter === "with" && !m.image_url) return false;
      if (filter === "without" && m.image_url) return false;
      if (q) {
        const name = (m.name_ko || m.name || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
    // Sort: missing first when filter=all
    if (filter === "all") {
      list = [...list].sort((a, b) => {
        const aHas = a.image_url ? 1 : 0;
        const bHas = b.image_url ? 1 : 0;
        if (aHas !== bHas) return aHas - bHas;
        return (a.name_ko || "").localeCompare(b.name_ko || "");
      });
    }
    return list;
  }, [mountains, search, filter]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const progressPct = stats.total
    ? Math.round((stats.withPhoto / stats.total) * 100)
    : 0;

  const resetModal = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCreditType("self");
    setCreditSource("");
    setCreditCustom("");
    setLicenseInput("");
    setImgNatural(null);
  };

  const openUpload = (m: MountainRow) => {
    resetModal();
    setTarget(m);
    const { x, y } = parsePosition(m.image_position);
    setPosX(x);
    setPosY(y);
    setModalOpen(true);
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      toast.error("JPG, PNG, WEBP 형식만 지원해요");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("10MB 이하 파일을 사용해주세요");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setImgNatural(null);
  };

  const computeCredit = (): { credit: string | null; license: string | null } => {
    if (creditType === "self") {
      return { credit: "© 완등", license: licenseInput.trim() || "All rights reserved" };
    }
    if (creditType === "public") {
      const src = creditSource.trim() || "공공기관";
      return {
        credit: `© ${src} (공공누리1유형)`,
        license: licenseInput.trim() || "공공누리1",
      };
    }
    return {
      credit: creditCustom.trim() || null,
      license: licenseInput.trim() || null,
    };
  };

  const handleUpload = async () => {
    if (!target || !file) {
      toast.error("사진을 선택해주세요");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `mountains/${target.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { credit, license } = computeCredit();

      const positionStr = `${posX}% ${posY}%`;
      const { error: updErr } = await (supabase as any)
        .from("mountains")
        .update({
          image_url: publicUrl,
          image_credit: credit,
          image_license: license,
          image_position: positionStr,
        })
        .eq("id", target.id);
      if (updErr) {
        console.error("[Admin Photo Upload] DB update failed:", updErr);
        toast.error(`저장 실패: ${updErr.message}`);
        return;
      }

      setMountains((prev) =>
        prev.map((m) =>
          m.id === target.id
            ? { ...m, image_url: publicUrl, image_credit: credit, image_license: license, image_position: positionStr }
            : m
        )
      );
      toast.success(`📸 ${target.name_ko || target.name} 사진이 등록되었어요!`);
      setModalOpen(false);
      resetModal();
    } catch (e: any) {
      const msg = e?.message || "unknown";
      if (/permission|denied|policy/i.test(msg)) {
        toast.error("어드민 계정으로 로그인해주세요");
      } else {
        toast.error("업로드 실패. 다시 시도해주세요.");
      }
      console.error("[upload]", e);
    } finally {
      setUploading(false);
    }
  };

  const savePosition = async () => {
    if (!target) return;
    const positionStr = `${Math.round(posX)}% ${Math.round(posY)}%`;
    setSavingPos(true);
    try {
      const { error } = await (supabase as any)
        .from("mountains")
        .update({ image_position: positionStr })
        .eq("id", target.id);
      if (error) {
        toast.error(`저장 실패: ${error.message}`);
        return;
      }
      setMountains((prev) =>
        prev.map((m) => (m.id === target.id ? { ...m, image_position: positionStr } : m))
      );
      setTarget((t) => (t ? { ...t, image_position: positionStr } : t));
      toast.success("위치가 저장되었습니다");
    } finally {
      setSavingPos(false);
    }
  };

  const handleFrameDrag = (clientX: number, clientY: number) => {
    const el = dragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPosX(Math.min(100, Math.max(0, x)));
    setPosY(Math.min(100, Math.max(0, y)));
  };

  const handleDelete = async () => {
    if (!deleteTarget?.image_url) return;
    const m = deleteTarget;
    try {
      // Try to extract storage path from public URL
      const marker = `/${BUCKET}/`;
      const idx = m.image_url!.indexOf(marker);
      if (idx !== -1) {
        const path = decodeURIComponent(m.image_url!.slice(idx + marker.length));
        await supabase.storage.from(BUCKET).remove([path]);
      }
      const { error } = await (supabase as any)
        .from("mountains")
        .update({ image_url: null, image_credit: null, image_license: null })
        .eq("id", m.id);
      if (error) throw error;
      setMountains((prev) =>
        prev.map((x) =>
          x.id === m.id ? { ...x, image_url: null, image_credit: null, image_license: null } : x
        )
      );
      toast.success("사진이 삭제되었습니다");
    } catch (e: any) {
      toast.error("삭제 실패: " + (e?.message || "unknown"));
    } finally {
      setDeleteTarget(null);
    }
  };

  if (adminLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl p-4 pb-20">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold">산 사진 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          사진 있음 <strong>{stats.withPhoto}</strong>개 / 전체{" "}
          <strong>{stats.total}</strong>개
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: "#c6d56c" }}
          />
        </div>
      </div>

      {/* Search & filter */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="산 이름 검색"
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(
            [
              { k: "all", label: "전체" },
              { k: "with", label: "사진 있음" },
              { k: "without", label: "사진 없음" },
            ] as { k: FilterMode; label: string }[]
          ).map((b) => (
            <Button
              key={b.k}
              size="sm"
              variant={filter === b.k ? "default" : "outline"}
              onClick={() => setFilter(b.k)}
              style={
                filter === b.k
                  ? { backgroundColor: "#c6d56c", color: "#1a1a1a" }
                  : undefined
              }
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="divide-y">
            {pageItems.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                결과 없음
              </div>
            )}
            {pageItems.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm truncate">
                      {m.name_ko || m.name}
                    </span>
                    {m.is_bac100_blackyak && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#FAEEDA" }}
                      >
                        100대
                      </span>
                    )}
                    {m.is_bac100 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#EAF3DE" }}
                      >
                        산림청
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m.region || "-"} · {m.height ? `${m.height}m` : "-"}
                  </div>
                </div>

                <div className="relative shrink-0">
                  {m.image_url ? (
                    <>
                      <img
                        src={m.image_url}
                        alt=""
                        className="h-[60px] w-[60px] rounded-md object-cover"
                        loading="lazy"
                      />
                      <button
                        onClick={() => setDeleteTarget(m)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                        aria-label="삭제"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-[60px] w-[60px] items-center justify-center rounded-md bg-muted">
                      <span className="text-[10px] text-muted-foreground">
                        사진 없음
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {m.image_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUpload(m)}
                      style={{ borderColor: "#c6d56c", color: "#5a7a1a" }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      교체
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => openUpload(m)}
                      style={{ backgroundColor: "#c6d56c", color: "#1a1a1a" }}
                    >
                      <Camera className="h-3.5 w-3.5 mr-1" />
                      사진 올리기
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {filtered.length === 0
                ? "0"
                : `${(page - 1) * PAGE_SIZE + 1} - ${Math.min(
                    page * PAGE_SIZE,
                    filtered.length
                  )} / ${filtered.length}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) resetModal();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              "{target?.name_ko || target?.name}" 사진 업로드
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0] || null);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                dragOver ? "border-[#c6d56c] bg-[#f4f8e0]" : "border-muted"
              }`}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                클릭하거나 사진을 끌어다 놓으세요
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP · 최대 10MB · 가로형 권장 (16:9 / 3:2)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </div>

            {(() => {
              const activeSrc = previewUrl || target?.image_url || null;
              if (!activeSrc) return null;
              const positionStr = `${posX}% ${posY}%`;
              // Banner is 100% width × 150px → aspect ratio. Compute frame size on natural image.
              // We'll show original image at fixed height 220px; calc width from natural ratio.
              const naturalRatio = imgNatural ? imgNatural.w / imgNatural.h : 16 / 9;
              const origH = 220;
              const origW = origH * naturalRatio;
              // Banner aspect ≈ 380/150 ≈ 2.533 (use container actual ratio)
              const bannerRatio = 380 / 150;
              // Frame height in original-image coords (px) = how much of natural image fits the banner.
              // background-size: cover semantics → image scales to cover. Frame represents the visible window.
              // Compute frame size relative to original image render box:
              let frameW: number, frameH: number;
              if (naturalRatio > bannerRatio) {
                // image wider than banner → full height shown, width cropped
                frameH = origH;
                frameW = origH * bannerRatio;
              } else {
                frameW = origW;
                frameH = origW / bannerRatio;
              }
              const maxLeft = origW - frameW;
              const maxTop = origH - frameH;
              const frameLeft = (posX / 100) * maxLeft;
              const frameTop = (posY / 100) * maxTop;

              return (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">배너 미리보기</Label>
                    <div
                      className="mt-1 w-full overflow-hidden bg-muted"
                      style={{
                        height: 150,
                        borderRadius: 12,
                        backgroundImage: `url(${activeSrc})`,
                        backgroundSize: "cover",
                        backgroundPosition: positionStr,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  </div>

                  {/* Presets */}
                  <div className="flex gap-2">
                    {[
                      { label: "상단 중앙", x: 50, y: 15 },
                      { label: "중앙", x: 50, y: 50 },
                      { label: "하단 중앙", x: 50, y: 85 },
                    ].map((p) => (
                      <Button
                        key={p.label}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setPosX(p.x);
                          setPosY(p.y);
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>

                  {/* Sliders */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>← 왼쪽</span>
                        <span>가로 위치 {Math.round(posX)}%</span>
                        <span>오른쪽 →</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={posX}
                        onChange={(e) => setPosX(Number(e.target.value))}
                        className="w-full accent-[#c6d56c]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>↑ 위</span>
                        <span>세로 위치 {Math.round(posY)}%</span>
                        <span>아래 ↓</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={posY}
                        onChange={(e) => setPosY(Number(e.target.value))}
                        className="w-full accent-[#c6d56c]"
                      />
                    </div>
                  </div>

                  {/* Original w/ draggable frame */}
                  <div>
                    <Label className="text-xs">원본 사진 (프레임 드래그)</Label>
                    <div className="mt-1 flex justify-center bg-muted rounded-lg p-2">
                      <div
                        ref={dragRef}
                        className="relative select-none"
                        style={{
                          width: origW,
                          height: origH,
                          backgroundImage: `url(${activeSrc})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                        onPointerDown={(e) => {
                          (e.target as HTMLElement).setPointerCapture(e.pointerId);
                          handleFrameDrag(e.clientX, e.clientY);
                        }}
                        onPointerMove={(e) => {
                          if (e.buttons === 1) handleFrameDrag(e.clientX, e.clientY);
                        }}
                      >
                        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                        <div
                          className="absolute pointer-events-none border-2 border-white shadow-lg"
                          style={{
                            left: frameLeft,
                            top: frameTop,
                            width: frameW,
                            height: frameH,
                            background: "transparent",
                            boxShadow: "0 0 0 9999px rgba(0,0,0,0.0)",
                          }}
                        />
                      </div>
                      <img
                        src={activeSrc}
                        alt=""
                        style={{ display: "none" }}
                        onLoad={(e) => {
                          const t = e.currentTarget;
                          setImgNatural({ w: t.naturalWidth, h: t.naturalHeight });
                        }}
                      />
                    </div>
                  </div>

                  {/* Save position only (when editing existing photo without new file) */}
                  {!file && target?.image_url && (
                    <Button
                      onClick={savePosition}
                      disabled={savingPos}
                      className="w-full"
                      style={{ backgroundColor: "#c6d56c", color: "#1a1a1a" }}
                    >
                      {savingPos ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" /> 저장 중...
                        </>
                      ) : (
                        "위치만 저장"
                      )}
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Credit */}
            <div className="space-y-2">
              <Label className="text-sm">출처</Label>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={creditType === "self"}
                    onChange={() => setCreditType("self")}
                  />
                  직접 촬영 (© 완등)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={creditType === "public"}
                    onChange={() => setCreditType("public")}
                  />
                  공공저작물
                </label>
                {creditType === "public" && (
                  <Input
                    value={creditSource}
                    onChange={(e) => setCreditSource(e.target.value)}
                    placeholder="출처명 (예: 국립공원공단)"
                    className="ml-6"
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={creditType === "other"}
                    onChange={() => setCreditType("other")}
                  />
                  기타
                </label>
                {creditType === "other" && (
                  <Input
                    value={creditCustom}
                    onChange={(e) => setCreditCustom(e.target.value)}
                    placeholder="출처 직접 입력"
                    className="ml-6"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">라이선스 (선택)</Label>
                <Input
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="예: 공공누리1, CC BY 4.0"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file}
              style={{ backgroundColor: "#c6d56c", color: "#1a1a1a" }}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  업로드 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 사진을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name_ko || deleteTarget?.name} 사진이 영구 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
