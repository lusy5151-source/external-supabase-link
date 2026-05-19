import { useStore } from "@/context/StoreContext";
import PasswordSetupBanner from "@/components/PasswordSetupBanner";
import { GuestSignupBanner } from "@/components/GuestSignupBanner";
import { useMountains } from "@/contexts/MountainsContext";
import { demoJournals, demoSummitClaims, demoKingOfDay, demoActivityFeed, demoProgress, type DemoJournal } from "@/data/demoFeed";
import { badges } from "@/data/badges";
import { useWeather } from "@/hooks/useWeather";
import { useAuth } from "@/contexts/AuthContext";
import { useGearStore } from "@/hooks/useGearStore";
import { useAchievementStore } from "@/hooks/useAchievementStore";
import { useSharedCompletionCounts } from "@/hooks/useSharedCompletionCounts";
import { useHikingPlans } from "@/hooks/useHikingPlans";
import { useHikingJournals, HikingJournal } from "@/hooks/useHikingJournals";
import { useChallenges, Challenge, UserChallenge } from "@/hooks/useChallenges";
import { useChallengeMountains, useUserMountainChallenges, type ChallengeListType } from "@/hooks/useMountainChallenges";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { useLiveSummitFeed } from "@/hooks/useLiveSummitFeed";
import { SharedCompletionCard } from "@/components/SharedCompletionCard";
import { JournalForm } from "@/components/JournalForm";
import AchievementModal from "@/components/AchievementModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StackedAvatars } from "@/components/StackedAvatars";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import MountainMascot from "@/components/MountainMascot";
import CharacterAnimation, { CHARACTER_META, type Character } from "@/components/CharacterAnimation";
import {
  Mountain, Plus, Calendar, ChevronRight,
  Sun, Cloud, CloudRain, CloudSnow, CloudSun,
  Target, BookOpen, Heart, Search,
  MessageCircle, Newspaper, Clock, Settings2,
  Users, Flag, Crown, Flame,
} from "lucide-react";
import { AnnouncementSection } from "@/components/AnnouncementSystem";
// OnboardingTutorial moved to Layout
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOnboarding } from "@/contexts/OnboardingContext";

const conditionIcons: Record<string, any> = {
  "맑음": Sun, "구름": CloudSun, "흐림": Cloud, "비": CloudRain, "눈": CloudSnow,
};

const GOAL_KEY = "wandeng-user-goal";
const HUNDRED_TYPE_KEY = "wandeng-hundred-type"; // "forestry_100" | "bac_100"

function CharacterSlide({ msg, characterId, level }: { msg: string; characterId: Character; level: number }) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(40);

  useEffect(() => {
    if (!bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => setBubbleH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [msg]);

  const positions = ["top-right", "top-left", "top"] as const;
  const pos = positions[Math.abs(msg.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % positions.length];

  const CHAR_SIZE = 135;
  // bubble bottom sits at (CHAR_SIZE - 8) above card bottom; add bubble height + 16px top breathing room
  const neededHeight = (CHAR_SIZE - 8) + bubbleH + 20;
  const paddingTop = Math.max(56, bubbleH + 24);

  const bubbleBase: React.CSSProperties = {
    position: "absolute",
    background: "#fff",
    border: "1.5px solid #C7D66D",
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    color: "#2F403A",
    lineHeight: 1.3,
    maxWidth: 200,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
    animation: "bubblePop 0.3s ease-out both",
    zIndex: 2,
  };
  const posStyle: React.CSSProperties =
    pos === "top-right"
      ? { bottom: "calc(100% - 8px)", left: "55%", borderRadius: "12px 12px 12px 4px", transformOrigin: "bottom left" }
      : pos === "top-left"
      ? { bottom: "calc(100% - 8px)", right: "55%", borderRadius: "12px 12px 4px 12px", transformOrigin: "bottom right" }
      : { bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", borderRadius: "12px", transformOrigin: "bottom center" };

  return (
    <div
      className="p-4 shadow-sm"
      style={{
        background: "linear-gradient(145deg, #EAF3DE, #F8FAED)",
        borderRadius: 16,
        position: "relative",
        minHeight: Math.max(240, neededHeight),
        overflow: "hidden",
        paddingTop,
      }}
    >
      <style>{`@keyframes bubblePop{0%{opacity:0;transform:scale(0.9)}100%{opacity:1;transform:scale(1)}}`}</style>
      <span
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "#fff",
          border: "1px solid #C7D66D",
          color: "#3B6D11",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 999,
          zIndex: 2,
        }}
      >
        Lv.{level}
      </span>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <div ref={bubbleRef} style={{ ...bubbleBase, ...posStyle }}>{msg}</div>
          <CharacterAnimation character={characterId} emotion="normal" size={CHAR_SIZE} />
        </div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { mountains } = useMountains();
  const { records, completedCount, isCompleted } = useStore();
  const { items: gearItems } = useGearStore();
  const sharedCompletions = useSharedCompletionCounts();
  const { earnedBadges, isEarned, newlyEarned, dismissNewBadge, earnedCount, totalBadges } =
    useAchievementStore(records, gearItems, sharedCompletions);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans, myUpcomingPlans } = useHikingPlans();
  const { fetchFeed } = useHikingJournals();
  const { fetchAllChallenges, fetchUserChallenges } = useChallenges();
  const { fetchSharedCompletions } = useSharedCompletions();
  const { claims: liveClaims, kingOfDay, loading: liveFeedLoading } = useLiveSummitFeed();
  const [recentJournals, setRecentJournals] = useState<HikingJournal[]>([]);
  const [lastHikeDate, setLastHikeDate] = useState<string | null>(null);
  const [recentSharedCompletions, setRecentSharedCompletions] = useState<SharedCompletion[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<(UserChallenge & { ch: Challenge })[]>([]);
  const [userGoal, setUserGoal] = useState<number>(() => {
    const saved = localStorage.getItem(GOAL_KEY);
    return saved ? parseInt(saved) : 100;
  });
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [hundredType, setHundredType] = useState<ChallengeListType | null>(() => {
    const saved = localStorage.getItem(HUNDRED_TYPE_KEY);
    return saved === "forestry_100" || saved === "bac_100" ? saved : null;
  });
  const [showHundredPicker, setShowHundredPicker] = useState(false);
  const [characterId, setCharacterId] = useState<Character | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const { isOnboarding } = useOnboarding();
  const isDemo = !user || isOnboarding;

  // Hundred-mountain progress (forestry_100 / bac_100)
  const activeHundredType: ChallengeListType = hundredType ?? "forestry_100";
  const { data: hundredList = [] } = useChallengeMountains(activeHundredType);
  const { data: userHundredRows = [] } = useUserMountainChallenges(activeHundredType);
  const hundredTotal = hundredList.length || 100;
  const hundredCompleted = useMemo(
    () => userHundredRows.filter((r) => r.is_completed).length,
    [userHundredRows]
  );
  const hundredPercent = Math.min(Math.round((hundredCompleted / hundredTotal) * 100), 100);
  const hundredLabel = activeHundredType === "forestry_100" ? "산림청 100대 명산" : "100대 명산";

  const baekduMountains = useMemo(() => mountains.filter((m) => m.is_baekdu), [mountains]);
  const baekduCount = baekduMountains.length;
  const baekduCompleted = isDemo ? demoProgress.baekduCompleted : baekduMountains.filter((m) => isCompleted(m.id)).length;
  const displayCompletedCount = isDemo ? demoProgress.completedCount : completedCount;
  const displayGoal = isDemo ? demoProgress.goalCount : userGoal;
  const goalPercent = Math.min(Math.round((displayCompletedCount / displayGoal) * 100), 100);
  const displayChallengeProgress = isDemo ? demoProgress.challengeProgress : 0;
  const displayEarnedCount = isDemo ? demoProgress.earnedBadges : earnedCount;
  const displayTotalBadges = isDemo ? demoProgress.totalBadges : totalBadges;

  const handleHundredTypeSelect = (t: ChallengeListType) => {
    setHundredType(t);
    localStorage.setItem(HUNDRED_TYPE_KEY, t);
    setShowHundredPicker(false);
  };

  const upcomingPlan = useMemo(() => {
    if (isDemo) return null;
    return myUpcomingPlans[0] || null;
  }, [myUpcomingPlans, isDemo]);

  const upcomingMountain = upcomingPlan ? mountains.find((m) => m.id === upcomingPlan.mountain_id) : null;
  const defaultMountain = mountains[0] || { id: 1, lat: 37.6584, lng: 126.978 };
  const { weather } = useWeather(
    upcomingMountain?.id || defaultMountain.id,
    upcomingMountain?.lat || defaultMountain.lat,
    upcomingMountain?.lng || defaultMountain.lng
  );

  const dDay = useMemo(() => {
    if (!upcomingPlan) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planDate = new Date(upcomingPlan.planned_date);
    planDate.setHours(0, 0, 0, 0);
    const diff = Math.round((planDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "D-Day";
    return `D-${diff}`;
  }, [upcomingPlan]);

  const challengeProgress = useMemo(() => {
    if (isDemo) return displayChallengeProgress;
    if (activeChallenges.length === 0) return 0;
    const totalPct = activeChallenges.reduce((sum, ac) => {
      return sum + Math.min((ac.progress / ac.ch.goal_value) * 100, 100);
    }, 0);
    return Math.round(totalPct / activeChallenges.length);
  }, [activeChallenges, isDemo, displayChallengeProgress]);

  const fetchPublicFeed = useCallback(async () => {
    const { data: journals } = await supabase
      .from("hiking_journals")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(3);
    if (!journals || journals.length === 0) return [];
    const userIds = [...new Set((journals as any[]).map((j) => j.user_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const journalIds = (journals as any[]).map((j) => j.id);
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from("journal_likes").select("journal_id, user_id").in("journal_id", journalIds),
      supabase.from("journal_comments").select("journal_id").in("journal_id", journalIds),
    ]);
    const likeCounts = new Map<string, number>();
    (likes || []).forEach((l: any) => likeCounts.set(l.journal_id, (likeCounts.get(l.journal_id) || 0) + 1));
    const commentCounts = new Map<string, number>();
    (comments || []).forEach((c: any) => commentCounts.set(c.journal_id, (commentCounts.get(c.journal_id) || 0) + 1));
    return (journals as any[]).map((j) => ({
      ...j,
      profile: profileMap.get(j.user_id) || null,
      like_count: likeCounts.get(j.id) || 0,
      comment_count: commentCounts.get(j.id) || 0,
    })) as HikingJournal[];
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPublicFeed()
        .then((journals) => setRecentJournals(journals))
        .catch(() => setRecentJournals([]));
      fetchSharedCompletions()
        .then((scs) => setRecentSharedCompletions(scs.slice(0, 3)))
        .catch(() => setRecentSharedCompletions([]));
      Promise.all([fetchAllChallenges(), fetchUserChallenges()])
        .then(([all, mine]) => {
          const active = mine
            .filter((uc) => !uc.completed)
            .slice(0, 3)
            .map((uc) => ({ ...uc, ch: all.find((c) => c.id === uc.challenge_id)! }))
            .filter((uc) => uc.ch);
          setActiveChallenges(active);
        })
        .catch(() => setActiveChallenges([]));
      // Fetch last hike date
      supabase
        .from("hiking_journals")
        .select("hiked_at")
        .eq("user_id", user.id)
        .order("hiked_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          setLastHikeDate(data?.[0]?.hiked_at || null);
        });
      (supabase as any)
        .from("profiles")
        .select("character_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }: any) => {
          if (data?.character_id) setCharacterId(data.character_id as Character);
        });
    }
  }, [user]);

  const handleGoalSave = (val: number) => {
    const clamped = Math.max(1, Math.min(val, 200));
    setUserGoal(clamped);
    localStorage.setItem(GOAL_KEY, String(clamped));
    setShowGoalEdit(false);
  };

  // Personalized CTA card logic (priority: D > B > C > A)
  const ctaCard = useMemo(() => {
    if (isDemo) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // D: upcoming plan within 3 days
    if (upcomingPlan && upcomingMountain) {
      const planDate = new Date(upcomingPlan.planned_date);
      planDate.setHours(0, 0, 0, 0);
      const diff = Math.round((planDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 3) {
        return {
          msg: diff === 0 ? `D-Day! ${upcomingMountain.nameKo} 등산이에요!` : `D-${diff}일 후 ${upcomingMountain.nameKo} 등산이에요!`,
          btn: "계획 확인하기", to: `/plans/${upcomingPlan.id}`, bg: "#FAEEDA",
        };
      }
    }
    // B: last hike within 7 days
    if (lastHikeDate) {
      const hikeDate = new Date(lastHikeDate);
      hikeDate.setHours(0, 0, 0, 0);
      const daysSince = Math.round((now.getTime() - hikeDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) {
        return { msg: "지난 등산 기록을 남겨두셨나요?", btn: "기록 추가하기", to: "/records", bg: "hsl(var(--brand-lime))" };
      }
      // C: 7+ days ago
      return { msg: "슬슬 산이 그리워질 때가 됐어요 ⛰", btn: "등산 계획 만들기", to: "/plans/create", bg: "#EEEDFE" };
    }
    // A: no record at all
    if (completedCount === 0) {
      return { msg: "첫 번째 산을 정복해볼까요?", btn: "산 탐색하기", to: "/mountains", bg: "hsl(var(--brand-lime))" };
    }
    return null;
  }, [isDemo, upcomingPlan, upcomingMountain, lastHikeDate, completedCount]);

  const CondIcon = conditionIcons[weather.condition] || Cloud;
  const todayIndex = mountains.length > 0 ? new Date().getDate() % mountains.length : 0;
  const todayMountain = mountains.length > 0 ? mountains[todayIndex] : null;

  // Demo or real summit claims
  const displayClaims = isDemo ? demoSummitClaims : liveClaims;
  const displayKing = isDemo ? demoKingOfDay : kingOfDay;

  return (
    <ErrorBoundary fallbackMessage="대시보드를 불러오는 중 문제가 발생했습니다">
      <div className="-mx-4 -mt-6 pb-24">
        <div className="px-4 pt-4 space-y-3">
          <GuestSignupBanner />
          <PasswordSetupBanner />
        </div>
        {!isDemo && <AchievementModal badge={newlyEarned} onDismiss={dismissNewBadge} />}
        {showJournalForm && (
          <JournalForm
            onClose={() => setShowJournalForm(false)}
            onSaved={() => { setShowJournalForm(false); }}
          />
        )}
        {/* OnboardingTutorial is now in Layout */}

        {/* ── Hero: Mountain illustration + Upcoming Hike ── */}
        <section className="relative overflow-hidden px-5 pb-8 pt-6" style={{ background: "hsl(205, 50%, 88%)" }}>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 400 140" className="w-full" preserveAspectRatio="none">
              <path d="M0 140 L0 90 Q60 25 120 65 Q180 105 240 45 Q300 5 360 55 Q380 80 400 50 L400 140 Z" fill="hsl(var(--nature-200))" opacity="0.4" />
              <path d="M0 140 L0 105 Q80 50 160 80 Q240 110 320 70 Q360 45 400 75 L400 140 Z" fill="hsl(var(--nature-100))" opacity="0.6" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">완등</h1>
                <p className="text-xs text-muted-foreground mt-0.5">오늘도 한 걸음 더 🏔️</p>
              </div>
              {isDemo && (
                <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all">
                  로그인
                </Link>
              )}
            </div>

            {/* Upcoming schedule slider */}
            <div
              data-onboarding="upcoming-schedule"
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(dx) > 40) {
                  setSlideIdx((p) => (dx < 0 ? Math.min(1, p + 1) : Math.max(0, p - 1)));
                }
                touchStartX.current = null;
              }}
              style={{ overflow: "hidden", borderRadius: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  transform: `translateX(-${slideIdx * 100}%)`,
                  transition: "transform 0.3s ease",
                }}
              >
                {/* Slide 1: Character */}
                <div style={{ flex: "0 0 100%", width: "100%" }}>
                  <CharacterSlide
                    msg={ctaCard?.msg || "오늘도 멋진 산행 되세요! 🏔"}
                    characterId={(characterId || "oreumi") as Character}
                    level={(() => {
                      const c = displayCompletedCount;
                      if (c >= 100) return 5;
                      if (c >= 50) return 4;
                      if (c >= 20) return 3;
                      if (c >= 5) return 2;
                      return 1;
                    })()}
                  />
                </div>

                {/* Slide 2: Existing upcoming plan card */}
                <div style={{ flex: "0 0 100%", width: "100%" }}>
                  <div className="rounded-2xl bg-card/90 p-5 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground">다가오는 일정</p>
                      <Link
                        to={isDemo ? "/auth" : "/plans/create"}
                        style={{
                          background: "hsl(var(--lavender))",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 500,
                          borderRadius: "20px",
                          padding: "5px 12px",
                          border: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          lineHeight: 1,
                        }}
                      >
                        + 계획
                      </Link>
                    </div>
                    {isDemo ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="inline-block rounded-full bg-coral px-3 py-1 text-sm font-bold text-white">D-3</span>
                          <h3 className="mt-2 text-lg font-bold text-foreground">북한산</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(Date.now() + 3 * 86400000).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} · 08:00
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl bg-accent/60 px-3 py-2">
                          <Sun className="h-5 w-5 text-sky-600" />
                          <span className="text-base font-semibold text-foreground">12°</span>
                        </div>
                      </div>
                    ) : upcomingPlan && upcomingMountain ? (
                      <Link to={`/plans/${upcomingPlan.id}`} className="block">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="inline-block rounded-full bg-coral px-3 py-1 text-sm font-bold text-white">{dDay}</span>
                            <h3 className="mt-2 text-lg font-bold text-foreground">{upcomingMountain.nameKo}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(upcomingPlan.planned_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                              {upcomingPlan.start_time && ` · ${upcomingPlan.start_time.slice(0, 5)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-xl bg-accent/60 px-3 py-2">
                            <CondIcon className="h-5 w-5 text-sky-600" />
                            <span className="text-base font-semibold text-foreground">{weather.temp}°</span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="text-center py-3">
                        <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">예정된 일정이 없습니다</p>
                        <Link
                          to={isDemo ? "/auth" : "/plans/create"}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" /> 계획 만들기
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Dots */}
              <div className="flex justify-center gap-1.5 mt-2">
                {[0, 1].map((i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIdx(i)}
                    aria-label={`slide-${i}`}
                    style={{
                      width: slideIdx === i ? 18 : 6,
                      height: 6,
                      borderRadius: 999,
                      background: slideIdx === i ? "#3B6D11" : "rgba(0,0,0,0.2)",
                      transition: "all 0.2s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4 px-5 pt-5">

          {/* ── 1. 완등 실시간 소식 🏔 ── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-coral" />
              <h2 className="text-base font-bold text-foreground">완등 실시간 소식 🏔</h2>
            </div>
            <div className="rounded-2xl bg-card border border-border p-3 shadow-sm space-y-2">
              {!isDemo && liveFeedLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">불러오는 중...</div>
              ) : displayClaims.length === 0 ? (
                <div className="py-4 text-center">
                  <Mountain className="mx-auto h-7 w-7 text-muted-foreground/30 mb-1.5" />
                  <p className="text-sm text-muted-foreground">아직 정복 기록이 없습니다</p>
                </div>
              ) : (
                displayClaims.slice(0, 3).map((claim: any) => {
                  const mt = mountains.find((m) => m.id === claim.mountain_id);
                  const timeAgo = getTimeAgo(claim.claimed_at);
                  return (
                    <div key={claim.id} className="flex items-center gap-2.5 px-1 py-1">
                      <Avatar className="h-7 w-7 shrink-0">
                        {claim.avatar_url && <AvatarImage src={claim.avatar_url} />}
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {(claim.nickname || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm">
                        <span className="font-medium text-foreground truncate">{claim.nickname || "등산러"}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-foreground truncate">{mt?.nameKo}</span>
                        {claim.summit_name && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground truncate">{claim.summit_name}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                    </div>
                  );
                })
              )}
              {displayClaims.length > 3 && (
                <Link to="/leaderboard" className="block text-center text-xs font-medium text-coral hover:underline pt-1">
                  더 보기 →
                </Link>
              )}
            </div>
          </section>

          {/* ── Mountain King of the Day ── */}
          {displayKing && (
            <section>
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 dark:border-amber-800/30 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-foreground">오늘의 산왕</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-amber-300">
                    {displayKing.avatar_url && <AvatarImage src={displayKing.avatar_url} />}
                    <AvatarFallback className="text-sm bg-amber-100 text-amber-700">
                      {(displayKing.nickname || "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-foreground">{displayKing.nickname || "등산러"}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      오늘 {displayKing.claim_count}개 정상 정복 👑
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── 2. Circular Progress Cards: 100대 명산 + 정상 챌린지 ── */}
          <section className="grid grid-cols-2 gap-3">
            {/* LEFT: 100대 명산 */}
            <div className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p style={{ fontSize: 12 }} className="text-muted-foreground">
                  {!isDemo && hundredType ? hundredLabel : "100대 명산 진행률"}
                </p>
                {!isDemo && (
                  <button
                    onClick={() => setShowHundredPicker((v) => !v)}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="기준 변경"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {!isDemo && showHundredPicker && (
                <div className="mb-3 flex items-center gap-1.5">
                  <button
                    onClick={() => handleHundredTypeSelect("forestry_100")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${activeHundredType === "forestry_100" ? "bg-coral text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                  >
                    산림청
                  </button>
                  <button
                    onClick={() => handleHundredTypeSelect("bac_100")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${activeHundredType === "bac_100" ? "bg-coral text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                  >
                    100대 명산
                  </button>
                </div>
              )}

              {!isDemo && !hundredType ? (
                <div className="flex flex-col items-center text-center py-2">
                  <Mountain className="h-7 w-7 text-muted-foreground/30 mb-2" />
                  <p className="text-[11px] text-muted-foreground mb-2 leading-snug">어떤 100대 명산을<br />추적할까요?</p>
                  <div className="flex flex-col gap-1.5 w-full">
                    <button onClick={() => handleHundredTypeSelect("forestry_100")} className="rounded-full bg-coral px-3 py-1.5 text-[10px] font-semibold text-white">산림청 100대</button>
                    <button onClick={() => handleHundredTypeSelect("bac_100")} className="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-semibold text-secondary-foreground">100대 명산</button>
                  </div>
                </div>
              ) : (
                <Link to={isDemo ? "/mountains" : "/challenges"} className="flex flex-col items-center">
                  <div className="relative" style={{ width: 80, height: 80 }}>
                    <svg className="-rotate-90" viewBox="0 0 80 80" width="80" height="80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#FFE0E0" strokeWidth="8" />
                      <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--brand-coral))" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 32}`}
                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - (isDemo ? goalPercent : hundredPercent) / 100)}`}
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{ fontSize: 18, fontWeight: 500 }} className="text-foreground">
                        {isDemo ? goalPercent : hundredPercent}%
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11 }} className="text-muted-foreground mt-2 text-center">
                    {isDemo ? `${displayCompletedCount} / ${displayGoal}` : `${hundredCompleted} / ${hundredTotal}`}
                  </p>
                  <p style={{ fontSize: 11 }} className="text-muted-foreground text-center">
                    {isDemo ? `백대명산 ${baekduCompleted}/${baekduCount}` : hundredLabel}
                  </p>
                </Link>
              )}
            </div>

            {/* RIGHT: 정상 챌린지 */}
            <div className="rounded-2xl bg-card p-4">
              <p style={{ fontSize: 12 }} className="text-muted-foreground mb-3">정상 챌린지</p>
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 80, height: 80 }}>
                  <svg className="-rotate-90" viewBox="0 0 80 80" width="80" height="80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#FFE0E0" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="32" fill="none"
                      stroke="hsl(var(--brand-coral))" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - challengeProgress / 100)}`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span style={{ fontSize: 18, fontWeight: 500 }} className="text-foreground">
                      {challengeProgress}%
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 11 }} className="text-muted-foreground mt-2 text-center">
                  {isDemo ? "3개 진행 중" : activeChallenges.length > 0 ? `${activeChallenges.length}개 진행 중` : "참여 없음"}
                </p>
                <Link to={isDemo ? "/auth" : "/challenges"} style={{ fontSize: 11, color: "hsl(var(--brand-coral))" }} className="font-medium hover:underline">
                  전체 보기
                </Link>
              </div>
            </div>
          </section>

          {/* ── Achievement Progress Widget ── */}
          {records.length > 0 && (() => {
            const nextBadge = badges.find((b) => !isEarned(b.id));
            if (!nextBadge) return null;
            const cond = nextBadge.condition;
            let current = 0;
            let target = cond.value || 5;
            if (cond.type === "completedCount") {
              current = Math.min(records.length, target);
            } else if (cond.type === "firstAction") {
              current = 0; target = 1;
            } else {
              current = 0; target = 1;
            }
            const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
            return (
              <button
                onClick={() => navigate("/records?tab=나의 도전")}
                className="w-full flex items-center bg-card text-left"
                style={{
                  gap: 12,
                  border: "0.5px solid hsl(var(--color-border-tertiary, var(--border)))",
                  borderRadius: "var(--border-radius-lg, 16px)",
                  padding: "12px 14px",
                }}
              >
                <div
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, background: "hsl(var(--brand-lime))" }}
                >
                  <Flag className="h-[18px] w-[18px]" style={{ color: "hsl(var(--brand-forest))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground" style={{ fontSize: 11 }}>다음 업적까지</p>
                  <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                    {nextBadge.name} {current}/{target}
                  </p>
                  <div className="w-full mt-1 overflow-hidden" style={{ height: 4, borderRadius: 2, background: "hsl(var(--color-border-tertiary, var(--border)))" }}>
                    <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, borderRadius: 2, background: "hsl(var(--brand-forest))" }} />
                  </div>
                  <p style={{ fontSize: 10, color: "#3B6D11", marginTop: 2 }}>{current}/{target}</p>
                </div>
                <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground" />
              </button>
            );
          })()}

          {/* ── 3. 완등 MAGAZINE Banner ── */}
          <section>
            <Link to="/magazine">
              <div className="relative rounded-2xl p-4 shadow-md overflow-hidden hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: "hsl(var(--magazine))" }}>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20">
                  <Newspaper className="h-14 w-14 text-white/20" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-base font-bold text-white">완등 MAGAZINE</h2>
                  <p className="text-[11px] mt-0.5 text-white/80">등산 정보 · 코스 · 장비 · 안전 팁</p>
                </div>
              </div>
            </Link>
          </section>

          {/* ── CTA Buttons ── */}
          <section className="grid grid-cols-2 gap-3">
            <Link to={isDemo ? "/auth" : "/summit-claim"} data-onboarding="summit-claim">
              <Button className="w-full h-14 rounded-2xl text-sm font-bold gap-2 shadow-lg bg-primary hover:bg-primary/90 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] text-[#f8faeb]">
                <Flag className="h-5 w-5" />
                정상 인증하기
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                if (isDemo) { navigate("/auth"); return; }
                setShowJournalForm(true);
              }}
              className="w-full h-14 rounded-2xl text-sm font-bold gap-2 shadow-lg border-2 border-coral text-coral hover:bg-coral/10 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" />
              등산 기록 추가
            </Button>
          </section>

          {/* ── Search Bar ── */}
          <section>
            <Link to="/mountains" className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground/60">산 이름, 지역으로 검색...</span>
            </Link>
          </section>

          {/* ── 4. 오늘의 산 ── */}
          {todayMountain && (
          <section>
            <SectionHeader title="오늘의 산" />
            <Link to={`/mountains/${todayMountain.id}`} className="block rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nature-50 shrink-0">
                  <Mountain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground">{todayMountain.nameKo}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{todayMountain.region} · {todayMountain.height}m</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </section>
          )}


          {/* ── Community Feed ── */}
          <section>
            <SectionHeader title="커뮤니티" linkTo={isDemo ? "/auth" : "/feed"} linkLabel="전체 보기" />
            {isDemo || recentJournals.length === 0 ? (
              <CommunityFeedPreview journals={demoJournals.slice(0, 3)} />
            ) : (
              <div className="space-y-3">
                {recentJournals.map((j) => {
                  const mt = mountains.find((m) => m.id === j.mountain_id);
                  return (
                    <Link
                      key={j.id}
                      to={`/journals/${j.id}`}
                      className="block rounded-2xl bg-card border border-border p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
                    >
                      <div className="flex gap-3">
                        {j.photos && j.photos.length > 0 ? (
                          <img src={j.photos[0]} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" loading="lazy" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-nature-50 shrink-0">
                            <Mountain className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-foreground truncate">{mt?.nameKo || "산"}</p>
                            {j.profile?.nickname && (
                              <span className="text-[10px] text-muted-foreground">by {j.profile.nickname}</span>
                            )}
                          </div>
                          {j.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{j.notes}</p>}
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-coral" /> {j.like_count || 0}</span>
                            <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {j.comment_count || 0}</span>
                            <span>{new Date(j.hiked_at).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Badge Gallery ── */}
          <section data-onboarding="badge-gallery">
            <SectionHeader title="업적 갤러리" linkTo="/achievements" linkLabel="전체 보기" />
            <div className="rounded-3xl bg-purple-light border border-border p-5 shadow-sm">
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {badges.map((b, idx) => {
                  const earned = isDemo ? idx < demoProgress.earnedBadges : isEarned(b.id);
                  return (
                    <div key={b.id} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                      <div className={`flex h-13 w-13 items-center justify-center rounded-full border-2 transition-all ${
                        earned
                          ? "border-lavender bg-card shadow-sm"
                          : "border-border bg-muted grayscale opacity-40"
                      }`}>
                        <span className="text-xl">{b.icon}</span>
                      </div>
                      <p className={`text-[9px] font-medium text-center leading-tight ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                        {b.name}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{displayEarnedCount} / {displayTotalBadges} 달성</p>
            </div>
          </section>

          {/* ── Announcements / News ── */}
          <section>
            <SectionHeader title="공지 · 산악정보" />
            <div className="rounded-3xl bg-card border border-border p-4 shadow-sm">
              <AnnouncementSection />
            </div>
          </section>

          {/* ── Demo CTA Banner ── */}
          {isDemo && (
            <section>
              <Link to="/auth" className="block rounded-3xl p-6 shadow-lg text-center" style={{ background: "hsl(var(--brand-forest))" }}>
                <MountainMascot size={60} mood="waving" className="mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">완등과 함께 산을 정복하세요!</h3>
                <p className="text-xs text-white/80 mt-1">가입하고 나만의 등산 기록을 시작하세요</p>
                <span className="mt-3 inline-block rounded-full bg-white/20 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm">
                  무료로 시작하기 →
                </span>
              </Link>
            </section>
          )}

          {/* ── Privacy Policy ── */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link to="/privacy" className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              개인정보처리방침
            </Link>
            <span className="text-[11px] text-muted-foreground/30">|</span>
            <Link to="/delete-account" className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              계정 삭제
            </Link>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

/* ─── Helpers ─── */
function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {linkLabel && linkTo && <Link to={linkTo} className="text-xs font-medium text-primary hover:underline">{linkLabel}</Link>}
    </div>
  );
}

function EmptyState({ icon: Icon, message, linkTo, linkLabel }: { icon: any; message: string; linkTo: string; linkLabel: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/30" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Link to={linkTo} className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">{linkLabel}</Link>
    </div>
  );
}

function CommunityFeedPreview({ journals }: { journals: DemoJournal[] }) {
  const { mountains } = useMountains();
  return (
    <div className="space-y-3">
      {journals.map((j) => {
        const mt = mountains.find((m) => m.id === j.mountain_id);
        return (
          <div key={j.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
            <div className="flex gap-3">
              {j.photos && j.photos.length > 0 ? (
                <img src={j.photos[0]} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" loading="lazy" width={64} height={64} />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-nature-50 shrink-0">
                  <Mountain className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">{mt?.nameKo || "산"}</p>
                  <span className="text-[10px] text-muted-foreground">by {j.profile.nickname}</span>
                </div>
                {j.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{j.notes}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-coral" /> {j.like_count}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {j.comment_count}</span>
                  <span>{new Date(j.hiked_at).toLocaleDateString("ko-KR")}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default Dashboard;
