import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/context/StoreContext";
import { useProfile } from "@/hooks/useProfile";
import { useFriends } from "@/hooks/useFriends";
import { useAchievementStore } from "@/hooks/useAchievementStore";
import { useGearStore } from "@/hooks/useGearStore";
import { useSharedCompletionCounts } from "@/hooks/useSharedCompletionCounts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, Users, Mountain, BookOpen, Settings, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUnreadChat } from "@/contexts/UnreadChatContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const menuItems = [
  { label: "프로필 설정", to: "/profile", icon: Settings },
  { label: "친구 관리", to: "/social", icon: Users },
  { label: "산악회", to: "/social", icon: Users },
  
  { label: "등산 계획", to: "/plans", icon: BookOpen },
];

const MyPage = () => {
  const { user, signOut } = useAuth();
  const { records, completedCount } = useStore();
  const { profile } = useProfile();
  const { friends } = useFriends();
  const { items: gearItems } = useGearStore();
  const sharedCompletions = useSharedCompletionCounts();
  const { earnedCount } = useAchievementStore(records, gearItems, sharedCompletions);
  const { unreadChatCount } = useUnreadChat();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">로그인이 필요합니다</p>
        <Link to="/auth" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          로그인
        </Link>
      </div>
    );
  }

  const nickname = profile?.nickname || user.email?.split("@")[0] || "사용자";
  const avatarUrl = profile?.avatar_url;
  const friendCount = friends?.length || 0;

  return (
    <div className="max-w-lg mx-auto pb-24 space-y-5">
      {/* Profile header card */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Avatar className="h-11 w-11">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-muted text-sm font-semibold">
            {nickname.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{nickname}</p>
          <Badge
            variant="secondary"
            className="mt-0.5 text-[10px] px-2 py-0 h-4 gap-1"
          >
            <Mountain className="h-2.5 w-2.5" />
            완등 {completedCount}개
          </Badge>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "완등한 산", value: completedCount },
          { label: "친구", value: friendCount },
          { label: "업적", value: earnedCount },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-xl border border-border bg-card py-3"
          >
            <span className="text-lg font-bold text-foreground">{s.value}</span>
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Menu list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {menuItems.map((item, idx) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50"
            style={{
              borderTop: idx > 0 ? "0.5px solid hsl(var(--border))" : undefined,
            }}
          >
            <item.icon className="h-4.5 w-4.5 text-muted-foreground" style={{ width: 18, height: 18 }} />
            <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
            {item.label === "산악회" && unreadChatCount > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 font-semibold text-white"
                style={{ fontSize: 11, background: "#E24B4A", lineHeight: "14px" }}
              >
                {unreadChatCount}개 새 메시지
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </Link>
        ))}
      </div>

      {/* Logout & Delete account */}
      <div className="space-y-0">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-accent/50"
        >
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">로그아웃</span>
        </button>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full py-3 text-center"
          style={{ fontSize: 13, color: "hsl(var(--color-text-tertiary))" }}
        >
          회원 탈퇴
        </button>
      </div>

      {/* Delete account confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 탈퇴하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              탈퇴 시 모든 완등 기록과 데이터가 삭제되며 복구할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <button
              onClick={() => {
                setShowDeleteDialog(false);
                toast("탈퇴가 완료되었습니다");
              }}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ background: "#E24B4A" }}
            >
              탈퇴하기
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyPage;
