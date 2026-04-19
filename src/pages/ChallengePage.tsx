import { useEffect, useState, useMemo } from "react";
import { useChallenges, Challenge, UserChallenge, getTierForLevel, TIER_COLORS } from "@/hooks/useChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trophy, Target, CheckCircle2, TrendingUp, MapPin, CalendarCheck, CloudRain, Clock, Mountain, Leaf, Swords, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ChallengeCompletionModal from "@/components/ChallengeCompletionModal";

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string }> = {
  distance: { icon: TrendingUp, color: "text-coral", bg: "bg-coral/15" },
  elevation: { icon: Mountain, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  mountain_count: { icon: Target, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  region: { icon: MapPin, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-900/30" },
  habit: { icon: CalendarCheck, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30" },
  weather: { icon: CloudRain, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  time: { icon: Clock, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  difficulty: { icon: Swords, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  season: { icon: Leaf, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
};

const getCategoryMeta = (cat?: string) => CATEGORY_META[cat ?? ""] ?? { icon: Trophy, color: "text-primary", bg: "bg-primary/15" };

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
  const [filter, setFilter] = useState<"all" | "joined" | "available">("all");

  const load = async () => {
    setLoading(true);
    const [all, mine] = await Promise.all([fetchAllChallenges(), fetchUserChallenges()]);
    setAllChallenges(all);
    const newCompletedIds = new Set(mine.filter((uc) => uc.completed).map((uc) => uc.challenge_id));
    if (prevCompletedIds.size > 0) {
      for (const id of newCompletedIds) {
        if (!prevCompletedIds.has(id)) {
          const ch = all.find((c) => c.id === id);
          if (ch) { setCompletedChallenge(ch); break; }
        }
      }
    }
    setPrevCompletedIds(newCompletedIds);
    setUserChallenges(mine);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const ucMap = useMemo(() => {
    const m = new Map<string, UserChallenge>();
    userChallenges.forEach((uc) => m.set(uc.challenge_id, uc));
    return m;
  }, [userChallenges]);

  const visibleChallenges = useMemo(() => {
    const sorted = [...allChallenges].sort((a, b) => {
      const ca = (a.category ?? "").localeCompare(b.category ?? "");
      if (ca !== 0) return ca;
      return a.level - b.level;
    });
    if (filter === "joined") return sorted.filter((c) => ucMap.has(c.id));
    if (filter === "available") return sorted.filter((c) => !ucMap.has(c.id));
    return sorted;
  }, [allChallenges, ucMap, filter]);

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
      toast({ title: "챌린지 참여 완료!", description: `${challenge.title}에 참여했어요. 홈에서 진행률을 확인하세요.` });
    } catch (e: any) {
      toast({ title: "참여 실패", description: e.message ?? "다시 시도해주세요.", variant: "destructive" });
    } finally {
      setJoining(null);
    }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Target className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">챌린지에 참여하려면 로그인이 필요합니다.</p>
      <Link to="/auth"><Button>로그인</Button></Link>
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
        <p className="text-sm text-muted-foreground mt-1">참여할 챌린지를 선택하면 홈 화면에서 진행률을 확인할 수 있어요</p>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div><span className="font-bold text-foreground">{joinedCount}</span><span className="text-muted-foreground"> 참여중</span></div>
          <div><span className="font-bold text-primary">{completedCount}</span><span className="text-muted-foreground"> 달성</span></div>
          <div><span className="font-bold text-foreground">{allChallenges.length}</span><span className="text-muted-foreground"> 전체</span></div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {([
          { id: "all", label: "전체" },
          { id: "available", label: "참여 가능" },
          { id: "joined", label: "참여중" },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition ${
              filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : visibleChallenges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">표시할 챌린지가 없습니다.</div>
      ) : (
        <div className="space-y-2.5">
          {visibleChallenges.map((ch) => {
            const uc = ucMap.get(ch.id);
            const tier = getTierForLevel(ch.level);
            const tierColor = TIER_COLORS[tier];
            const meta = getCategoryMeta(ch.category);
            const Icon = meta.icon;
            const pct = uc ? Math.min(Math.round((uc.progress / ch.goal_value) * 100), 100) : 0;

            return (
              <div key={ch.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColor.bg} ${tierColor.text}`}>LV{ch.level}</span>
                      <h3 className="font-semibold text-sm text-foreground truncate">{ch.title}</h3>
                    </div>
                    {ch.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ch.description}</p>}

                    {uc ? (
                      uc.completed ? (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-primary font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          달성 완료{uc.completed_at && ` · ${new Date(uc.completed_at).toLocaleDateString("ko-KR")}`}
                        </div>
                      ) : (
                        <div className="mt-2.5 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">진행중</span>
                            <span className={`font-semibold ${tierColor.text}`}>{uc.progress} / {ch.goal_value} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
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
