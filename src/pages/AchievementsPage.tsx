import { badges, badgeCategories, BadgeCategory } from "@/data/badges";
import { useStore } from "@/context/StoreContext";
import { useGearStore } from "@/hooks/useGearStore";
import { useAchievementStore } from "@/hooks/useAchievementStore";
import { useSharedCompletionCounts } from "@/hooks/useSharedCompletionCounts";
import { useState, useMemo } from "react";
import { Trophy, Lock } from "lucide-react";

const AchievementsPage = () => {
  const { records, completedCount } = useStore();
  const { items: gearItems } = useGearStore();
  const sharedCompletions = useSharedCompletionCounts();
  const { isEarned, earnedCount, totalBadges, earnedBadges } = useAchievementStore(records, gearItems, sharedCompletions);
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | "all">("all");
  const filteredBadges = useMemo(() => activeCategory === "all" ? badges : badges.filter((b) => b.category === activeCategory), [activeCategory]);
  const percentage = Math.round((earnedCount / totalBadges) * 100);

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><Trophy className="h-8 w-8 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">업적</h1>
        <p className="text-sm text-muted-foreground mt-1">{earnedCount} / {totalBadges} 달성</p>
        <div className="mt-4 mx-auto max-w-xs"><div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${percentage}%` }} /></div><p className="mt-1.5 text-xs text-muted-foreground">{percentage}%</p></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => setActiveCategory("all")} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>전체</button>
        {(Object.keys(badgeCategories) as BadgeCategory[]).map((cat) => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{badgeCategories[cat].icon} {badgeCategories[cat].label}</button>))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filteredBadges.map((badge) => {
          const unlocked = isEarned(badge.id);
          const earnedData = earnedBadges.find((e) => e.badgeId === badge.id);
          return (
            <div key={badge.id} className={`relative rounded-xl border p-4 text-center transition-all ${unlocked ? "border-primary/30 bg-card shadow-sm" : "border-border bg-muted/30 opacity-60"}`}>
              <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${unlocked ? "bg-primary/10" : "bg-secondary"}`}>{unlocked ? <span className="text-2xl">{badge.icon}</span> : <Lock className="h-5 w-5 text-muted-foreground/50" />}</div>
              <p className={`text-sm font-semibold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{badge.name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
              {unlocked && earnedData && <p className="mt-1.5 text-[10px] text-primary">{new Date(earnedData.earnedAt).toLocaleDateString("ko-KR")} 달성</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPage;