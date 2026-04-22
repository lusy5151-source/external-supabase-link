import { useEffect, useState, useMemo } from "react";
import { useChallenges, Challenge, UserChallenge, getTierForLevel, TIER_COLORS } from "@/hooks/useChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Target,
  CheckCircle2,
  TrendingUp,
  MapPin,
  CalendarCheck,
  CloudRain,
  Clock,
  Mountain,
  Leaf,
  Swords,
  Plus,
  Award,
  Trees,
  Sparkles,
  Users,
  ChevronRight,
  RefreshCw,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChallengeCompletionModal, { CompletionInfo } from "@/components/ChallengeCompletionModal";

// Category visual meta
const CATEGORY_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  summit_count: { icon: Target, label: "완등 횟수", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  bac100: { icon: Award, label: "백대명산", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  national_park: { icon: Trees, label: "국립공원", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  elevation: { icon: Mountain, label: "고도", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  habit: { icon: CalendarCheck, label: "꾸준함", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30" },
  region: { icon: MapPin, label: "지역 탐험", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-900/30" },
  season: { icon: Leaf, label: "계절", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30" },
  special: { icon: Sparkles, label: "특별", color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30" },
  social: { icon: Users, label: "소셜", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  // legacy fallbacks
  distance: { icon: TrendingUp, label: "거리", color: "text-coral", bg: "bg-coral/15" },
  weather: { icon: CloudRain, label: "날씨", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  time: { icon: Clock, label: "시간", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  difficulty: { icon: Swords, label: "난이도", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  mountain_count: { icon: Target, label: "완등 횟수", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
};

const getCategoryMeta = (cat?: string) =>
  CATEGORY_META[cat ?? ""] ?? { icon: Trophy, label: cat ?? "기타", color: "text-primary", bg: "bg-primary/15" };

// Group order
const GROUP_ORDER: string[] = [
  "summit_count",
  "bac100",
  "national_park",
  "elevation",
  "habit",
  "region",
  "season",
  "special",
  "social",
];

const groupKey = (c: Challenge) => c.category_group ?? c.category ?? "other";

const ChallengePage = () => {
  const { user } = useAuth();
  const { fetchAllChallenges, fetchUserChallenges, recalculateProgress } = useChallenges();
  const [refreshing, setRefreshing] = useState(false);
  
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionInfo | null>(null);
  const [prevCompletedIds, setPrevCompletedIds] = useState<Set<string> | null>(null);
  const [abandonTarget, setAbandonTarget] = useState<{ key: string; challengeName: string; progress: number; goal: number } | null>(null);
  const [abandoning, setAbandoning] = useState(false);

  const load = async () => {
    setLoading(true);
    // Always recalc first so auto-level-up has a chance to insert next levels
    await recalculateProgress();
    const [all, mine] = await Promise.all([fetchAllChallenges(), fetchUserChallenges()]);
    setAllChallenges(all);
    const newCompletedIds = new Set(mine.filter((uc) => uc.completed).map((uc) => uc.challenge_id));
    if (prevCompletedIds !== null) {
      // Detect newly-completed challenges since last load
      for (const id of newCompletedIds) {
        if (!prevCompletedIds.has(id)) {
          const ch = all.find((c) => c.id === id);
          if (!ch) continue;
          const key = ch.category_group ?? ch.category ?? "other";
          const ladder = all
            .filter((x) => (x.category_group ?? x.category) === key)
            .sort((a, b) => a.level - b.level);
          const next = ladder.find((x) => x.level === ch.level + 1);
          const isFinal = !next;
          setCompletion({
            categoryLabel: getCategoryMeta(key).label,
            completedLevel: ch.level,
            completedTitle: ch.title,
            nextLevel: next?.level ?? null,
            nextTitle: next?.title ?? null,
            nextGoalValue: next?.goal_value ?? null,
            isFinalLevel: isFinal,
            badge: ch.badge ?? null,
          });
          break; // show one at a time
        }
      }
    }
    setPrevCompletedIds(newCompletedIds);
    setUserChallenges(mine);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Group ladder by group key (sorted by level ascending)
  const ladders = useMemo(() => {
    const map = new Map<string, Challenge[]>();
    for (const c of allChallenges) {
      const key = groupKey(c);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    map.forEach((arr) => arr.sort((a, b) => a.level - b.level));
    return map;
  }, [allChallenges]);

  const ucByChallenge = useMemo(() => {
    const m = new Map<string, UserChallenge>();
    userChallenges.forEach((uc) => m.set(uc.challenge_id, uc));
    return m;
  }, [userChallenges]);

  // For each group: figure out current rung (highest joined level)
  // and whether user has joined this group at all
  type GroupState = {
    key: string;
    ladder: Challenge[];
    joined: boolean;
    currentRung: Challenge | null; // active (incomplete) level OR last completed if all done
    currentUc: UserChallenge | null;
    allComplete: boolean;
    completedCount: number;
    wasAbandoned: boolean; // previously abandoned this group
  };

  const groupStates = useMemo<GroupState[]>(() => {
    const orderedKeys = [
      ...GROUP_ORDER.filter((g) => ladders.has(g)),
      ...Array.from(ladders.keys()).filter((k) => !GROUP_ORDER.includes(k)),
    ];
    return orderedKeys.map((key) => {
      const ladder = ladders.get(key) ?? [];
      const joinedRungs = ladder.filter((ch) => {
        const uc = ucByChallenge.get(ch.id);
        return uc && !(uc as any).abandoned_at;
      });
      const abandonedRungs = ladder.filter((ch) => {
        const uc = ucByChallenge.get(ch.id);
        return uc && !!(uc as any).abandoned_at;
      });
      const joined = joinedRungs.length > 0;
      const wasAbandoned = abandonedRungs.length > 0 && !joined;
      const completedCount = joinedRungs.filter((ch) => ucByChallenge.get(ch.id)?.completed).length;
      // current rung = lowest level that is joined and NOT completed
      let currentRung: Challenge | null =
        joinedRungs.find((ch) => !ucByChallenge.get(ch.id)?.completed) ?? null;
      // if everything joined is completed but ladder still has more levels, use next level
      if (!currentRung && joined) {
        const lastJoined = joinedRungs[joinedRungs.length - 1];
        const nextInLadder = ladder.find((c) => c.level === lastJoined.level + 1);
        currentRung = nextInLadder ?? lastJoined;
      }
      const allComplete =
        joined && completedCount === ladder.length && ladder.length > 0;
      return {
        key,
        ladder,
        joined,
        currentRung,
        currentUc: currentRung ? ucByChallenge.get(currentRung.id) ?? null : null,
        allComplete,
        completedCount,
        wasAbandoned,
      };
    });
  }, [ladders, ucByChallenge]);

  const joinedGroups = groupStates.filter((g) => g.joined);
  const availableGroups = groupStates.filter((g) => !g.joined);

  const totalCompleted = userChallenges.filter((uc) => uc.completed).length;

  const handleJoinGroup = async (key: string) => {
    if (!user) return;
    const ladder = ladders.get(key);
    if (!ladder || ladder.length === 0) return;
    const lv1 = ladder.find((c) => c.level === 1) ?? ladder[0];
    setJoiningGroup(key);
    try {
      const { data: existing } = await (supabase as any)
        .from("user_challenges")
        .select("id")
        .eq("user_id", user.id)
        .eq("challenge_id", lv1.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await (supabase as any)
          .from("user_challenges")
          .insert({ user_id: user.id, challenge_id: lv1.id });
        if (error) throw error;
      }
      await load();
      toast.success("챌린지를 시작했어요!");
    } catch (e: any) {
      toast.error(e.message ?? "다시 시도해주세요.");
    } finally {
      setJoiningGroup(null);
      setConfirmGroup(null);
    }
  };

  const handleAbandon = async () => {
    if (!user || !abandonTarget) return;
    setAbandoning(true);
    try {
      const ladder = ladders.get(abandonTarget.key);
      if (!ladder) return;
      // Find all user_challenges for this group and abandon them
      const challengeIds = ladder.map((c) => c.id);
      const ucsToAbandon = userChallenges.filter(
        (uc) => challengeIds.includes(uc.challenge_id) && !(uc as any).abandoned_at
      );
      for (const uc of ucsToAbandon) {
        await (supabase as any)
          .from("user_challenges")
          .update({
            abandoned_at: new Date().toISOString(),
            progress: 0,
          })
          .eq("id", uc.id);
      }
      setAbandonTarget(null);
      await load();
      toast("챌린지를 포기했어요. 언제든 다시 도전할 수 있어요 💪", {
        style: {
          background: "#444441",
          color: "white",
          borderRadius: "var(--border-radius-md, 12px)",
          padding: "10px 16px",
        },
        duration: 3000,
      });
    } catch (e: any) {
      toast.error(e.message ?? "다시 시도해주세요.");
    } finally {
      setAbandoning(false);
    }
  };


    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Target className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">챌린지에 참여하려면 로그인이 필요합니다.</p>
        <Link to="/auth">
          <Button>로그인</Button>
        </Link>
      </div>
    );

  return (
    <div className="space-y-6 pb-24">
      <ChallengeCompletionModal completion={completion} onDismiss={() => setCompletion(null)} />

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-emerald-100/50 dark:from-primary/5 dark:to-emerald-900/20 p-6 text-center border border-border">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-foreground">레벨업 챌린지</h1>
          <button
            onClick={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
              toast.success("챌린지 진행 상황을 새로고침했어요");
            }}
            disabled={refreshing}
            className="rounded-full p-1.5 hover:bg-background/60 transition"
            aria-label="새로고침"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">카테고리별로 1번 참여하고 레벨업 하세요</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div>
            <span className="font-bold text-foreground">{joinedGroups.length}</span>
            <span className="text-muted-foreground"> 참여중</span>
          </div>
          <div>
            <span className="font-bold text-primary">{totalCompleted}</span>
            <span className="text-muted-foreground"> 레벨 달성</span>
          </div>
          <div>
            <span className="font-bold text-foreground">{groupStates.length}</span>
            <span className="text-muted-foreground"> 카테고리</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Joined section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground">참여 중인 챌린지</h2>
              <span className="text-xs text-muted-foreground">· {joinedGroups.length}개</span>
            </div>

            {joinedGroups.length === 0 ? (
              <div
                style={{
                  background: "#EEEDFE",
                  borderRadius: "var(--border-radius-lg, 16px)",
                  padding: 14,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: "#3C3489" }}>
                  도전할 챌린지를 선택해보세요
                </p>
                <p style={{ fontSize: 12, color: "#534AB7", marginTop: 2 }}>
                  하나를 선택하면 진행 상황을 추적할 수 있어요
                </p>
              </div>
            ) : (
              joinedGroups.map((g) => {
                const meta = getCategoryMeta(g.key);
                const Icon = meta.icon;
                const ch = g.currentRung!;
                const tier = getTierForLevel(ch.level);
                const tierColor = TIER_COLORS[tier];
                const goal = ch.goal_value || 1;
                const progress = g.currentUc?.progress ?? 0;
                const pct = g.allComplete
                  ? 100
                  : Math.min(Math.round((progress / goal) * 100), 100);

                return (
                  <div
                    key={g.key}
                    className={`rounded-2xl border bg-card p-4 shadow-sm ${
                      g.allComplete ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                   >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-foreground">{meta.label}</h3>
                          {g.allComplete ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                              <CheckCircle2 className="h-3 w-3" /> 완료
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColor.bg} ${tierColor.text}`}>
                              LV{ch.level}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto mr-1">
                            {g.completedCount}/{g.ladder.length} 단계
                          </span>
                          {!g.allComplete && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 -mr-1 rounded-md hover:bg-muted transition" aria-label="더보기">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[140px]">
                                <DropdownMenuItem
                                  onClick={() => setAbandonTarget({
                                    key: g.key,
                                    challengeName: meta.label,
                                    progress,
                                    goal,
                                  })}
                                  style={{ color: "#E24B4A", fontSize: 14 }}
                                >
                                  챌린지 포기하기
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <p className="text-xs text-foreground mt-1.5 font-medium truncate">
                          {ch.title}
                        </p>
                        {!g.allComplete && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {Math.min(progress, goal)}개 달성 중 → {goal}개 목표
                          </p>
                        )}

                        <div className="mt-2.5 space-y-1.5">
                          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                g.allComplete ? "bg-primary" : "bg-primary/80"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{g.allComplete ? "최고 레벨 달성!" : "진행률"}</span>
                            <span className="font-semibold text-foreground">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Available section */}
          {availableGroups.length > 0 && (
            <section className="space-y-3">
              {joinedGroups.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">참여하기</h2>
                  <span className="text-xs text-muted-foreground">· {availableGroups.length}개 카테고리</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {(joinedGroups.length === 0 ? availableGroups.slice(0, 3) : availableGroups).map((g) => {
                  const meta = getCategoryMeta(g.key);
                  const Icon = meta.icon;
                  const lv1 = g.ladder.find((c) => c.level === 1) ?? g.ladder[0];
                  const noActive = joinedGroups.length === 0;
                  return (
                    <div
                      key={g.key}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-foreground">{meta.label}</p>
                          {g.wasAbandoned && (
                            <span style={{
                              background: "#FAEEDA",
                              color: "#633806",
                              fontSize: 10,
                              borderRadius: 10,
                              padding: "1px 6px",
                              fontWeight: 500,
                            }}>재도전</span>
                          )}
                        </div>
                        {g.wasAbandoned ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            이전에 도전한 적 있어요
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground truncate">
                            총 {g.ladder.length}단계 · 시작: {lv1?.title ?? "LV1"}
                          </p>
                        )}
                      </div>
                      {noActive ? (
                        <button
                          onClick={() => handleJoinGroup(g.key)}
                          disabled={!!joiningGroup}
                          style={{
                            border: "0.5px solid #534AB7",
                            color: "#534AB7",
                            borderRadius: 20,
                            fontSize: 12,
                            padding: "4px 10px",
                            background: "transparent",
                            whiteSpace: "nowrap",
                          }}
                        >
                          도전 시작
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmGroup(g.key)}
                          className="shrink-0"
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <AlertDialog open={!!confirmGroup} onOpenChange={(o) => !o && setConfirmGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmGroup ? getCategoryMeta(confirmGroup).label : ""} 챌린지 시작
            </AlertDialogTitle>
            <AlertDialogDescription>
              LV1부터 시작합니다. 한 단계를 달성할 때마다 자동으로 다음 레벨로 올라갑니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmGroup && handleJoinGroup(confirmGroup)}
              disabled={!!joiningGroup}
            >
              {joiningGroup ? "참여 중..." : "참여하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Abandon bottom sheet */}
      {abandonTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setAbandonTarget(null)}>
          <div className="fixed inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-card rounded-t-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted-foreground/30" />
            
            <h3 style={{ fontSize: 16, fontWeight: 500 }} className="text-foreground text-center">
              챌린지를 포기할까요?
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.6 }} className="text-muted-foreground text-center mt-2">
              지금까지의 진행 상황이 모두 초기화돼요.{"\n"}나중에 다시 처음부터 도전할 수 있어요.
            </p>

            {/* Progress summary */}
            <div
              className="mt-4 rounded-xl bg-secondary/50"
              style={{ padding: "10px 12px" }}
            >
              <p style={{ fontSize: 13 }} className="text-muted-foreground text-center">
                {abandonTarget.challengeName} · {abandonTarget.progress}/{abandonTarget.goal} 달성
              </p>
            </div>

            <button
              onClick={handleAbandon}
              disabled={abandoning}
              className="w-full mt-5 rounded-xl text-white font-medium transition disabled:opacity-50"
              style={{ background: "#E24B4A", height: 44 }}
            >
              {abandoning ? "처리 중..." : "포기하기"}
            </button>
            <button
              onClick={() => setAbandonTarget(null)}
              className="w-full mt-2 text-muted-foreground font-medium transition"
              style={{ height: 40 }}
            >
              계속 도전할게요
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengePage;
