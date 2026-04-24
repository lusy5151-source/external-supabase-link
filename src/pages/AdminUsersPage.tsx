import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  Search,
  Ban,
  CheckCircle2,
  Flag,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/LoadingSpinner";

interface UserRow {
  user_id: string;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  role: string | null;
  created_at: string | null;
  report_count: number;
}

type FilterTab = "all" | "reported" | "inactive";

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [pendingToggle, setPendingToggle] = useState<UserRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (adminLoading || !isAdmin) return;
    fetchUsers();
  }, [adminLoading, isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);

    // 1) Get all profiles (limit reasonably)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, nickname, email, avatar_url, is_active, role, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "회원 목록 로드 실패", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2) Get report counts grouped by reporter target_id (users reported as target_type='user' or 'profile')
    // We'll count reports per target_id where target_type matches user-related types.
    const { data: reports } = await supabase
      .from("reports")
      .select("target_id, target_type")
      .in("target_type", ["user", "profile", "journal", "comment", "post"]);

    // We treat journal/comment authorship reports as user reports too (best-effort).
    // For a more precise mapping we'd need a join; here we just count target_id occurrences.
    const reportCountMap = new Map<string, number>();
    (reports || []).forEach((r: any) => {
      if (!r.target_id) return;
      reportCountMap.set(r.target_id, (reportCountMap.get(r.target_id) || 0) + 1);
    });

    const rows: UserRow[] = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      nickname: p.nickname,
      email: p.email,
      avatar_url: p.avatar_url,
      is_active: p.is_active,
      role: p.role,
      created_at: p.created_at,
      report_count: reportCountMap.get(p.user_id) || 0,
    }));

    setUsers(rows);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = users;
    if (filter === "reported") list = list.filter((u) => u.report_count > 0);
    else if (filter === "inactive") list = list.filter((u) => u.is_active === false);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.nickname || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, filter, search]);

  const reportedCount = users.filter((u) => u.report_count > 0).length;
  const inactiveCount = users.filter((u) => u.is_active === false).length;

  const toggleActive = async (target: UserRow) => {
    setUpdatingId(target.user_id);
    const newActive = !(target.is_active ?? true);

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newActive } as any)
      .eq("user_id", target.user_id);

    if (error) {
      toast({ title: "변경 실패", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.user_id === target.user_id ? { ...u, is_active: newActive } : u)),
      );
      toast({
        title: newActive ? "계정이 활성화되었습니다" : "계정이 비활성화되었습니다",
      });
    }
    setUpdatingId(null);
    setPendingToggle(null);
  };

  if (adminLoading) return <LoadingSpinner message="권한 확인 중..." />;
  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-muted-foreground">관리자 권한이 필요합니다</p>
        <Button variant="link" onClick={() => navigate("/")}>
          홈으로
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            회원 관리
          </h1>
          <p className="text-xs text-muted-foreground">
            총 {users.length}명 · 신고 {reportedCount}명 · 비활성 {inactiveCount}명
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="닉네임 또는 이메일 검색"
          className="pl-9 h-10 rounded-xl bg-card"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: "all", label: "전체" },
          { key: "reported", label: "신고됨", count: reportedCount },
          { key: "inactive", label: "비활성", count: inactiveCount },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as FilterTab)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
            {"count" in tab && tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-destructive text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner message="회원 목록 로딩 중..." />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            조건에 맞는 회원이 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const active = u.is_active !== false;
            return (
              <div
                key={u.user_id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                {/* Avatar */}
                <div className="relative">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.nickname || "user"}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {(u.nickname || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {!active && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-muted-foreground border-2 border-card" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.nickname || "이름 없음"}
                    </p>
                    {u.role === "admin" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary">
                        admin
                      </Badge>
                    )}
                    {u.role === "superadmin" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-600">
                        superadmin
                      </Badge>
                    )}
                    {!active && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground">
                        비활성
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {u.email || "이메일 없음"}
                  </p>
                  {u.report_count > 0 && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-0.5">
                      <Flag className="h-3 w-3" />
                      신고 {u.report_count}건
                    </p>
                  )}
                </div>

                {/* Action */}
                <Button
                  size="sm"
                  variant={active ? "outline" : "default"}
                  className="text-xs h-8"
                  onClick={() => setPendingToggle(u)}
                  disabled={updatingId === u.user_id || u.role === "superadmin"}
                >
                  {updatingId === u.user_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : active ? (
                    <>
                      <Ban className="h-3 w-3 mr-1" /> 비활성화
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> 활성화
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog
        open={!!pendingToggle}
        onOpenChange={(open) => !open && setPendingToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.is_active === false ? "계정 활성화" : "계정 비활성화"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.nickname || "이 사용자"}의 계정을{" "}
              {pendingToggle?.is_active === false ? "다시 활성화" : "비활성화"}하시겠습니까?
              {pendingToggle?.is_active !== false &&
                " 비활성 사용자는 일부 기능이 제한될 수 있습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingToggle && toggleActive(pendingToggle)}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersPage;
