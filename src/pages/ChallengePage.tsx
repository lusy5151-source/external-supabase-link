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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

// Tab order requested by user
const CATEGORY_ORDER: string[] = [
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

const ChallengePage = () => {
  const { user } = useAuth();
  const { fetchAllChallenges, fetchUserChallenges, recalculateProgress } = useChallenges();
  const { toast } = useToast();
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [completedChallenge, setCompletedChallenge] = useState<Challenge | null>(null);
  const [prevCompletedIds, setPrevCompletedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("summit_count");

  const load = async () => {
    setLoading(true);
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
  }, [user]);

  const ucMap = useMemo(() => {
    const m = new Map<string, UserChallenge>();
    userChallenges.forEach((uc) => m.set(uc.challenge_id, uc));
    return m;
  }, [userChallenges]);

  // Group challenges by category, sorted by level inside
  const grouped = useMemo(() => {
    const map = new Map<string, Challenge[]>();
    for (const c of allChallenges) {
      const key = c.category ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    map.forEach((arr) => arr.sort((a, b) => a.level - b.level));
    return map;
  }, [allChallenges]);

  // Available tabs in fixed order, only those that have challenges
  const availableTabs = useMemo(() => {
    const tabs = CATEGORY_ORDER.filter((c) => grouped.has(c));
    // append any unknown categories at the end
    for (const k of grouped.keys()) {
      if (!tabs.includes(k)) tabs.push(k);
    }
    return tabs;
  }, [grouped]);

  // Ensure activeCategory is valid once data loads
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeCategory)) {
      setActiveCategory(availableTabs[0]);
    }
  }, [availableTabs, activeCategory]);

  const visibleChallenges = grouped.get(activeCategory) ?? [];

  const joinedCount = userChallenges.length;
  const completedCount = userChallenges.filter((uc) => uc.completed).length;

  const handleJoin = async (challenge: Challenge) => {
    if (!user) return;
    setJoining(challenge.id);
    try {
      const { data: existing } = await (supabase as any)
        .from("user_challenges")
        .select("id")
        .eq("user_id", user.id)
        .eq("challenge_id", challenge.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await (supabase as any)
          .from("user_challenges")
          .insert({ user_id: user.id, challenge_id: challenge.id });
        if (error) throw error;
      }
      await recalculateProgress();
      await load();
      toast({ title: "챌린지 참여 완료!", description: `${challenge.title}에 참여했어요.` });
    } catch (e: any) {
      toast({ title: "참여 실패", description: e.message ?? "다시 시도해주세요.", variant: "destructive" });
    } finally {
      setJoining(null);
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
    <div className="space-y-5 pb-24">
      <ChallengeCompletionModal challenge={completedChallenge} onDismiss={() => setCompletedChallenge(null)} />

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-emerald-100/50 dark:from-primary/5 dark:to-emerald-900/20 p-6 text-center border border-border">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">정상 점령 챌린지</h1>
        <p className="text-sm text-muted-foreground mt-1">카테고리별 챌린지에 참여하고 진행률을 확인하세요</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div>
            <span className="font-bold text-foreground">{joinedCount}</span>
            <span className="text-muted-foreground"> 참여중</span>
          </div>
          <div>
            <span className="font-bold text-primary">{completedCount}</span>
            <span className="text-muted-foreground"> 달성</span>
          </div>
          <div>
            <span className="font-bold text-foreground">{allChallenges.length}</span>
            <span className="text-muted-foreground"> 전체</span>
          </div>
        </div>
      </div>

      {/* Category tabs - horizontal scroll */}
      {!loading && availableTabs.length > 0 && (
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1 min-w-max">
            {availableTabs.map((cat) => {
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              const list = grouped.get(cat) ?? [];
              const doneInCat = list.filter((c) => ucMap.get(c.id)?.completed).length;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold transition whitespace-nowrap border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "" : meta.color}`} />
                  <span>{meta.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {doneInCat}/{list.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active category section */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : visibleChallenges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">표시할 챌린지가 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {(() => {
            const meta = getCategoryMeta(activeCategory);
            const SectionIcon = meta.icon;
            return (
              <div className="flex items-center gap-2 px-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${meta.bg}`}>
                  <SectionIcon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <h2 className="text-base font-bold text-foreground">{meta.label}</h2>
                <span className="text-xs text-muted-foreground">· {visibleChallenges.length}개 챌린지</span>
              </div>
            );
          })()}

          {visibleChallenges.map((ch) => {
            const uc = ucMap.get(ch.id);
            const tier = getTierForLevel(ch.level);
            const tierColor = TIER_COLORS[tier];
            const meta = getCategoryMeta(ch.category);
            const Icon = meta.icon;
            const goal = ch.goal_value || 1;
            const progress = uc?.progress ?? 0;
            const pct = uc ? Math.min(Math.round((progress / goal) * 100), 100) : 0;
            const completed = !!uc?.completed;

            return (
              <div
                key={ch.id}
                className={`rounded-2xl border bg-card p-4 shadow-sm transition ${
                  completed ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColor.bg} ${tierColor.text}`}>
                        LV{ch.level}
                      </span>
                      <h3 className="font-semibold text-sm text-foreground truncate">{ch.title}</h3>
                      {completed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                          <CheckCircle2 className="h-3 w-3" /> 달성
                        </span>
                      )}
                    </div>
                    {ch.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ch.description}</p>}

                    {uc ? (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{completed ? "완료" : "진행중"}</span>
                          <span className={`font-semibold ${completed ? "text-primary" : tierColor.text}`}>
                            {Math.min(progress, goal)} / {goal} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              completed ? "bg-primary" : "bg-primary/80"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {completed && uc.completed_at && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(uc.completed_at).toLocaleDateString("ko-KR")} 달성
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-3 rounded-xl gap-1.5 h-8"
                        onClick={() => handleJoin(ch)}
                        disabled={joining === ch.id}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {joining === ch.id ? "참여 중..." : "참여하기"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChallengePage;
