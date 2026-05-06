import { useEffect, useMemo, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AlertTriangle, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

interface MountainRow {
  id: number;
  name_ko: string | null;
  name: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_license: string | null;
  is_bac100: boolean | null;
  is_bac100_blackyak: boolean | null;
}

interface WikiResult {
  image_url: string | null;
  image_credit: string | null;
  image_license: string | null;
  source?: string;
}

const isCcBySa = (lic?: string | null) => !!lic && /CC BY[- ]?SA/i.test(lic);
const isCc0 = (lic?: string | null) => !!lic && /(CC0|public domain|공공누리)/i.test(lic);

export default function AdminMountainPhotosPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [mountains, setMountains] = useState<MountainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState<number | null>(null);

  // Preview modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMountain, setModalMountain] = useState<MountainRow | null>(null);
  const [modalResult, setModalResult] = useState<WikiResult | null>(null);
  const [modalMode, setModalMode] = useState<"preview" | "manual">("preview");
  const [manualUrl, setManualUrl] = useState("");
  const [manualCredit, setManualCredit] = useState("");
  const [manualLicense, setManualLicense] = useState("");
  const [manualPreview, setManualPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, found: 0, missing: 0 });
  const [bulkAutoSaveCc0, setBulkAutoSaveCc0] = useState(true);
  const [pending, setPending] = useState<Record<number, WikiResult>>({});

  const loadMountains = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("mountains")
      .select("id, name_ko, name, image_url, image_credit, image_license, is_bac100, is_bac100_blackyak")
      .order("image_url", { ascending: true, nullsFirst: true })
      .order("name_ko", { ascending: true })
      .limit(2000);
    if (error) {
      toast.error("산 목록 로드 실패: " + error.message);
    } else {
      setMountains((data || []) as MountainRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMountains(); }, [loadMountains]);

  const stats = useMemo(() => {
    const total = mountains.length;
    const withPhoto = mountains.filter(m => !!m.image_url).length;
    return { total, withPhoto, missing: total - withPhoto };
  }, [mountains]);

  const totalPages = Math.max(1, Math.ceil(mountains.length / PAGE_SIZE));
  const pageItems = mountains.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openWikiSearch = async (m: MountainRow) => {
    setSearching(m.id);
    try {
      const name = m.name_ko || m.name || "";
      const { data, error } = await (supabase as any).functions.invoke("fetch-mountain-image", {
        body: { mountain_name: name },
      });
      if (error) throw error;
      const result = data as WikiResult;
      if (!result?.image_url) {
        toast.error("사진 없음");
        return;
      }
      setModalMountain(m);
      setModalResult(result);
      setModalMode("preview");
      setManualUrl("");
      setManualCredit("");
      setManualLicense("");
      setManualPreview(null);
      setModalOpen(true);
    } catch (e: any) {
      toast.error("검색 실패: " + (e?.message || "unknown"));
    } finally {
      setSearching(null);
    }
  };

  const saveImage = async (id: number, image_url: string, image_credit: string | null, image_license: string | null) => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("mountains")
      .update({ image_url, image_credit, image_license })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("저장 실패: " + error.message);
      return false;
    }
    setMountains(prev => prev.map(m => m.id === id ? { ...m, image_url, image_credit, image_license } : m));
    setPending(prev => { const n = { ...prev }; delete n[id]; return n; });
    toast.success("사진이 저장되었습니다");
    return true;
  };

  const handleUseWikiPhoto = async () => {
    if (!modalMountain || !modalResult?.image_url) return;
    const ok = await saveImage(
      modalMountain.id,
      modalResult.image_url,
      modalResult.image_credit,
      modalResult.image_license,
    );
    if (ok) setModalOpen(false);
  };

  const handleSaveManual = async () => {
    if (!modalMountain || !manualUrl.trim()) {
      toast.error("이미지 URL을 입력해주세요");
      return;
    }
    const ok = await saveImage(
      modalMountain.id,
      manualUrl.trim(),
      manualCredit.trim() || null,
      manualLicense.trim() || null,
    );
    if (ok) setModalOpen(false);
  };

  const runBulk = async () => {
    const targets = mountains.filter(m => !m.image_url);
    setBulkRunning(true);
    setBulkProgress({ current: 0, total: targets.length, found: 0, missing: 0 });
    let found = 0, missing = 0;
    const next: Record<number, WikiResult> = { ...pending };

    for (let i = 0; i < targets.length; i++) {
      const m = targets[i];
      try {
        const { data } = await (supabase as any).functions.invoke("fetch-mountain-image", {
          body: { mountain_name: m.name_ko || m.name || "" },
        });
        const r = data as WikiResult;
        if (r?.image_url) {
          found++;
          if (bulkAutoSaveCc0 && isCc0(r.image_license)) {
            await saveImage(m.id, r.image_url, r.image_credit, r.image_license);
          } else {
            next[m.id] = r;
          }
        } else {
          missing++;
        }
      } catch {
        missing++;
      }
      setBulkProgress({ current: i + 1, total: targets.length, found, missing });
      // small delay to be polite
      await new Promise(r => setTimeout(r, 250));
    }
    setPending(next);
    setBulkRunning(false);
    toast.success(`완료: 찾음 ${found}개 / 못 찾음 ${missing}개`);
  };

  if (adminLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const progressPct = stats.total ? Math.round((stats.withPhoto / stats.total) * 100) : 0;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl p-4 pb-20">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">산 사진 관리</h1>
              <p className="text-sm text-muted-foreground mt-1">
                사진 있음 <strong>{stats.withPhoto}</strong>개 / 전체 <strong>{stats.total}</strong>개
              </p>
            </div>
            <Button onClick={() => setBulkOpen(true)} disabled={bulkRunning} style={{ backgroundColor: "#c6d56c", color: "#1a1a1a" }}>
              {bulkRunning ? `처리 중 ${bulkProgress.current}/${bulkProgress.total}...` : "전체 자동 수집"}
            </Button>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: "#c6d56c" }} />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="divide-y">
              {pageItems.map((m, idx) => {
                const num = (page - 1) * PAGE_SIZE + idx + 1;
                const pendingRes = pending[m.id];
                const cc = isCcBySa(m.image_license);
                return (
                  <div
                    key={m.id}
                    className="grid items-center gap-3 px-3 py-2"
                    style={{ gridTemplateColumns: "40px 1fr 160px 200px 110px" }}
                  >
                    <div className="text-xs text-muted-foreground">{num}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm truncate">{m.name_ko || m.name}</span>
                        {m.is_bac100_blackyak && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FAEEDA" }}>100대</span>
                        )}
                        {m.is_bac100 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#EAF3DE" }}>산림청</span>
                        )}
                        {cc && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                            </TooltipTrigger>
                            <TooltipContent>SA 조건: 앱 콘텐츠에 동일 라이선스 적용 필요 — 법무 검토 권장</TooltipContent>
                          </Tooltip>
                        )}
                        {pendingRes && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">대기 중</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {m.image_url ? (
                        <img src={m.image_url} alt="" className="h-10 w-[60px] rounded-md object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-10 w-[60px] items-center justify-center rounded-md bg-muted">
                          <span style={{ fontSize: 10, color: "#aaa" }}>사진 없음</span>
                        </div>
                      )}
                    </div>
                    <div className="truncate" title={m.image_credit || ""}>
                      {m.image_credit
                        ? <span style={{ fontSize: 11, color: "#639922" }}>{m.image_credit}</span>
                        : <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                    <div className="flex justify-end gap-1">
                      {pendingRes && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModalMountain(m);
                            setModalResult(pendingRes);
                            setModalMode("preview");
                            setModalOpen(true);
                          }}
                        >
                          검토
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={m.image_url ? "outline" : "default"}
                        onClick={() => openWikiSearch(m)}
                        disabled={searching === m.id}
                      >
                        {searching === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : m.image_url ? (
                          "변경"
                        ) : (
                          <><Search className="h-3.5 w-3.5 mr-1" />위키</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, mountains.length)} / {mountains.length}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview / Manual modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {modalMountain?.name_ko || modalMountain?.name} 사진 {modalMode === "manual" ? "직접 입력" : "후보"}
              </DialogTitle>
            </DialogHeader>

            {modalMode === "preview" && modalResult && (
              <div className="space-y-3">
                {modalResult.image_url && (
                  <img
                    src={modalResult.image_url}
                    alt=""
                    className="h-[150px] w-[200px] rounded-lg object-cover mx-auto"
                  />
                )}
                <div className="text-xs space-y-1">
                  <div>출처: Wikimedia Commons</div>
                  {modalResult.image_license && <div>라이선스: <strong>{modalResult.image_license}</strong></div>}
                  {modalResult.image_credit && <div className="text-muted-foreground">{modalResult.image_credit}</div>}
                  {isCcBySa(modalResult.image_license) && (
                    <div className="rounded bg-orange-50 text-orange-800 p-2 mt-2 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>이 사진 사용 시 앱 콘텐츠도 동일 라이선스 적용 필요</span>
                    </div>
                  )}
                  {isCc0(modalResult.image_license) && (
                    <div className="rounded bg-green-50 text-green-700 p-2 mt-2">자유롭게 사용 가능</div>
                  )}
                </div>
              </div>
            )}

            {modalMode === "manual" && (
              <div className="space-y-3">
                <div>
                  <Label>이미지 URL</Label>
                  <Input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>출처 (image_credit)</Label>
                  <Input value={manualCredit} onChange={(e) => setManualCredit(e.target.value)} placeholder="© 국립공원공단" />
                </div>
                <div>
                  <Label>라이선스</Label>
                  <Input value={manualLicense} onChange={(e) => setManualLicense(e.target.value)} placeholder="공공누리1" />
                </div>
                {manualPreview && (
                  <img src={manualPreview} alt="" className="h-[150px] w-[200px] rounded-lg object-cover mx-auto" />
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
              {modalMode === "preview" ? (
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>취소</Button>
                  <Button variant="outline" onClick={() => setModalMode("manual")}>직접 입력</Button>
                  <Button onClick={handleUseWikiPhoto} disabled={saving} style={{ backgroundColor: "#c6d56c", color: "#1a1a1a" }}>
                    이 사진 사용
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>취소</Button>
                  <Button variant="outline" onClick={() => setManualPreview(manualUrl)}>미리보기</Button>
                  <Button onClick={handleSaveManual} disabled={saving} style={{ backgroundColor: "#c6d56c", color: "#1a1a1a" }}>
                    저장
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk confirm */}
        <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>전체 자동 수집</AlertDialogTitle>
              <AlertDialogDescription>
                사진 없는 산 {stats.missing}개에 대해 위키피디아 자동 검색을 실행합니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bulkAutoSaveCc0}
                onChange={(e) => setBulkAutoSaveCc0(e.target.checked)}
              />
              CC0/공공누리 라이선스는 자동 저장
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={runBulk}>실행</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
