import { useLeaderboard } from "@/hooks/useSummits";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { demoLeaderboard, demoGroups } from "@/data/demoFeed";
import { mountains } from "@/data/mountains";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Flag, Users, Mountain, Loader2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const LeaderboardPage = () => {
  const { user } = useAuth();
  const { topClaimers, mountainLeaders, clubRankings, loading } = useLeaderboard();
  const { isOnboarding } = useOnboarding();
  const isDemo = !user || isOnboarding;
  const displayClaimers = isDemo ? demoLeaderboard : topClaimers;

  if (!isDemo && loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div data-onboarding="leaderboard" className="mx-auto max-w-lg space-y-6 pb-24">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm"><Trophy className="h-5 w-5 text-primary-foreground" /></div><div><h1 className="text-xl font-bold text-foreground">리더보드</h1><p className="text-xs text-muted-foreground">정상 정복 순위</p></div></div>
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="w-full rounded-xl"><TabsTrigger value="individual" className="flex-1 rounded-lg text-xs"><Flag className="h-3.5 w-3.5 mr-1" /> 개인 순위</TabsTrigger><TabsTrigger value="leaders" className="flex-1 rounded-lg text-xs"><Crown className="h-3.5 w-3.5 mr-1" /> 산 대장</TabsTrigger><TabsTrigger value="clubs" className="flex-1 rounded-lg text-xs"><Users className="h-3.5 w-3.5 mr-1" /> 산악회</TabsTrigger></TabsList>
        <TabsContent value="individual" className="mt-4 space-y-2">
          {displayClaimers.length === 0 ? <EmptyState text="아직 정상 인증 기록이 없습니다" /> : displayClaimers.map((claimer: any, idx: number) => (
            <div key={claimer.user_id || idx} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
              <RankBadge rank={idx + 1} /><Avatar className="h-9 w-9">{claimer.avatar_url && <AvatarImage src={claimer.avatar_url} />}<AvatarFallback className="text-xs bg-muted">{(claimer.nickname || "?").charAt(0)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0"><span className="text-sm font-medium text-foreground truncate block">{claimer.nickname || "알 수 없음"}</span></div>
              <Badge variant="secondary" className="text-xs gap-1"><Flag className="h-3 w-3" /> {claimer.count}회</Badge>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="leaders" className="mt-4 space-y-2">
          {!isDemo && mountainLeaders.length === 0 ? <EmptyState text="아직 산 대장이 없습니다" /> : !isDemo ? mountainLeaders.map((leader) => {
            const mt = mountains.find((m) => m.id === leader.mountain_id);
            return (<Link key={leader.mountain_id} to={`/mountains/${leader.mountain_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"><Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-foreground">{mt?.nameKo || `산`} 대장</p><span className="text-xs text-muted-foreground">{leader.nickname || "알 수 없음"}</span></div><Badge variant="secondary" className="text-[10px] gap-0.5">{leader.count}회</Badge></Link>);
          }) : <EmptyState text="로그인 후 확인하세요" />}
        </TabsContent>
        <TabsContent value="clubs" className="mt-4 space-y-2">
          {isDemo ? demoGroups.map((club, idx) => (<div key={club.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"><RankBadge rank={idx + 1} /><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div><div className="flex-1 min-w-0"><span className="text-sm font-medium text-foreground truncate block">{club.name}</span></div><Badge variant="secondary" className="text-xs gap-1"><Mountain className="h-3 w-3" /> {club.member_count}명</Badge></div>)) : clubRankings.length === 0 ? <EmptyState text="아직 산악회 기록이 없습니다" /> : clubRankings.map((club, idx) => (<Link key={club.group_id} to={`/groups/${club.group_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors"><RankBadge rank={idx + 1} /><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div><div className="flex-1 min-w-0"><span className="text-sm font-medium text-foreground truncate block">{club.group_name}</span></div><Badge variant="secondary" className="text-xs gap-1"><Mountain className="h-3 w-3" /> {club.count}회</Badge></Link>))}
        </TabsContent>
      </Tabs>
      {isDemo && <Link to="/auth" className="block rounded-2xl bg-primary/10 p-5 text-center"><p className="text-sm font-bold text-primary">로그인하고 순위에 참여하세요</p></Link>}
    </div>
  );
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg font-bold text-amber-500">🥇</span>;
  if (rank === 2) return <span className="text-lg font-bold text-gray-400">🥈</span>;
  if (rank === 3) return <span className="text-lg font-bold text-amber-700">🥉</span>;
  return <span className="w-6 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><Mountain className="mx-auto h-8 w-8 text-muted-foreground/30" /><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}

export default LeaderboardPage;