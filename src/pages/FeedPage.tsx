import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { useActivityFeed, type ActivityFeedItem } from "@/hooks/useActivityFeed";
import { JournalCard } from "@/components/JournalCard";
import { SharedCompletionCard } from "@/components/SharedCompletionCard";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { useCommunityPosts, type CommunityCategory } from "@/hooks/useCommunityPosts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mountain, PenSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { demoJournals } from "@/data/demoFeed";
import { useMountains } from "@/contexts/MountainsContext";

type TabKey = "all" | "story" | "mountain_info" | "gear";

const TAB_LABEL: Record<TabKey, string> = {
  all: "전체",
  story: "산행 이야기",
  mountain_info: "산 정보",
  gear: "장비추천",
};

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "all";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Community posts for all categories
  const { posts: allPosts, loading: postsLoading, refresh: refreshPosts } = useCommunityPosts("all");
  const storyPosts = useMemo(() => allPosts.filter((p) => p.category === "story"), [allPosts]);
  const mountainPosts = useMemo(() => allPosts.filter((p) => p.category === "mountain_info"), [allPosts]);
  const gearPosts = useMemo(() => allPosts.filter((p) => p.category === "gear"), [allPosts]);

  // Other content
  const { fetchFeed } = useHikingJournals();
  const { fetchSharedCompletions } = useSharedCompletions();
  const [journals, setJournals] = useState<HikingJournal[]>([]);
  const [sharedCompletions, setSharedCompletions] = useState<SharedCompletion[]>([]);
  const [otherLoading, setOtherLoading] = useState(true);

  useEffect(() => {
    if (!user) { setOtherLoading(false); return; }
    Promise.all([fetchFeed(), fetchSharedCompletions()])
      .then(([j, s]) => { setJournals(j); setSharedCompletions(s); })
      .finally(() => setOtherLoading(false));
    // eslint-disable-next-line
  }, [user?.id]);

  const handleTabChange = (v: string) => {
    setActiveTab(v as TabKey);
    setSearchParams(v === "all" ? {} : { tab: v });
  };

  const refresh = () => { refreshPosts(); fetchFeed().then(setJournals); };

  if (!user) return <DemoFeedView />;

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">커뮤니티</h1>
        <Button size="sm" onClick={() => navigate(`/community/new${activeTab !== "all" ? `?category=${activeTab}` : ""}`)}>
          <PenSquare className="h-4 w-4 mr-1" /> 글쓰기
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full bg-secondary/50 rounded-xl">
          {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
            <TabsTrigger key={k} value={k} className="flex-1 rounded-lg text-xs">{TAB_LABEL[k]}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {(postsLoading || otherLoading) ? <Loading /> : (
            <AllFeed
              posts={allPosts}
              journals={journals}
              shared={sharedCompletions}
              refresh={refresh}
            />
          )}
        </TabsContent>

        <TabsContent value="story" className="space-y-4 mt-4">
          {(postsLoading || otherLoading) ? <Loading /> : (
            <StoryFeed posts={storyPosts} journals={journals} shared={sharedCompletions} refresh={refresh} />
          )}
        </TabsContent>

        <TabsContent value="mountain_info" className="space-y-3 mt-4">
          {postsLoading ? <Loading /> : <CategoryFeed posts={mountainPosts} category="mountain_info" />}
        </TabsContent>

        <TabsContent value="gear" className="space-y-3 mt-4">
          {postsLoading ? <Loading /> : <CategoryFeed posts={gearPosts} category="gear" />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function AllFeed({ posts, journals, shared, refresh }: { posts: any[]; journals: HikingJournal[]; shared: SharedCompletion[]; refresh: () => void }) {
  // Merge by created_at
  type Item = { time: number; render: JSX.Element; key: string };
  const items: Item[] = [];
  posts.forEach((p) => items.push({ time: new Date(p.created_at).getTime(), key: `p-${p.id}`, render: <CommunityPostCard post={p} /> }));
  journals.forEach((j) => items.push({ time: new Date(j.created_at).getTime(), key: `j-${j.id}`, render: <JournalCard journal={j} showAuthor onRefresh={refresh} /> }));
  shared.forEach((s) => items.push({ time: new Date(s.created_at).getTime(), key: `s-${s.id}`, render: <SharedCompletionCard completion={s} /> }));
  items.sort((a, b) => b.time - a.time);
  if (!items.length) return <Empty />;
  return <>{items.map((i) => <div key={i.key}>{i.render}</div>)}</>;
}

function StoryFeed({ posts, journals, shared, refresh }: { posts: any[]; journals: HikingJournal[]; shared: SharedCompletion[]; refresh: () => void }) {
  type Item = { time: number; render: JSX.Element; key: string };
  const items: Item[] = [];
  posts.forEach((p) => items.push({ time: new Date(p.created_at).getTime(), key: `p-${p.id}`, render: <CommunityPostCard post={p} /> }));
  journals.filter((j) => j.visibility === "public").forEach((j) =>
    items.push({ time: new Date(j.created_at).getTime(), key: `j-${j.id}`, render: <JournalCard journal={j} showAuthor onRefresh={refresh} /> }));
  shared.forEach((s) => items.push({ time: new Date(s.created_at).getTime(), key: `s-${s.id}`, render: <SharedCompletionCard completion={s} /> }));
  items.sort((a, b) => b.time - a.time);
  if (!items.length) return <Empty />;
  return <>{items.map((i) => <div key={i.key}>{i.render}</div>)}</>;
}

function CategoryFeed({ posts, category }: { posts: any[]; category: CommunityCategory }) {
  if (!posts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Mountain className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">아직 글이 없어요. 첫 글을 남겨보세요!</p>
      </div>
    );
  }
  return <>{posts.map((p) => <CommunityPostCard key={p.id} post={p} />)}</>;
}

function Loading() { return <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>; }
function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <Mountain className="mx-auto h-10 w-10 text-muted-foreground/30" />
      <p className="mt-3 text-sm text-muted-foreground">아직 공유된 글이 없습니다</p>
    </div>
  );
}

function DemoFeedView() {
  const { mountains } = useMountains();
  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground">커뮤니티</h1>
      <div className="space-y-4">
        {demoJournals.slice(0, 3).map((j) => {
          const mt = mountains.find((m) => m.id === j.mountain_id);
          return (
            <div key={j.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              {j.photos.length > 0 && <img src={j.photos[0]} alt="" className="w-full h-44 rounded-xl object-cover mb-3" loading="lazy" />}
              <p className="font-semibold text-sm">{mt?.nameKo || "산"}</p>
              {j.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{j.notes}</p>}
            </div>
          );
        })}
      </div>
      <Link to="/auth" className="block rounded-2xl bg-primary/10 p-5 text-center">
        <p className="text-sm font-bold text-primary">로그인하고 커뮤니티에 참여하세요</p>
      </Link>
    </div>
  );
}

export default FeedPage;
