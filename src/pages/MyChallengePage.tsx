import { lazy, Suspense } from "react";
import { badges } from "@/data/badges";
import { useStore } from "@/context/StoreContext";
import { useGearStore } from "@/hooks/useGearStore";
import { useAchievementStore } from "@/hooks/useAchievementStore";
import { useSharedCompletionCounts } from "@/hooks/useSharedCompletionCounts";
import { Lock } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

const ChallengePage = lazy(() => import("@/pages/ChallengePage"));

const MyChallengePage = () => {
  const { records } = useStore();
  const { items: gearItems } = useGearStore();
  const sharedCompletions = useSharedCompletionCounts();
  const { isEarned, earnedCount, totalBadges, earnedBadges } = useAchievementStore(records, gearItems, sharedCompletions);
  const percentage = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* SUB-SECTION A — 업적 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ fontSize: 14 }}>업적</h2>
          <span className="text-xs text-muted-foreground">{earnedCount}/{totalBadges} 달성</span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full overflow-hidden"
          style={{
            height: 6,
            borderRadius: 3,
            background: "hsl(var(--color-border-tertiary))",
          }}
        >
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${percentage}%`,
              borderRadius: 3,
              background: "hsl(var(--brand-lime))",
            }}
          />
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {badges.map((badge) => {
            const unlocked = isEarned(badge.id);
            const earnedData = earnedBadges.find((e) => e.badgeId === badge.id);
            return (
              <div
                key={badge.id}
                className="bg-card text-center"
                style={{
                  border: "0.5px solid hsl(var(--color-border-tertiary))",
                  borderRadius: "var(--border-radius-lg, 16px)",
                  padding: 12,
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <div
                  className="mx-auto flex items-center justify-center rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    background: unlocked
                      ? "hsl(var(--brand-lime))"
                      : "hsl(var(--color-background-secondary, var(--secondary)))",
                  }}
                >
                  {unlocked ? (
                    <span className="text-lg">{badge.icon}</span>
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <p
                  className="text-foreground"
                  style={{ fontSize: 12, fontWeight: 500, marginTop: 6 }}
                >
                  {badge.name}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 10 }}>
                  {unlocked && earnedData
                    ? new Date(earnedData.earnedAt).toLocaleDateString("ko-KR")
                    : "잠금"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SUB-SECTION B — 챌린지 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ fontSize: 14 }}>챌린지</h2>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <ChallengePage />
        </Suspense>
      </section>
    </div>
  );
};

export default MyChallengePage;
