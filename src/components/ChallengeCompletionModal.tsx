import { X, Trophy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MountainMascot from "@/components/MountainMascot";

export interface CompletionInfo {
  /** Category label e.g. "완등 횟수" */
  categoryLabel: string;
  /** Just-completed level number */
  completedLevel: number;
  /** Title of the level just completed */
  completedTitle: string;
  /** Next level info, null if user reached the top */
  nextLevel?: number | null;
  nextTitle?: string | null;
  nextGoalValue?: number | null;
  /** True when user finished the entire ladder */
  isFinalLevel: boolean;
  badge?: { name: string; image_url: string | null } | null;
}

interface Props {
  /** New API: pass full completion info */
  completion?: CompletionInfo | null;
  /** Legacy API kept for backwards compatibility */
  challenge?: {
    title: string;
    description?: string | null;
    badge?: { name: string; image_url: string | null } | null;
  } | null;
  onDismiss: () => void;
}

const ChallengeCompletionModal = ({ completion, challenge, onDismiss }: Props) => {
  const [visible, setVisible] = useState(false);
  const active = completion || challenge;

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [active]);

  if (!active) return null;

  // Legacy fallback rendering
  if (!completion && challenge) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
          onClick={onDismiss}
        />
        <div
          className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-xl transition-all duration-500"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.7) translateY(40px)" }}
        >
          <button onClick={onDismiss} className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
          <MountainMascot size={80} mood="success" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-emerald-600">챌린지 달성!</p>
          <h3 className="mt-1 text-xl font-bold text-foreground">{challenge.title}</h3>
          {challenge.description && <p className="mt-2 text-sm text-muted-foreground">{challenge.description}</p>}
          {challenge.badge && <p className="mt-2 text-sm font-medium text-emerald-600">🏅 {challenge.badge.name} 배지 획득!</p>}
          <div className="mt-5">
            <Button onClick={onDismiss} className="w-full">확인</Button>
          </div>
        </div>
      </div>
    );
  }

  // New level-up modal
  const c = completion!;
  const isFinal = c.isFinalLevel;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onDismiss}
      />
      <div
        className={`relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl transition-all duration-500 ${
          visible ? "animate-scale-in" : ""
        }`}
        style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.7) translateY(40px)" }}
      >
        {/* Decorative gradient header */}
        <div
          className={`relative px-6 pt-7 pb-4 text-center ${
            isFinal
              ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 dark:from-amber-900/40 dark:via-yellow-900/20 dark:to-orange-900/30"
              : "bg-gradient-to-br from-primary/15 via-emerald-50 to-emerald-100 dark:from-primary/20 dark:via-emerald-900/20 dark:to-emerald-900/30"
          }`}
        >
          <button
            onClick={onDismiss}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-background/60 transition"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Floating sparkles */}
          <span className="pointer-events-none absolute left-6 top-6 text-2xl animate-mascot-sparkle">✨</span>
          <span
            className="pointer-events-none absolute right-8 top-10 text-2xl animate-mascot-sparkle"
            style={{ animationDelay: "0.2s" }}
          >
            🎉
          </span>
          <span
            className="pointer-events-none absolute left-10 bottom-2 text-xl animate-mascot-sparkle"
            style={{ animationDelay: "0.4s" }}
          >
            🎊
          </span>

          <div className="flex justify-center">
            <MountainMascot size={110} mood={isFinal ? "celebrating" : "success"} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4 text-center">
          {isFinal ? (
            <>
              <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1">
                <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  CHALLENGE COMPLETE
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground leading-tight">
                🏆 {c.categoryLabel} 챌린지 완주!
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                모든 레벨을 달성했어요. 정말 대단해요!
              </p>
              <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  최종 달성
                </p>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  LV{c.completedLevel} · {c.completedTitle}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">LEVEL UP</span>
              </div>
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {c.categoryLabel} LV{c.completedLevel} 달성!
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.completedTitle}</p>

              {c.nextLevel && c.nextTitle && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    다음 목표 · LV{c.nextLevel}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{c.nextTitle}</p>
                  {c.nextGoalValue && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      목표: {c.nextGoalValue}개 달성
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {c.badge && (
            <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              🏅 {c.badge.name} 배지 획득!
            </p>
          )}

          <Button onClick={onDismiss} className="mt-5 w-full rounded-xl h-11 font-semibold">
            확인
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCompletionModal;
