import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  ShieldCheck,
  Megaphone,
  BookOpen,
  Flag,
  Users,
  ChevronRight,
  Mountain,
} from "lucide-react";

const menuItems = [
  {
    to: "/admin/announcements",
    icon: Megaphone,
    title: "공지사항 관리",
    description: "공지/알림 작성, 수정, 삭제",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    to: "/admin/magazine",
    icon: BookOpen,
    title: "매거진 관리",
    description: "매거진 게시글 작성, 수정, 삭제",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    to: "/admin/reports",
    icon: Flag,
    title: "신고 관리",
    description: "신고 목록 조회 및 처리상태 변경",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    to: "/admin/users",
    icon: Users,
    title: "회원 관리",
    description: "신고/차단된 사용자 조회, 계정 비활성화",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    to: "/admin/mountains",
    icon: Mountain,
    title: "산 등록 승인",
    description: "사용자가 등록한 산 검수",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  if (loading) return <LoadingSpinner message="권한 확인 중..." />;
  if (!isAdmin) return null;

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6 px-1">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="rounded-2xl bg-primary/10 p-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">관리자 페이지</h1>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin ? "최고 관리자" : "관리자"} 전용 대시보드
          </p>
        </div>
      </div>

      {/* Menu grid */}
      <div className="space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className={`rounded-xl ${item.bg} p-3`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPage;
