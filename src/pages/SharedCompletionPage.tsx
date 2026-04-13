import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { useHikingPlans } from "@/hooks/useHikingPlans";
import { useFriends } from "@/hooks/useFriends";
import { SharedCompletionCard } from "@/components/SharedCompletionCard";
import { StackedAvatars } from "@/components/StackedAvatars";
import { mountains } from "@/data/mountains";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Mountain, Plus, CheckCircle2, PartyPopper, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MountainMascot from "@/components/MountainMascot";

const SharedCompletionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchSharedCompletions, fetchMySharedCompletions, createSharedCompletion, verifyCompletion } = useSharedCompletions();
  const { plans } = useHikingPlans();
  const { friends } = useFriends();

  const [completions, setCompletions] = useState<SharedCompletion[]>([]);
  const [myCompletions, setMyCompletions] = useState<SharedCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMountain, setSelectedMountain] = useState<string>("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      fetchSharedCompletions(),
      fetchMySharedCompletions(),
    ]).then(([all, mine]) => {
      setCompletions(all);
      setMyCompletions(mine);
      setLoading(false);
    });
  }, [user]);

  const handleCreate = async () => {
    if (!selectedMountain || selectedFriends.length === 0) return;
    setCreating(true);
    const { data, error } = await createSharedCompletion({
      mountain_id: parseInt(selectedMountain),
      participant_user_ids: selectedFriends,
      plan_id: selectedPlan || undefined,
    });
    setCreating(false);
    if (error) {
      toast({ title: "오류", description: "공동 완등 기록에 실패했습니다", variant: "destructive" });
    } else {
      setShowCreate(false);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      // Refresh
      Promise.all([fetchSharedCompletions(), fetchMySharedCompletions()]).then(([all, mine]) => {
        setCompletions(all);
        setMyCompletions(mine);
      });
    }
  };

  const handleVerify = async (scId: string) => {
    const { error } = await verifyCompletion(scId);
    if (!error) {
      toast({ title: "완등이 확인되었습니다! 👥" });
      fetchSharedCompletions().then(setCompletions);
    }
  };

  const toggleFriend = (fId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Users className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">로그인이 필요합니다</p>
        <Link to="/auth" className="text-sm text-primary hover:underline">로그인</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="rounded-3xl bg-card p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <MountainMascot size={100} mood="celebrating" className="mx-auto" />
            <h2 className="text-xl font-bold text-foreground mt-2">공동 완등 달성! 🎉</h2>
            <p className="text-sm text-muted-foreground mt-2">함께한 등산을 기록했습니다</p>
            <Badge className="mt-3 bg-primary/10 text-primary border-0 gap-1">
              <Users className="h-3 w-3" /> Completed Together 👥
            </Badge>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">공동 완등</h1>
          <p className="text-xs text-muted-foreground mt-0.5">함께 등산하고 함께 완등하세요</p>
        </div>
        <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> 공동 완등 기록
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="공동 완등" value={myCompletions.length} icon={Users} color="bg-sky-hero" />
        <StatCard label="함께한 친구" value={new Set(completions.flatMap((c) => (c.participants || []).map((p) => p.user_id))).size} icon={Trophy} color="bg-mint-light" />
        <StatCard label="완등한 산" value={new Set(myCompletions.map((c) => c.mountain_id)).size} icon={Mountain} color="bg-lavender-light" />
      </div>

      {/* Pending verifications */}
      {completions.filter((c) => (c.participants || []).some((p) => p.user_id === user.id && !p.verified)).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">📋 확인 대기 중</h2>
          <div className="space-y-3">
            {completions
              .filter((c) => (c.participants || []).some((p) => p.user_id === user.id && !p.verified))
              .map((c) => {
                const mt = mountains.find((m) => m.id === c.mountain_id);
                return (
                  <div key={c.id} className="rounded-2xl bg-card border border-coral/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{mt?.nameKo || "산"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(c.completed_at).toLocaleDateString("ko-KR")}</p>
                      </div>
                      <Button size="sm" className="rounded-full gap-1 text-xs" onClick={() => handleVerify(c.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> 수동 완등 확인
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* All shared completions */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">공동 완등 기록</h2>
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">불러오는 중...</div>
        ) : completions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <MountainMascot size={80} mood="waving" className="mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">아직 공동 완등 기록이 없습니다</p>
            <p className="text-xs text-muted-foreground/70 mt-1">친구들과 함께 등산하고 기록해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completions.map((sc) => (
              <SharedCompletionCard key={sc.id} completion={sc} />
            ))}
          </div>
        )}
      </section>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>공동 완등 기록하기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">산 선택</p>
              <Select value={selectedMountain} onValueChange={setSelectedMountain}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="산을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {mountains.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nameKo} ({m.region})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {plans.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">연결할 계획 (선택)</p>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="계획 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => {
                      const mt = mountains.find((m) => m.id === p.mountain_id);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {mt?.nameKo} - {new Date(p.planned_date).toLocaleDateString("ko-KR")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">함께한 친구 선택</p>
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground">아직 친구가 없습니다</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {friends.map((f) => {
                    const friendId = f.friendProfile?.user_id || f.id;
                    const friendName = f.friendProfile?.nickname || "이름 없음";
                    return (
                    <button
                      key={friendId}
                      onClick={() => toggleFriend(friendId)}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                        selectedFriends.includes(friendId) ? "bg-primary/10 border border-primary/30" : "bg-secondary/50 border border-transparent"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-light text-xs font-semibold text-primary">
                        {(friendName)[0]}
                      </div>
                      <span className="text-sm font-medium text-foreground">{friendName}</span>
                      {selectedFriends.includes(friendId) && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={handleCreate} disabled={creating || !selectedMountain || selectedFriends.length === 0} className="w-full rounded-xl">
              {creating ? "기록 중..." : "공동 완등 기록하기 👥"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm text-center">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default SharedCompletionPage;
