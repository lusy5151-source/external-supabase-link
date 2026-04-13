import { useEffect, useState, useMemo } from "react";
import { useChallenges, Challenge, UserChallenge, getTierForLevel, TIER_COLORS, BadgeTier } from "@/hooks/useChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trophy, Target, CheckCircle2, Lock, ChevronRight, TrendingUp, MapPin, CalendarCheck, CloudRain, Clock, Mountain, Leaf, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import ChallengeCompletionModal from "@/components/ChallengeCompletionModal";

const CATEGORIES = [
  { id: "distance", title: "거리 챌린지", description: "총 등산 거리를 정복하세요", icon: TrendingUp, color: "coral" },
  { id: "elevation", title: "고도 챌린지", description: "누적 고도를 정복하세요", icon: Mountain, color: "amber" },
  { id: "mountain_count", title: "봉우리 챌린지", description: "다양한 산을 등정하세요", icon: Target, color: "emerald" },
  { id: "region", title: "지역 탐험", description: "다양한 지역의 산을 탐험하세요", icon: MapPin, color: "sky" },
  { id: "habit", title: "등산 습관", description: "등산을 습관으로 만들어보세요", icon: CalendarCheck, color: "violet" },
  { id: "weather", title: "날씨 도전", description: "특별한 날씨 속 등산", icon: CloudRain, color: "blue" },
  { id: "time", title: "시간 도전", description: "특별한 시간대 등산", icon: Clock, color: "orange" },
  { id: "difficulty", title: "난이도 도전", description: "어려운 산에 도전하세요", icon: Swords, color: "red" },
  { id: "season", title: "시즌 챌린지", description: "계절별 특별 챌린지", icon: Leaf, color: "green" },
] as const;

const CATEGORY_STYLES: Record<string, { bg: string; iconBg: string; iconColor: string; progressBar: string }> = {
  distance: { bg: "from-coral/5 to-peach/10", iconBg: "bg-coral/15", iconColor: "text-coral", progressBar: "[&>div]:bg-coral" },
  elevation: { bg: "from-amber-50 to-yellow-50 dark:from-amber-950/10 dark:to-yellow-950/10", iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400", progressBar: "[&>div]:bg-amber-500" },
  mountain_count: { bg: "from-emerald-50 to-green-50 dark:from-emerald-950/10 dark:to-green-950/10", iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", progressBar: "[&>div]:bg-emerald-500" },
  region: { bg: "from-sky-50 to-blue-50 dark:from-sky-950/10 dark:to-blue-950/10", iconBg: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600 dark:text-sky-400", progressBar: "[&>div]:bg-sky-500" },
  habit: { bg: "from-violet-50 to-purple-50 dark:from-violet-950/10 dark:to-purple-950/10", iconBg: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-600 dark:text-violet-400", progressBar: "[&>div]:bg-violet-500" },
  weather: { bg: "from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-blue-950/10", iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400", progressBar: "[&>div]:bg-blue-500" },
  time: { bg: "from-orange-50 to-amber-50 dark:from-orange-950/10 dark:to-amber-950/10", iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400", progressBar: "[&>div]:bg-orange-500" },
  difficulty: { bg: "from-red-50 to-rose-50 dark:from-red-950/10 dark:to-rose-950/10", iconBg: "bg-red-100 dark:bg-red-900/30", iconColor: "text-red-600 dark:text-red-400", progressBar: "[&>div]:bg-red-500" },
  season: { bg: "from-green-50 to-lime-50 dark:from-green-950/10 dark:to-lime-950/10", iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400", progressBar: "[&>div]:bg-green-500" },
};

interface LevelItem { challenge: Challenge; userChallenge?: UserChallenge; status: "active" | "completed" | "locked"; tier: BadgeTier; }

const ChallengePage = () => {
  const { user } = useAuth();
  const { fetchAllChallenges, fetchUserChallenges, joinCategoryLevel1, recalculateProgress } = useChallenges();
  const { toast } = useToast();
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [completedChallenge, setCompletedChallenge] = useState<Challenge | null>(null);
  const [prevCompletedIds, setPrevCompletedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const [all, mine] = await Promise.all([fetchAllChallenges(), fetchUserChallenges()]);
    setAllChallenges(all);
    const newCompletedIds = new Set(mine.filter((uc) => uc.completed).map((uc) => uc.challenge_id));
    if (prevCompletedIds.size > 0) { for (const id of newCompletedIds) { if (!prevCompletedIds.has(id)) { const ch = all.find((c) => c.id === id); if (ch) { setCompletedChallenge(ch); break; } } } }
    setPrevCompletedIds(newCompletedIds);
    setUserChallenges(mine);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const ucMap = useMemo(() => { const m = new Map<string, UserChallenge>(); userChallenges.forEach((uc) => m.set(uc.challenge_id, uc)); return m; }, [userChallenges]);

  const categorized = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const challenges = allChallenges.filter((ch) => ch.category === cat.id).sort((a, b) => a.level - b.level);
      const levels: LevelItem[] = challenges.map((ch, idx) => {
        const uc = ucMap.get(ch.id);
        const tier = getTierForLevel(ch.level);
        let status: "active" | "completed" | "locked" = "locked";
        if (uc) { status = uc.completed ? "completed" : "active"; }
        return { challenge: ch, userChallenge: uc, status, tier };
      });
      const activeLevel = levels.find((l) => l.status === "active");
      const completedCount = levels.filter((l) => l.status === "completed").length;
      return { ...cat, levels, activeLevel, completedCount, style: CATEGORY_STYLES[cat.id] };
    }).filter((cat) => cat.levels.length > 0);
  }, [allChallenges, ucMap]);

  const totalCompleted = userChallenges.filter((uc) => uc.completed).length;
  const totalChallenges = allChallenges.length;
  const overallPct = totalChallenges > 0 ? Math.round((totalCompleted / totalChallenges) * 100) : 0;

  const handleJoinCategory = async (categoryId: string) => {
    if (!user) return;
    setJoining(categoryId);
    await joinCategoryLevel1(categoryId, allChallenges);
    await recalculateProgress();
    await load();
    toast({ title: "챌린지 참여 완료!" });
    setJoining(null);
  };

  if (!user) return (<div className="flex flex-col items-center justify-center py-20 space-y-4"><Target className="h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">챌린지에 참여하려면 로그인이 필요합니다.</p><Link to="/auth"><Button>로그인</Button></Link></div>);

  return (
    <div className="space-y-5 pb-24">
      <ChallengeCompletionModal challenge={completedChallenge} onDismiss={() => setCompletedChallenge(null)} />
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-emerald-100/50 dark:from-primary/5 dark:to-emerald-900/20 p-6 text-center border border-border">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15"><Trophy className="h-8 w-8 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">챌린지</h1>
        <p className="text-sm text-muted-foreground mt-1">{totalCompleted} / {totalChallenges} 달성</p>
        <div className="mt-4 mx-auto max-w-xs"><div className="h-3 w-full rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${overallPct}%` }} /></div><p className="mt-1.5 text-xs text-muted-foreground">{overallPct}%</p></div>
      </div>
      {loading ? <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />)}</div> : (
        <div className="space-y-4">
          {categorized.map((cat) => {
            const Icon = cat.icon;
            const style = cat.style;
            const hasJoined = cat.levels.some((l) => l.userChallenge);
            return (
              <div key={cat.id} className={`rounded-3xl border border-border bg-gradient-to-br ${style.bg} p-5 shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style.iconBg}`}><Icon className={`h-5 w-5 ${style.iconColor}`} /></div><div><h2 className="font-bold text-sm text-foreground">{cat.title}</h2><p className="text-[11px] text-muted-foreground">{cat.description}</p></div></div>
                  {cat.completedCount > 0 && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{cat.completedCount}/{cat.levels.length}</span>}
                </div>
                <div className="space-y-2.5">{cat.levels.map((item) => <LevelCard key={item.challenge.id} item={item} categoryStyle={style} />)}</div>
                {!hasJoined && <Button className="w-full mt-4 rounded-2xl gap-2" onClick={() => handleJoinCategory(cat.id)} disabled={joining === cat.id}><Target className="h-4 w-4" />{joining === cat.id ? "참여 중..." : "챌린지 시작하기"}</Button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function LevelCard({ item, categoryStyle }: { item: LevelItem; categoryStyle: typeof CATEGORY_STYLES[string] }) {
  const { challenge: ch, userChallenge: uc, status, tier } = item;
  const tierColor = TIER_COLORS[tier];
  if (status === "locked" && !uc) return (<div className="rounded-2xl border border-dashed border-border bg-card/40 p-3.5 opacity-50"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><Lock className="h-4 w-4 text-muted-foreground" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">LV{ch.level}</span><h3 className="font-semibold text-sm text-muted-foreground truncate">{ch.title}</h3></div><p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{ch.description}</p></div></div></div>);
  if (status === "completed" && uc) return (<div className="rounded-2xl border-2 border-primary/30 bg-card p-3.5 shadow-sm"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tierColor.bg} shadow-sm`}>{ch.badge ? <span className="text-xl">{ch.badge.image_url}</span> : <Trophy className={`h-5 w-5 ${tierColor.text}`} />}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColor.bg} ${tierColor.text}`}>LV{ch.level}</span><h3 className="font-semibold text-sm text-foreground truncate">{ch.title}</h3></div>{uc.completed_at && <p className="text-[10px] text-muted-foreground">{new Date(uc.completed_at).toLocaleDateString("ko-KR")} 달성</p>}</div><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /></div></div>);
  if (uc) { const pct = Math.min(Math.round((uc.progress / ch.goal_value) * 100), 100); return (<div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm space-y-2.5"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tierColor.bg}`}><Target className={`h-5 w-5 ${tierColor.text}`} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColor.bg} ${tierColor.text}`}>LV{ch.level}</span><h3 className="font-semibold text-sm text-foreground truncate">{ch.title}</h3></div><p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ch.description}</p></div></div><div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-muted-foreground">진행률</span><span className={`font-semibold ${tierColor.text}`}>{uc.progress} / {ch.goal_value} ({pct}%)</span></div><div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${pct}%` }} /></div></div></div>); }
  return null;
}

export default ChallengePage;