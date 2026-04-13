import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { mountains } from "@/data/mountains";
import { Check, X, AlertTriangle, Loader2, Mountain, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";

interface UserMountainAdmin {
  id: string;
  mountain_id: number;
  name_ko: string;
  height: number;
  region: string;
  difficulty: string;
  image_url: string | null;
  created_by: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
}

interface DuplicateReport {
  reported_mountain_id: number;
  existing_mountain_id: number;
  count: number;
}

const AdminMountainApprovalPage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [tab, setTab] = useState<"pending" | "active" | "rejected">("pending");
  const [allMountains, setAllMountains] = useState<UserMountainAdmin[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [duplicateReports, setDuplicateReports] = useState<DuplicateReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ mountainId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    // Fetch all user mountains
    const { data: mtns } = await supabase
      .from("user_mountains")
      .select("*")
      .order("created_at", { ascending: false }) as any;

    const mountainList = (mtns || []) as UserMountainAdmin[];
    setAllMountains(mountainList);

    // Fetch profiles for creators
    const creatorIds = [...new Set(mountainList.map((m) => m.created_by))];
    if (creatorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, nickname")
        .in("user_id", creatorIds);
      if (profs) {
        setProfiles(new Map(profs.map((p) => [p.user_id, p.nickname || "사용자"])));
      }
    }

    // Fetch duplicate reports grouped
    const { data: reports } = await supabase
      .from("mountain_duplicate_reports" as any)
      .select("reported_mountain_id, existing_mountain_id") as any;
    if (reports) {
      const grouped = new Map<number, { existing: number; count: number }>();
      for (const r of reports) {
        const key = r.reported_mountain_id;
        const existing = grouped.get(key);
        if (existing) {
          existing.count++;
        } else {
          grouped.set(key, { existing: r.existing_mountain_id, count: 1 });
        }
      }
      setDuplicateReports(
        Array.from(grouped.entries()).map(([id, v]) => ({
          reported_mountain_id: id,
          existing_mountain_id: v.existing,
          count: v.count,
        }))
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const filtered = useMemo(
    () => allMountains.filter((m) => m.status === tab),
    [allMountains, tab]
  );

  const getExistingMountainName = (id: number): string => {
    const staticM = mountains.find((m) => m.id === id);
    if (staticM) return staticM.nameKo;
    const userM = allMountains.find((m) => m.mountain_id === id);
    return userM?.name_ko || `산 #${id}`;
  };

  const getDuplicateInfo = (mountainId: number) =>
    duplicateReports.find((r) => r.reported_mountain_id === mountainId);

  const handleApprove = async (mountain: UserMountainAdmin) => {
    const { error } = await supabase
      .from("user_mountains")
      .update({ status: "active" } as any)
      .eq("id", mountain.id);

    if (error) {
      toast.error("승인 실패");
      return;
    }

    // Create pioneer achievement for the creator
    await supabase.from("user_achievements").insert({
      user_id: mountain.created_by,
      badge_id: `pioneer_${mountain.mountain_id}`,
    } as any);

    // Create activity feed notification
    await supabase.from("activity_feed").insert({
      user_id: mountain.created_by,
      type: "mountain_approved",
      message: `등록하신 ${mountain.name_ko}이(가) 승인되었어요! 🏔️`,
      mountain_id: mountain.mountain_id,
    });

    toast.success(`${mountain.name_ko} 승인 완료`);
    fetchData();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const { error } = await supabase
      .from("user_mountains")
      .update({ status: "rejected", reject_reason: rejectReason || null } as any)
      .eq("id", rejectModal.mountainId);

    if (error) {
      toast.error("반려 실패");
      return;
    }

    // Find the mountain to notify creator
    const mountain = allMountains.find((m) => m.id === rejectModal.mountainId);
    if (mountain) {
      await supabase.from("activity_feed").insert({
        user_id: mountain.created_by,
        type: "mountain_rejected",
        message: `등록하신 ${mountain.name_ko}이(가) 반려되었어요: ${rejectReason || "사유 없음"}`,
        mountain_id: mountain.mountain_id,
      });
    }

    toast.success("반려 완료");
    setRejectModal(null);
    setRejectReason("");
    fetchData();
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs = [
    { key: "pending" as const, label: "승인 대기", icon: Clock, count: allMountains.filter((m) => m.status === "pending").length },
    { key: "active" as const, label: "승인 완료", icon: CheckCircle2, count: allMountains.filter((m) => m.status === "active").length },
    { key: "rejected" as const, label: "반려됨", icon: XCircle, count: allMountains.filter((m) => m.status === "rejected").length },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Mountain className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">산 승인 관리</h1>
          <p className="text-xs text-muted-foreground">사용자 등록 산 검토</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                tab === key ? "bg-primary-foreground/20" : "bg-muted"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Mountain list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">해당 항목이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const dupInfo = getDuplicateInfo(m.mountain_id);
            return (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex gap-3">
                  {m.image_url && (
                    <img
                      src={m.image_url}
                      alt={m.name_ko}
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{m.name_ko}</p>
                      {dupInfo && dupInfo.count >= 1 && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                          중복 {dupInfo.count}건
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.region} · {m.height}m · {m.difficulty}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      등록자: {profiles.get(m.created_by) || "사용자"} · {new Date(m.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>

                {dupInfo && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>중복 지목: {getExistingMountainName(dupInfo.existing_mountain_id)}</span>
                  </div>
                )}

                {m.status === "rejected" && m.reject_reason && (
                  <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    반려 사유: {m.reject_reason}
                  </div>
                )}

                {m.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(m)}
                      className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="h-3.5 w-3.5" /> 승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectModal({ mountainId: m.id, name: m.name_ko })}
                      className="flex-1 gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> 반려
                    </Button>
                  </div>
                )}

                {m.status === "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(m)}
                    className="w-full gap-1"
                  >
                    <Check className="h-3.5 w-3.5" /> 다시 승인
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={!!rejectModal} onOpenChange={(o) => !o && setRejectModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">반려 사유 입력</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              "{rejectModal?.name}" 산 등록을 반려합니다.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectModal(null)} className="flex-1">
                취소
              </Button>
              <Button variant="destructive" onClick={handleReject} className="flex-1">
                반려 확정
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMountainApprovalPage;
