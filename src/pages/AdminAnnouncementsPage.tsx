import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  mountain_name: string | null;
  date: string;
  description: string;
  full_description: string;
  category: string;
  alert_type: string;
  severity: string;
  source: string | null;
  is_active: boolean;
}

const categoryOptions = [
  { value: "app", label: "앱 업데이트" },
  { value: "mountain", label: "산악 정보" },
  { value: "event", label: "이벤트" },
];

const alertTypeOptions = [
  { value: "trail_closure", label: "탐방로 통제" },
  { value: "weather_alert", label: "기상 특보" },
  { value: "wildfire", label: "산불 위험" },
  { value: "app_update", label: "앱 업데이트" },
  { value: "event", label: "이벤트" },
];

const severityOptions = [
  { value: "info", label: "정보" },
  { value: "warning", label: "주의" },
  { value: "critical", label: "긴급" },
];

const severityColors: Record<string, string> = {
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function AdminAnnouncementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    mountain_name: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    full_description: "",
    category: "app",
    alert_type: "app_update",
    severity: "info",
    source: "",
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      title: "",
      mountain_name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      full_description: "",
      category: "app",
      alert_type: "app_update",
      severity: "info",
      source: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements" as any)
      .select("*")
      .order("date", { ascending: false });
    setAnnouncements((data as unknown as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchAnnouncements();
  }, [isAdmin]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">관리자 권한이 필요합니다.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  const handleEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      mountain_name: a.mountain_name || "",
      date: a.date,
      description: a.description,
      full_description: a.full_description,
      category: a.category,
      alert_type: a.alert_type,
      severity: a.severity,
      source: a.source || "",
      is_active: a.is_active,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.full_description.trim()) {
      toast({ title: "필수 항목을 입력해주세요", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title,
      mountain_name: form.mountain_name || null,
      date: form.date,
      description: form.description,
      full_description: form.full_description,
      category: form.category,
      alert_type: form.alert_type,
      severity: form.severity,
      source: form.source || null,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("announcements" as any)
        .update(payload as any)
        .eq("id", editingId);
      if (error) {
        toast({ title: "수정 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "공지사항이 수정되었습니다" });
      }
    } else {
      const { error } = await supabase
        .from("announcements" as any)
        .insert(payload as any);
      if (error) {
        toast({ title: "등록 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "공지사항이 등록되었습니다" });
      }
    }

    setSaving(false);
    resetForm();
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("announcements" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "공지사항이 삭제되었습니다" });
      fetchAnnouncements();
    }
  };

  const handleToggleActive = async (a: Announcement) => {
    await supabase
      .from("announcements" as any)
      .update({ is_active: !a.is_active } as any)
      .eq("id", a.id);
    fetchAnnouncements();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">공지사항 관리</h1>
            <p className="text-xs text-muted-foreground">공지사항을 추가, 수정, 삭제합니다</p>
          </div>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" /> 새 공지
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId ? "공지사항 수정" : "새 공지사항"}</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">제목 *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="공지사항 제목"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">카테고리</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">알림 유형</label>
                <Select value={form.alert_type} onValueChange={(v) => setForm({ ...form, alert_type: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {alertTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">심각도</label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">날짜</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">산 이름</label>
                <Input
                  value={form.mountain_name}
                  onChange={(e) => setForm({ ...form, mountain_name: e.target.value })}
                  placeholder="선택사항"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">출처</label>
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="예: 국립공원공단"
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">요약 설명 *</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="목록에 표시될 짧은 설명"
                rows={2}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">상세 내용 *</label>
              <Textarea
                value={form.full_description}
                onChange={(e) => setForm({ ...form, full_description: e.target.value })}
                placeholder="공지사항 상세 내용"
                rows={5}
                className="rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                활성화
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetForm} className="rounded-xl">취소</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-xl gap-1.5">
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {editingId ? "수정" : "등록"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">등록된 공지사항이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-4 transition-all ${a.is_active ? "bg-card" : "bg-muted/50 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <Badge className={`text-[9px] px-1.5 py-0 h-4 ${severityColors[a.severity] || severityColors.info}`}>
                      {severityOptions.find((o) => o.value === a.severity)?.label}
                    </Badge>
                    {!a.is_active && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">비활성</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{categoryOptions.find((o) => o.value === a.category)?.label}</span>
                    <span>·</span>
                    <span>{a.date}</span>
                    {a.mountain_name && <><span>·</span><span>{a.mountain_name}</span></>}
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground line-clamp-1">{a.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(a)}
                    className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${a.is_active ? "bg-secondary hover:bg-secondary/80" : "bg-primary/10 hover:bg-primary/20 text-primary"}`}
                  >
                    {a.is_active ? "숨김" : "표시"}
                  </button>
                  <button
                    onClick={() => handleEdit(a)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
                        <AlertDialogDescription>"{a.title}" 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
