import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityFeed, type ActivityFeedItem } from "@/hooks/useActivityFeed";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { JournalCard } from "@/components/JournalCard";
import { SharedCompletionCard } from "@/components/SharedCompletionCard";
import { StackedAvatars } from "@/components/StackedAvatars";
import { demoJournals, demoActivityFeed, type DemoJournal } from "@/data/demoFeed";
import { mountains } from "@/data/mountains";
import { Mountain, Compass, Users, Newspaper, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FeedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchFeed } = useHikingJournals();
  const { items: activityItems, loading: activityLoading, fetchFeed: fetchActivity } = useActivityFeed();
  const { fetchSharedCompletions } = useSharedCompletions();
  const [journals, setJournals] = useState<HikingJournal[]>([]);
  const [sharedCompletions, setSharedCompletions] = useState<SharedCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const isDemo = !user;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([fetchFeed(), fetchActivity(), fetchSharedCompletions()]).then(([journalData, _, scData]) => {
      setJournals(journalData); setSharedCompletions(scData); setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (isDemo) return <DemoFeedView />;

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground">피드</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-secondary/50 rounded-xl">
          <TabsTrigger value="all" className="flex-1 rounded-lg text-xs">전체</TabsTrigger>
          <TabsTrigger value="journals" className="flex-1 rounded-lg text-xs">등산 기록</TabsTrigger>
          <TabsTrigger value="shared" className="flex-1 rounded-lg text-xs"><Users className="h-3 w-3 mr-1" /> 공동 완등</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 rounded-lg text-xs">활동</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4 mt-4">
          {loading ? <LoadingState /> : (
            <>
              {sharedCompletions.length > 0 && <div className="space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> 최근 공동 완등</h3>{sharedCompletions.slice(0, 3).map((sc) => <SharedCompletionCard key={sc.id} completion={sc} />)}</div>}
              {activityItems.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground">활동 피드</h3>{activityItems.slice(0, 5).map((item) => <ActivityCard key={item.id} item={item} />)}</div>}
              {journals.length > 0 ? <div className="space-y-4">{journals.map((j) => <JournalCard key={j.id} journal={j} showAuthor onRefresh={() => fetchFeed().then(setJournals)} />)}</div> : sharedCompletions.length === 0 && activityItems.length === 0 ? <EmptyFeed /> : null}
            </>
          )}
        </TabsContent>
        <TabsContent value="journals" className="space-y-4 mt-4">{loading ? <LoadingState /> : journals.length === 0 ? <EmptyFeed /> : journals.map((j) => <JournalCard key={j.id} journal={j} showAuthor onRefresh={() => fetchFeed().then(setJournals)} />)}</TabsContent>
        <TabsContent value="shared" className="space-y-3 mt-4">{loading ? <LoadingState /> : sharedCompletions.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><Users className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">아직 공동 완등이 없습니다</p></div> : sharedCompletions.map((sc) => <SharedCompletionCard key={sc.id} completion={sc} />)}</TabsContent>
        <TabsContent value="activity" className="space-y-2 mt-4">{activityLoading ? <LoadingState /> : activityItems.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><Newspaper className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">아직 활동이 없습니다</p></div> : activityItems.map((item) => <ActivityCard key={item.id} item={item} />)}</TabsContent>
      </Tabs>
    </div>
  );
};

function DemoFeedView() {
  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground">피드</h1>
      <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground">활동 피드</h3>{demoActivityFeed.slice(0, 4).map((item) => (<div key={item.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-primary/10"><Mountain className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><p className="text-sm text-foreground">{item.message}</p><span className="text-[10px] text-muted-foreground mt-1 block">{new Date(item.created_at).toLocaleDateString("ko-KR")}</span></div></div></div>))}</div>
      <div className="space-y-4"><h3 className="text-sm font-semibold text-foreground">커뮤니티 기록</h3>{demoJournals.slice(0, 3).map((j) => { const mt = mountains.find((m) => m.id === j.mountain_id); return (<div key={j.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">{j.photos.length > 0 && <img src={j.photos[0]} alt="" className="w-full h-44 rounded-xl object-cover mb-3" loading="lazy" />}<div className="flex items-center gap-2 mb-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{j.profile.nickname.charAt(0)}</div><span className="text-xs font-medium text-foreground">{j.profile.nickname}</span></div><p className="font-semibold text-sm text-foreground">{mt?.nameKo || "산"}</p>{j.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{j.notes}</p>}<div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground"><span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-coral" /> {j.like_count}</span><span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {j.comment_count}</span></div></div>); })}</div>
      <Link to="/auth" className="block rounded-2xl bg-primary/10 p-5 text-center"><p className="text-sm font-bold text-primary">로그인하고 피드에 참여하세요</p></Link>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityFeedItem }) {
  const mt = item.mountain_id ? mountains.find((m) => m.id === item.mountain_id) : null;
  const profiles = item.participant_profiles || [];
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${item.type === "shared_completion" ? "bg-sky-100" : "bg-primary/10"}`}>
          {item.type === "shared_completion" ? <Users className="h-5 w-5 text-primary" /> : <Mountain className="h-5 w-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0"><p className="text-sm text-foreground">{item.message}</p><div className="flex items-center justify-between mt-2">{profiles.length > 0 && <StackedAvatars profiles={profiles as any[]} max={4} />}<span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("ko-KR")}</span></div></div>
      </div>
    </div>
  );
}

function LoadingState() { return <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>; }
function EmptyFeed() { return <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><Mountain className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">아직 공유된 일지가 없습니다</p></div>; }

export default FeedPage;