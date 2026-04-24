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

  // Trail coordinate collection (paginated)
  const handleCollectTrails = async () => {
    if (collecting) return;
    setCollecting(true);
    setCollectStatus("시작 중...");
    let page = 1;
    let totalSaved = 0;
    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke("fetch-trail-coordinates", {
          body: { page, size: 1000 },
        });
        if (error) throw error;
        const saved = Number((data as any)?.saved ?? 0);
        const hasMore = Boolean((data as any)?.has_more);
        totalSaved += saved;
        setCollectStatus(`페이지 ${page} 완료: 총 ${totalSaved}개 저장`);
        if (!hasMore) break;
        page++;
        await new Promise((r) => setTimeout(r, 1000));
      }
      toast.success(`총 ${totalSaved}개 등산로 좌표 수집 완료!`);
      setCollectStatus(`완료 (총 ${totalSaved}개)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류 발생";
      toast.error(`수집 실패: ${msg}`);
      setCollectStatus(`실패: ${msg}`);
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
            fetch-trail-coordinates Edge Function을 페이지네이션으로 반복 호출하여 등산로 좌표를 수집합니다.
          </p>
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
