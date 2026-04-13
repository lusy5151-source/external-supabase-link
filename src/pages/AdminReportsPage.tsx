import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ShieldCheck, Flag, CheckCircle, Eye, Loader2, Ban,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_nickname?: string;
}

const REASON_LABELS: Record<string, string> = {
  spam: "스팸",
  inappropriate: "부적절한 콘텐츠",
  harassment: "괴롭힘/폭언",
  other: "기타",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-amber-100 text-amber-700" },
  reviewed: { label: "검토됨", color: "bg-blue-100 text-blue-700" },
  resolved: { label: "처리 완료", color: "bg-emerald-100 text-emerald-700" },
};

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    fetchReports();
  }, [isAdmin, adminLoading]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "신고 목록 로드 실패", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch reporter profiles
    const reporterIds = [...new Set((data || []).map((r: any) => r.reporter_id))];
    let profileMap: Record<string, string> = {};
    if (reporterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nickname")
        .in("user_id", reporterIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = p.nickname || "사용자";
      });
    }

    setReports(
      (data || []).map((r: any) => ({
        ...r,
        reporter_nickname: profileMap[r.reporter_id] || "사용자",
      }))
    );
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "상태 변경 실패", variant: "destructive" });
    } else {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      toast({ title: `신고 상태가 '${STATUS_CONFIG[status]?.label}'(으)로 변경되었습니다.` });
    }
    setUpdatingId(null);
  };

  if (adminLoading) return <LoadingSpinner message="권한 확인 중..." />;

  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-muted-foreground">관리자 권한이 필요합니다</p>
        <Button variant="link" onClick={() => navigate("/")}>홈으로</Button>
      </div>
    );
  }

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            신고 관리
          </h1>
          <p className="text-xs text-muted-foreground">
            총 {reports.length}건 · 대기 {pendingCount}건
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "reviewed", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "전체" : STATUS_CONFIG[f].label}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-destructive text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Report list */}
      {loading ? (
        <LoadingSpinner message="신고 목록 로딩 중..." />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-primary/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {filter === "all" ? "신고 내역이 없습니다" : "해당 상태의 신고가 없습니다"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={report.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {report.target_type === "journal" ? "일지" : report.target_type === "comment" ? "댓글" : "게시물"}
                      </Badge>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {REASON_LABELS[report.reason] || report.reason}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(report.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>

                {report.description && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    {report.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>신고자: {report.reporter_nickname}</span>
                  <span className="font-mono text-[10px]">ID: {report.target_id.slice(0, 8)}...</span>
                </div>

                {/* Actions */}
                {report.status !== "resolved" && (
                  <div className="flex gap-2 pt-1 border-t border-border/50">
                    {report.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 flex-1"
                        onClick={() => updateStatus(report.id, "reviewed")}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Eye className="h-3 w-3 mr-1" />
                        )}
                        검토 완료
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="text-xs h-8 flex-1"
                      onClick={() => updateStatus(report.id, "resolved")}
                      disabled={updatingId === report.id}
                    >
                      {updatingId === report.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      처리 완료
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
