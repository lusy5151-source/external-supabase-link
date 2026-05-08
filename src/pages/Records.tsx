import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useMountains } from "@/contexts/MountainsContext";
import { demoJournals, type DemoJournal } from "@/data/demoFeed";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChat } from "@/contexts/UnreadChatContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { JournalForm } from "@/components/JournalForm";
import { JournalCard, JournalGridCard } from "@/components/JournalCard";
import { Button } from "@/components/ui/button";
import MountainMascot from "@/components/MountainMascot";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mountain, Plus, Pencil, Trash2, MoreVertical, Heart, MessageCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Records = () => {
  const { mountains } = useMountains();
  const { user } = useAuth();
  const location = useLocation();
  const { resetFriendActivityUnread } = useUnreadChat();
  const { fetchMyJournals, fetchFeed, deleteJournal } = useHikingJournals();
  const { toast } = useToast();
  const [myJournals, setMyJournals] = useState<HikingJournal[]>([]);
  const [feedJournals, setFeedJournals] = useState<HikingJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJournal, setEditingJournal] = useState<HikingJournal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HikingJournal | null>(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedJournal, setSelectedJournal] = useState<HikingJournal | null>(null);
  const [prefillData, setPrefillData] = useState<{ mountainId?: number; date?: string } | null>(null);

  // Reset friend activity unread badge when viewing feed tab
  useEffect(() => {
    if (activeTab === "feed") resetFriendActivityUnread();
  }, [activeTab, resetFriendActivityUnread]);

  // Handle navigation state from summit claim diary prompt
  useEffect(() => {
    const state = location.state as any;
    if (state?.openJournalForm) {
      setPrefillData({ mountainId: state.prefillMountainId, date: state.prefillDate });
      setEditingJournal(null);
      setShowForm(true);
      // Clear the state so it doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mine, feed] = await Promise.all([fetchMyJournals(), fetchFeed()]);
    setMyJournals(mine);
    setFeedJournals(feed);
    setLoading(false);
  }, [fetchMyJournals, fetchFeed]);

  useEffect(() => { if (user) loadData(); else setLoading(false); }, [user, loadData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteJournal(deleteTarget.id);
    if (error) { toast({ title: "삭제 실패", variant: "destructive" }); }
    else { toast({ title: "기록을 삭제했습니다" }); setMyJournals((prev) => prev.filter((j) => j.id !== deleteTarget.id)); }
    setDeleteTarget(null);
  };

  const handleEdit = (journal: HikingJournal) => { setEditingJournal(journal); setShowForm(true); };
  const handleFormSaved = () => { setShowForm(false); setEditingJournal(null); setPrefillData(null); loadData(); };
  const handleFormClose = () => { setShowForm(false); setEditingJournal(null); setPrefillData(null); };

  const { isOnboarding } = useOnboarding();
  if (!user || isOnboarding) return <DemoRecordsView />;

  const allFeed = [...myJournals.map((j) => ({ ...j, _isMine: true })), ...feedJournals.map((j) => ({ ...j, _isMine: false }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">기록</h1><p className="text-xs text-muted-foreground mt-0.5">나와 친구들의 등산 기록</p></div>
        <Button data-onboarding="journal-create" size="sm" className="rounded-xl gap-1.5" onClick={() => { setEditingJournal(null); setShowForm(true); }}><Plus className="h-4 w-4" /> 기록 작성</Button>
      </div>

      <Tabs data-onboarding="journal-feed" value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedJournal(null); }}>
        <TabsList className="w-full bg-secondary/50 rounded-xl">
          <TabsTrigger value="feed" className="flex-1 rounded-lg text-xs">전체 피드</TabsTrigger>
          <TabsTrigger value="mine" className="flex-1 rounded-lg text-xs">내 기록</TabsTrigger>
          <TabsTrigger value="grid" className="flex-1 rounded-lg text-xs">갤러리</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4 mt-4">
          {loading ? <LoadingSkeleton /> : allFeed.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} /> : allFeed.map((j) => (
            <div key={j.id} className="relative">
              <JournalCard journal={j} showAuthor onRefresh={loadData} />
              {(j as any)._isMine && (
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(j)}><Pencil className="h-3.5 w-3.5 mr-2" /> 수정</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteTarget(j)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> 삭제</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4 mt-4">
          {loading ? <LoadingSkeleton /> : myJournals.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} /> : myJournals.map((j) => (
            <div key={j.id} className="relative">
              <JournalCard journal={j} showAuthor={false} onRefresh={loadData} />
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(j)}><Pencil className="h-3.5 w-3.5 mr-2" /> 수정</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteTarget(j)} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> 삭제</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          {loading ? <LoadingSkeleton /> : selectedJournal ? (
            <div className="space-y-3">
              <button onClick={() => setSelectedJournal(null)} className="text-xs text-primary hover:underline">← 갤러리로</button>
              <JournalCard journal={selectedJournal} showAuthor={false} onRefresh={loadData} />
            </div>
          ) : myJournals.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} /> : (
            <div className="grid grid-cols-3 gap-2">{myJournals.map((j) => (<JournalGridCard key={j.id} journal={j} onClick={() => setSelectedJournal(j)} />))}</div>
          )}
        </TabsContent>
      </Tabs>

      {showForm && <JournalForm editJournal={editingJournal} onClose={handleFormClose} onSaved={handleFormSaved} prefillMountainId={prefillData?.mountainId} prefillDate={prefillData?.date} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>기록을 삭제하시겠습니까?</AlertDialogTitle><AlertDialogDescription>삭제된 기록은 복구할 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function LoadingSkeleton() {
  return (<div className="flex flex-col items-center gap-3 py-8"><MountainMascot size={70} mood="loading" /><span className="text-sm text-muted-foreground">기록을 불러오는 중...</span></div>);
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center">
      <MountainMascot size={90} mood="waving" className="mx-auto" />
      <p className="mt-4 text-muted-foreground">아직 등산 기록이 없습니다</p>
      <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={onAdd}>기록 작성하기</Button>
    </div>
  );
}

function DemoRecordsView() {
  const { mountains } = useMountains();
  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-foreground">기록</h1><p className="text-xs text-muted-foreground mt-0.5">등산 커뮤니티의 최근 기록</p></div>
        <Link to="/auth"><Button size="sm" className="rounded-xl gap-1.5"><Plus className="h-4 w-4" /> 기록 작성</Button></Link>
      </div>
      <div className="space-y-4">
        {demoJournals.map((j) => {
          const mt = mountains.find((m) => m.id === j.mountain_id);
          return (
            <div key={j.id} className="rounded-2xl bg-card p-4 shadow-sm">
              {j.photos.length > 0 && <img src={j.photos[0]} alt="" className="w-full h-48 rounded-xl object-cover mb-3" loading="lazy" />}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm">{j.profile.nickname.charAt(0)}</div>
                <div><p className="text-sm font-semibold text-foreground">{j.profile.nickname}</p><p className="text-[10px] text-muted-foreground">{new Date(j.hiked_at).toLocaleDateString("ko-KR")}</p></div>
              </div>
              <p className="font-bold text-foreground">{mt?.nameKo || "산"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{j.course_name} · {j.duration} · {j.difficulty}</p>
              {j.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{j.notes}</p>}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-coral" /> {j.like_count}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {j.comment_count}</span>
                <span>{j.weather}</span>
              </div>
            </div>
          );
        })}
      </div>
      <Link to="/auth" className="block rounded-2xl bg-primary/10 p-5 text-center">
        <p className="text-sm font-bold text-primary">로그인하고 나만의 기록을 작성하세요</p>
      </Link>
    </div>
  );
}

export default Records;