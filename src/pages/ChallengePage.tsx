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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import ChallengeCompletionModal from "@/components/ChallengeCompletionModal";

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
  const { toast } = useToast();
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<string | null>(null);
  const [completedChallenge, setCompletedChallenge] = useState<Challenge | null>(null);
  const [prevCompletedIds, setPrevCompletedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    // Always recalc first so auto-level-up has a chance to insert next levels
    await recalculateProgress();
    const [all, mine] = await Promise.all([fetchAllChallenges(), fetchUserChallenges()]);
    setAllChallenges(all);
    const newCompletedIds = new Set(mine.filter((uc) => uc.completed).map((uc) => uc.challenge_id));
    if (prevCompletedIds.size > 0) {
      for (const id of newCompletedIds) {
        if (!prevCompletedIds.has(id)) {
          const ch = all.find((c) => c.id === id);
          if (ch) {
            setCompletedChallenge(ch);
            break;
          }
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
  };

  const groupStates = useMemo<GroupState[]>(() => {
    const orderedKeys = [
      ...GROUP_ORDER.filter((g) => ladders.has(g)),
      ...Array.from(ladders.keys()).filter((k) => !GROUP_ORDER.includes(k)),
    ];
    return orderedKeys.map((key) => {
      const ladder = ladders.get(key) ?? [];
      const joinedRungs = ladder.filter((ch) => ucByChallenge.has(ch.id));
      const joined = joinedRungs.length > 0;
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
      toast({
        title: "챌린지 참여 완료!",
        description: `${getCategoryMeta(key).label} LV1부터 시작합니다.`,
      });
    } catch (e: any) {
      toast({ title: "참여 실패", description: e.message ?? "다시 시도해주세요.", variant: "destructive" });
    } finally {
      setJoiningGroup(null);
      setConfirmGroup(null);
    }
  };

  if (!user)
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
      <ChallengeCompletionModal challenge={completedChallenge} onDismiss={() => setCompletedChallenge(null)} />

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-emerald-100/50 dark:from-primary/5 dark:to-emerald-900/20 p-6 text-center border border-border">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">레벨업 챌린지</h1>
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
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                아직 참여 중인 챌린지가 없습니다.
                <br />
                아래에서 카테고리를 선택해 시작해보세요.
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
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {g.completedCount}/{g.ladder.length} 단계
                          </span>
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
              <div className="flex items-center gap-2 px-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="text-base font-bold text-foreground">참여하기</h2>
                <span className="text-xs text-muted-foreground">· {availableGroups.length}개 카테고리</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {availableGroups.map((g) => {
                  const meta = getCategoryMeta(g.key);
                  const Icon = meta.icon;
                  const lv1 = g.ladder.find((c) => c.level === 1) ?? g.ladder[0];
                  return (
                    <button
                      key={g.key}
                      onClick={() => setConfirmGroup(g.key)}
                      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition hover:border-primary/40 active:scale-[0.99]"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          총 {g.ladder.length}단계 · 시작: {lv1?.title ?? "LV1"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition" />
                    </button>
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
    </div>
  );
};

export default ChallengePage;
