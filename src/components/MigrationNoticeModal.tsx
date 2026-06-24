import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, UserCircle, Mountain, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/contexts/TutorialContext";

const STORAGE_KEY = "migration_notice_v2";
export const MIGRATION_DISMISSED_EVENT = "migration-notice-dismissed";

const MigrationNoticeModal = () => {
  const navigate = useNavigate();
  const { tutorialCompleted, isTutorialActive } = useTutorial();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen) return;
    // Wait until the tutorial is finished before showing the migration notice
    if (!tutorialCompleted || isTutorialActive) return;
    // Defer modal so it doesn't become the LCP element & block initial paint
    const show = () => setOpen(true);
    const idle = (window as any).requestIdleCallback;
    const handle = idle
      ? idle(show, { timeout: 1500 })
      : window.setTimeout(show, 800);
    return () => {
      if (idle && (window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [tutorialCompleted, isTutorialActive]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    window.dispatchEvent(new Event(MIGRATION_DISMISSED_EVENT));
  };

  const handleSignup = () => {
    dismiss();
    navigate("/auth?mode=signup");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-4 animate-in fade-in duration-300"
      style={{ background: "hsl(0 0% 0% / 0.6)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
    >
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-7 pb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary/80">
              서비스 업데이트 안내
            </p>
            <h2
              id="migration-title"
              className="mt-1.5 text-xl font-bold text-foreground"
            >
              완등 2.0이 출시됐어요
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm leading-relaxed text-foreground/90 [text-size-adjust:100%]">
              더 나은 서비스를 위해 앱을 전면 업데이트했습니다.
              이 과정에서 기존 계정 정보가 초기화되었으니
              번거로우시더라도 다시 회원가입을 부탁드립니다.
            </p>

            <div className="rounded-2xl bg-muted/50 p-3.5 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground">
                초기화된 정보
              </p>
              <ul className="space-y-1.5">
                {[
                  { icon: UserCircle, label: "로그인 계정 및 프로필" },
                  { icon: Mountain, label: "등산 기록 및 완등 이력" },
                  { icon: Trophy, label: "챌린지 진행 현황" },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 text-xs text-foreground/80"
                  >
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-border/40 bg-card px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 space-y-2">
          <Button
            onClick={handleSignup}
            className="w-full h-11 text-sm font-semibold rounded-xl"
          >
            회원가입하기
          </Button>
          <Button
            onClick={dismiss}
            variant="ghost"
            className="w-full h-10 text-sm font-medium text-muted-foreground rounded-xl"
          >
            나중에
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MigrationNoticeModal;
