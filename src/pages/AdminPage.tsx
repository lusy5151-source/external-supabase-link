import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Database,
  Megaphone,
  BookOpen,
  Flag,
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Announcement = {
  id: string;
  title: string;
  category: string;
  date: string | null;
  description: string | null;
};

type MagazinePost = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  created_at: string | null;
};

type Report = {
  id: string;
  reporter_id: string | null;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  status: string | null;
  created_at: string | null;
};

type Profile = {
  user_id: string;
  nickname: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

const REPORT_STATUSES = [
  { value: "pending", label: "접수중" },
  { value: "in_progress", label: "처리중" },
  { value: "resolved", label: "완료" },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useAdmin();

  // Trail collection
  const [collecting, setCollecting] = useState(false);
  const [collectStatus, setCollectStatus] = useState("");

  // Trail details sync (sync-trail-details edge function)
  const [syncTesting, setSyncTesting] = useState(false);
  const [syncMountainLoading, setSyncMountainLoading] = useState(false);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [syncMountainName, setSyncMountainName] = useState("");
  const [syncResult, setSyncResult] = useState<string>("");
  const [syncAllStatus, setSyncAllStatus] = useState<string>("");

  const callSyncTrailDetails = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("sync-trail-details", { body });
    if (error) throw error;
    return data;
  };

  const handleSyncTest = async () => {
    setSyncTesting(true);
    setSyncResult("API 테스트 중...");
    try {
      const data = await callSyncTrailDetails({ mode: "test" });
      setSyncResult(JSON.stringify(data, null, 2));
      toast.success("API 테스트 완료");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류";
      setSyncResult(`❌ ${msg}`);
      toast.error(`테스트 실패: ${msg}`);
    } finally {
      setSyncTesting(false);
    }
  };

  const handleSyncMountain = async () => {
    if (!syncMountainName.trim()) {
      toast.error("산 이름을 입력해주세요.");
      return;
    }
    setSyncMountainLoading(true);
    setSyncResult(`'${syncMountainName}' 동기화 중...`);
    try {
      const data = await callSyncTrailDetails({
        mode: "sync_mountain",
        mountain_name: syncMountainName.trim(),
      });
      setSyncResult(JSON.stringify(data, null, 2));
      toast.success(`'${syncMountainName}' 동기화 완료`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류";
      setSyncResult(`❌ ${msg}`);
      toast.error(`동기화 실패: ${msg}`);
    } finally {
      setSyncMountainLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!confirm("전체 산 동기화를 시작하시겠습니까? (limit: 50)")) return;
    setSyncAllLoading(true);
    setSyncAllStatus("전체 산 동기화 중... (최대 50개)");
    setSyncResult("");
    try {
      const data = await callSyncTrailDetails({ mode: "sync_all", limit: 50 });
      setSyncAllStatus(`✅ 완료`);
      setSyncResult(JSON.stringify(data, null, 2));
      toast.success("전체 동기화 완료");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류";
      setSyncAllStatus(`❌ ${msg}`);
      toast.error(`동기화 실패: ${msg}`);
    } finally {
      setSyncAllLoading(false);
    }
  };

  // Data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [magazines, setMagazines] = useState<MagazinePost[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Dialog state
  const [annDialog, setAnnDialog] = useState<{ open: boolean; row: Partial<Announcement> | null }>({
    open: false,
    row: null,
  });
  const [magDialog, setMagDialog] = useState<{ open: boolean; row: Partial<MagazinePost> | null }>({
    open: false,
    row: null,
  });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setDataLoading(true);
    const [a, m, r, p] = await Promise.all([
      supabase.from("announcements").select("id,title,category,date,description").order("date", { ascending: false }).limit(100),
      supabase.from("magazine_posts").select("id,title,category,description,created_at").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("user_id,nickname,email,role,is_active,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    setAnnouncements((a.data as Announcement[]) ?? []);
    setMagazines((m.data as MagazinePost[]) ?? []);
    setReports((r.data as Report[]) ?? []);
    setProfiles((p.data as Profile[]) ?? []);
    setDataLoading(false);
  };

  // Trail coordinate collection — calls VWorld API directly from browser
  const handleCollectTrails = async () => {
    if (collecting) return;
    const VWORLD_KEY = "F41DD5DC-6774-33EA-8E02-68505ADAF394";
    setCollecting(true);
    setCollectStatus("수집 시작...");
    let page = 1;
    let totalSaved = 0;

    try {
      while (true) {
        setCollectStatus(`페이지 ${page} 수집 중...`);

        const params = new URLSearchParams({
          service: "data",
          request: "GetFeature",
          data: "LT_L_FRSTCLIMB",
          key: VWORLD_KEY,
          domain: "https://wandeung.com",
          format: "json",
          crs: "EPSG:4326",
          size: "100",
          page: String(page),
          geometry: "true",
          attribute: "true",
        });

        const res = await fetch(`https://api.vworld.kr/req/data?${params}`);
        const data = await res.json();

        if (data?.response?.status !== "OK") {
          setCollectStatus(`오류: ${data?.response?.status ?? "unknown"}`);
          break;
        }

        const features =
          data.response.result?.featureCollection?.features ?? [];
        const total = Number(data.response.record?.total ?? 0);

        for (const feature of features) {
          const props = feature.properties ?? {};
          const mntnNm = props.mntn_nm as string | undefined;
          const geometry = feature.geometry;
          const secLen = parseInt(props.sec_len) || 0;
          const upMin = parseInt(props.up_min) || 0;
          const downMin = parseInt(props.down_min) || 0;

          if (!mntnNm) continue;
          if (!geometry?.coordinates?.length) continue;

          const { data: mountain } = await supabase
            .from("mountains")
            .select("id")
            .ilike("name_ko", `%${mntnNm}%`)
            .limit(1)
            .maybeSingle();

          if (!mountain) continue;

          // Find an existing trail without geometry to update; otherwise insert new
          const { data: trail } = await supabase
            .from("trails")
            .select("id")
            .eq("mountain_id", mountain.id)
            .is("geometry", null)
            .limit(1)
            .maybeSingle();

          if (trail) {
            const { error: upErr } = await supabase
              .from("trails")
              .update({
                geometry,
                distance_m: secLen,
                up_minutes_vw: upMin,
                down_minutes: downMin,
                vworld_synced_at: new Date().toISOString(),
              })
              .eq("id", trail.id);
            if (!upErr) totalSaved++;
          } else {
            const { error: insErr } = await supabase
              .from("trails")
              .insert({
                mountain_id: mountain.id,
                name: `${mntnNm} 등산로`,
                geometry,
                distance_m: secLen,
                distance_km: Math.round(secLen / 100) / 10,
                up_minutes_vw: upMin,
                down_minutes: downMin,
                duration_minutes: upMin + downMin,
                vworld_synced_at: new Date().toISOString(),
              });
            if (!insErr) totalSaved++;
          }
        }

        setCollectStatus(`페이지 ${page} 완료 — 총 ${totalSaved}개 저장`);

        if (total === 0 || page * 100 >= total) break;
        page++;
        await new Promise((r) => setTimeout(r, 500));
      }

      toast.success(`총 ${totalSaved}개 등산로 좌표 수집 완료!`);
      setCollectStatus(`✅ 완료! 총 ${totalSaved}개 등산로 좌표 수집`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류 발생";
      toast.error(`수집 실패: ${msg}`);
      setCollectStatus(`❌ 오류: ${msg}`);
    } finally {
      setCollecting(false);
    }
  };

  // Announcements CRUD
  const saveAnnouncement = async () => {
    const row = annDialog.row;
    if (!row?.title || !row?.category) {
      toast.error("제목과 카테고리는 필수입니다.");
      return;
    }
    const payload = {
      title: row.title,
      category: row.category,
      date: row.date || new Date().toISOString().slice(0, 10),
      description: row.description ?? null,
    };
    const { error } = row.id
      ? await supabase.from("announcements").update(payload).eq("id", row.id)
      : await supabase.from("announcements").insert(payload);
    if (error) {
      toast.error("저장 실패");
      return;
    }
    toast.success("저장되었습니다.");
    setAnnDialog({ open: false, row: null });
    await loadAll();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("삭제 실패");
    else {
      toast.success("삭제되었습니다.");
      await loadAll();
    }
  };

  // Magazine CRUD
  const saveMagazine = async () => {
    const row = magDialog.row;
    if (!row?.title) {
      toast.error("제목은 필수입니다.");
      return;
    }
    const payload = {
      title: row.title,
      category: row.category ?? null,
      description: row.description ?? null,
    };
    const { error } = row.id
      ? await supabase.from("magazine_posts").update(payload).eq("id", row.id)
      : await supabase.from("magazine_posts").insert(payload);
    if (error) {
      toast.error("저장 실패");
      return;
    }
    toast.success("저장되었습니다.");
    setMagDialog({ open: false, row: null });
    await loadAll();
  };

  const deleteMagazine = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("magazine_posts").delete().eq("id", id);
    if (error) toast.error("삭제 실패");
    else {
      toast.success("삭제되었습니다.");
      await loadAll();
    }
  };

  // Reports
  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("reports").update({ status }).eq("id", id);
    if (error) toast.error("상태 변경 실패");
    else {
      toast.success("상태가 변경되었습니다.");
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  };

  // Profiles
  const toggleActive = async (userId: string, next: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: next }).eq("user_id", userId);
    if (error) {
      toast.error("변경 실패");
      return;
    }
    toast.success(next ? "활성화되었습니다." : "비활성화되었습니다.");
    setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, is_active: next } : p)));
  };

  if (roleLoading) return <LoadingSpinner message="권한 확인 중..." />;
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6 px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="rounded-2xl bg-primary/10 p-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">관리자 페이지</h1>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin ? "최고 관리자" : "관리자"} 통합 대시보드
          </p>
        </div>
      </div>

      {/* 1. Data management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" /> 데이터 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleCollectTrails} disabled={collecting}>
              {collecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 수집 중...
                </>
              ) : (
                <>등산로 좌표 수집</>
              )}
            </Button>
            {collectStatus && (
              <span className="text-xs text-muted-foreground">{collectStatus}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            VWorld API(LT_L_FRSTCLIMB)를 브라우저에서 직접 호출하여 등산로 geometry를 trails 테이블에 저장합니다.
          </p>
        </CardContent>
      </Card>

      {/* 1-2. Trail details sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" /> 등산로 상세정보 수집
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GPX 동기화 페이지 링크 (소유자 전용) — 최상단 강조 */}
          <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-bold text-foreground">🗺️ GPX 데이터 동기화 (VWorld)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              VWorld API로 등산로 geometry(폴리라인)를 일괄 동기화합니다. (소유자 전용)
            </p>
            <Button
              variant="default"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/admin/gpx-sync")}
            >
              GPX 동기화 페이지 열기 →
            </Button>
          </div>

          {/* API 테스트 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">1. API 테스트</p>
            <Button onClick={handleSyncTest} disabled={syncTesting} variant="outline">
              {syncTesting ? (<><Loader2 className="h-4 w-4 animate-spin" /> 테스트 중...</>) : "API 테스트"}
            </Button>
          </div>

          {/* 특정 산 동기화 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">2. 특정 산 동기화</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="산 이름 입력 (예: 북한산)"
                value={syncMountainName}
                onChange={(e) => setSyncMountainName(e.target.value)}
                className="max-w-xs"
                disabled={syncMountainLoading}
              />
              <Button onClick={handleSyncMountain} disabled={syncMountainLoading}>
                {syncMountainLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> 실행 중...</>) : "실행"}
              </Button>
            </div>
          </div>

          {/* 전체 산 동기화 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">3. 전체 산 동기화 (limit: 50)</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSyncAll} disabled={syncAllLoading} variant="default">
                {syncAllLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> 동기화 중...</>) : "전체 산 동기화"}
              </Button>
              {syncAllStatus && (
                <span className="text-xs text-muted-foreground">{syncAllStatus}</span>
              )}
            </div>
          </div>

          {/* 결과 */}
          {syncResult && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">응답</p>
              <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground whitespace-pre-wrap break-all">
{syncResult}
              </pre>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            <code>sync-trail-details</code> Edge Function을 호출합니다.
          </p>

          {/* GPX 동기화 페이지 링크 (소유자 전용) */}
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <p className="text-sm font-medium text-foreground">🗺️ GPX 데이터 동기화 (VWorld)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              VWorld API로 등산로 geometry(폴리라인)를 일괄 동기화합니다. (소유자 전용)
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate("/admin/gpx-sync")}
            >
              GPX 동기화 페이지 열기 →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Announcements */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" /> 공지사항 관리
          </CardTitle>
          <Button size="sm" onClick={() => setAnnDialog({ open: true, row: { category: "general" } })}>
            <Plus className="h-4 w-4" /> 추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead className="w-28">카테고리</TableHead>
                <TableHead className="w-32">날짜</TableHead>
                <TableHead className="w-28 text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">불러오는 중...</TableCell></TableRow>
              ) : announcements.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">공지사항이 없습니다.</TableCell></TableRow>
              ) : (
                announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell><Badge variant="secondary">{a.category}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.date ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setAnnDialog({ open: true, row: a })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteAnnouncement(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Magazine */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> 매거진 관리
          </CardTitle>
          <Button size="sm" onClick={() => setMagDialog({ open: true, row: {} })}>
            <Plus className="h-4 w-4" /> 추가
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead className="w-28">카테고리</TableHead>
                <TableHead className="w-32">생성일</TableHead>
                <TableHead className="w-28 text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">불러오는 중...</TableCell></TableRow>
              ) : magazines.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">게시글이 없습니다.</TableCell></TableRow>
              ) : (
                magazines.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>{m.category ? <Badge variant="secondary">{m.category}</Badge> : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString("ko-KR") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setMagDialog({ open: true, row: m })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMagazine(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" /> 신고 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">유형</TableHead>
                <TableHead>사유</TableHead>
                <TableHead className="w-32">날짜</TableHead>
                <TableHead className="w-36">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">불러오는 중...</TableCell></TableRow>
              ) : reports.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">신고가 없습니다.</TableCell></TableRow>
              ) : (
                reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.target_type ?? "-"}</Badge></TableCell>
                    <TableCell className="text-sm">{r.reason ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status ?? "pending"}
                        onValueChange={(v) => updateReportStatus(r.id, v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> 회원 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>닉네임</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="w-24">역할</TableHead>
                <TableHead className="w-28 text-right">활성화</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">불러오는 중...</TableCell></TableRow>
              ) : profiles.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">회원이 없습니다.</TableCell></TableRow>
              ) : (
                profiles.map((p) => (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{p.nickname ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.email ?? "-"}</TableCell>
                    <TableCell>
                      {p.role ? <Badge variant={p.role === "superadmin" ? "default" : "secondary"}>{p.role}</Badge> : <span className="text-xs text-muted-foreground">user</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={p.is_active !== false}
                        onCheckedChange={(v) => toggleActive(p.user_id, v)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Announcement Dialog */}
      <Dialog open={annDialog.open} onOpenChange={(o) => setAnnDialog({ open: o, row: o ? annDialog.row : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{annDialog.row?.id ? "공지사항 수정" : "공지사항 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="제목"
              value={annDialog.row?.title ?? ""}
              onChange={(e) => setAnnDialog((s) => ({ ...s, row: { ...s.row, title: e.target.value } }))}
            />
            <Input
              placeholder="카테고리 (예: general, alert)"
              value={annDialog.row?.category ?? ""}
              onChange={(e) => setAnnDialog((s) => ({ ...s, row: { ...s.row, category: e.target.value } }))}
            />
            <Input
              type="date"
              value={annDialog.row?.date ?? ""}
              onChange={(e) => setAnnDialog((s) => ({ ...s, row: { ...s.row, date: e.target.value } }))}
            />
            <Textarea
              placeholder="설명"
              rows={4}
              value={annDialog.row?.description ?? ""}
              onChange={(e) => setAnnDialog((s) => ({ ...s, row: { ...s.row, description: e.target.value } }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnDialog({ open: false, row: null })}>취소</Button>
            <Button onClick={saveAnnouncement}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Magazine Dialog */}
      <Dialog open={magDialog.open} onOpenChange={(o) => setMagDialog({ open: o, row: o ? magDialog.row : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{magDialog.row?.id ? "매거진 수정" : "매거진 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="제목"
              value={magDialog.row?.title ?? ""}
              onChange={(e) => setMagDialog((s) => ({ ...s, row: { ...s.row, title: e.target.value } }))}
            />
            <Input
              placeholder="카테고리"
              value={magDialog.row?.category ?? ""}
              onChange={(e) => setMagDialog((s) => ({ ...s, row: { ...s.row, category: e.target.value } }))}
            />
            <Textarea
              placeholder="설명"
              rows={4}
              value={magDialog.row?.description ?? ""}
              onChange={(e) => setMagDialog((s) => ({ ...s, row: { ...s.row, description: e.target.value } }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMagDialog({ open: false, row: null })}>취소</Button>
            <Button onClick={saveMagazine}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
