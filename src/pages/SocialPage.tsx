import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useFriends } from "@/hooks/useFriends";
import { useHikingGroups, type HikingGroup } from "@/hooks/useHikingGroups";
import { demoFriends, demoGroups } from "@/data/demoFeed";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Users, Mountain, Search, UserPlus, Check, X, ChevronRight, Bell, Trash2,
  Plus, Globe, Lock, Ban,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BlockedUsersList } from "@/components/BlockedUsersList";

import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const SocialPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completedCount } = useStore();
  const {
    friends, pendingReceived, pendingSent,
    sendRequest, acceptRequest, declineRequest, removeFriend, searchUsers,
  } = useFriends();
  const {
    myGroups, loading: groupsLoading, createGroup, fetchPublicGroups, joinGroup, requestJoin,
  } = useHikingGroups();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [mainTab, setMainTab] = useState<"friends" | "clubs">("friends");
  const [friendTab, setFriendTab] = useState<"list" | "requests">("list");

  // Club state
  const [publicGroups, setPublicGroups] = useState<HikingGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubPublic, setClubPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  useEffect(() => {
    if (mainTab === "clubs") {
      fetchPublicGroups().then(setPublicGroups);
    }
  }, [mainTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (addresseeId: string) => {
    const { error } = await sendRequest(addresseeId);
    if (error) {
      toast({ title: "오류", description: "이미 친구이거나 요청을 보냈습니다.", variant: "destructive" });
    } else {
      toast({ title: "친구 요청을 보냈습니다" });
      setSearchResults((prev) => prev.filter((p) => p.user_id !== addresseeId));
    }
  };

  const handleCreateClub = async () => {
    if (!clubName.trim()) return;
    setCreating(true);
    const { error } = await createGroup({ name: clubName.trim(), description: clubDesc.trim() || undefined, is_public: clubPublic });
    setCreating(false);
    if (error) {
      toast({ title: "오류", description: "산악회 생성에 실패했습니다", variant: "destructive" });
    } else {
      toast({ title: "산악회 생성 완료!" });
      setShowCreate(false);
      setClubName("");
      setClubDesc("");
      fetchPublicGroups().then(setPublicGroups);
    }
  };

  const handleJoinClub = async (groupId: string) => {
    const { error } = await requestJoin(groupId);
    if (error) {
      toast({ title: "이미 가입 요청을 보냈습니다", variant: "destructive" });
    } else {
      toast({ title: "가입 요청을 보냈습니다. 리더의 승인을 기다려주세요." });
      fetchPublicGroups().then(setPublicGroups);
    }
  };

  const { isOnboarding } = useOnboarding();

  if (!user || isOnboarding) {
    return <DemoSocialView />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">함께 걷기</h1>
          <p className="mt-1 text-sm text-muted-foreground">친구와 산악회를 관리하세요</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 text-muted-foreground"
          onClick={() => setShowBlockedUsers(true)}
        >
          <Ban className="h-3.5 w-3.5 mr-1" />
          차단 관리
        </Button>
      </div>

      {/* Blocked Users Modal */}
      <Dialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              차단 관리
            </DialogTitle>
          </DialogHeader>
          <BlockedUsersList />
        </DialogContent>
      </Dialog>

      {/* Main Tabs: Friends | Clubs */}
      <div data-onboarding="social-tabs" className="flex gap-2">
        <button
          onClick={() => setMainTab("friends")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            mainTab === "friends" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          친구 {friends.length > 0 && `(${friends.length})`}
        </button>
        <button
          onClick={() => setMainTab("clubs")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            mainTab === "clubs" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          산악회 {myGroups.length > 0 && `(${myGroups.length})`}
        </button>
      </div>

      {/* ═══ FRIENDS TAB ═══ */}
      {mainTab === "friends" && (
        <div className="space-y-5">
          {/* Search */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="닉네임으로 친구 찾기..."
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                검색
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-3">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm">👤</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.nickname || "사용자"}</p>
                      {p.location && <p className="text-[10px] text-muted-foreground">{p.location}</p>}
                    </div>
                    <button
                      onClick={() => handleSendRequest(p.user_id)}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <UserPlus className="h-3 w-3" /> 추가
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friend sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFriendTab("list")}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                friendTab === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              친구 목록
            </button>
            <button
              onClick={() => setFriendTab("requests")}
              className={`relative rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                friendTab === "requests" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              요청
              {pendingReceived.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {pendingReceived.length}
                </span>
              )}
            </button>
          </div>

          {/* Friends list */}
          {friendTab === "list" && (
            <div className="space-y-2.5">
              {friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">아직 친구가 없습니다</p>
                  <p className="text-xs text-muted-foreground/70">닉네임으로 검색하여 친구를 추가하세요</p>
                </div>
              ) : (
                friends.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                    <button
                      onClick={() => navigate(`/profile/${f.friendProfile.user_id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      {f.friendProfile.avatar_url ? (
                        <img src={f.friendProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg shrink-0">👤</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{f.friendProfile.nickname || "사용자"}</p>
                        {f.friendProfile.bio && <p className="text-xs text-muted-foreground truncate">{f.friendProfile.bio}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                    <button
                      onClick={() => removeFriend(f.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Requests */}
          {friendTab === "requests" && (
            <div className="space-y-4">
              {pendingReceived.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Bell className="h-4 w-4 text-primary" /> 받은 요청
                  </h3>
                  <div className="space-y-2">
                    {pendingReceived.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                        {f.friendProfile.avatar_url ? (
                          <img src={f.friendProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg">👤</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{f.friendProfile.nickname || "사용자"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => acceptRequest(f.id)} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => declineRequest(f.id)} className="rounded-lg bg-secondary p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingSent.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">보낸 요청</h3>
                  <div className="space-y-2">
                    {pendingSent.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm">👤</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{f.friendProfile.nickname || "사용자"}</p>
                          <p className="text-[10px] text-muted-foreground">대기중</p>
                        </div>
                        <button onClick={() => declineRequest(f.id)} className="text-xs text-muted-foreground hover:text-destructive">취소</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingReceived.length === 0 && pendingSent.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">친구 요청이 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ CLUBS TAB ═══ */}
      {mainTab === "clubs" && (
        <div className="space-y-5">
          {/* Create club button */}
          <div className="flex justify-end">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full gap-1.5">
                  <Plus className="h-4 w-4" /> 산악회 만들기
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>새 산악회 만들기</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-xs">산악회 이름</Label>
                    <Input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="완등 산악회" className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs">설명</Label>
                    <Textarea value={clubDesc} onChange={(e) => setClubDesc(e.target.value)} placeholder="산악회 소개를 입력하세요" className="mt-1 rounded-xl" rows={3} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">공개 산악회</Label>
                    <Switch checked={clubPublic} onCheckedChange={setClubPublic} />
                  </div>
                  <Button onClick={handleCreateClub} disabled={creating || !clubName.trim()} className="w-full rounded-xl">
                    {creating ? "생성 중..." : "산악회 만들기"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* My clubs */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">내 산악회</h2>
            {groupsLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">불러오는 중...</div>
            ) : myGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">아직 가입한 산악회가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myGroups.map((g) => (
                  <ClubCard key={g.id} group={g} isMember />
                ))}
              </div>
            )}
          </section>

          {/* Public clubs */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">공개 산악회</h2>
            {publicGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <Globe className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">공개 산악회가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicGroups.map((g) => {
                  const isMember = myGroups.some((mg) => mg.id === g.id);
                  return (
                    <ClubCard key={g.id} group={g} isMember={isMember} onJoin={!isMember ? () => handleJoinClub(g.id) : undefined} />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

function ClubCard({ group, isMember, onJoin }: { group: HikingGroup; isMember: boolean; onJoin?: () => void }) {
  const navigate = useNavigate();
  return (
    <div
      className="rounded-2xl bg-card border border-border p-4 shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground">{group.name}</h3>
              {group.is_public ? <Globe className="h-3 w-3 text-muted-foreground" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            {group.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{group.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {group.member_count || 0}명 · {new Date(group.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
        {onJoin ? (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onJoin(); }} className="rounded-full text-xs">
            가입 요청
          </Button>
        ) : isMember ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>
    </div>
  );
}

function DemoSocialView() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">함께 걷기</h1>
        <p className="mt-1 text-sm text-muted-foreground">등산 친구와 산악회를 만나보세요</p>
      </div>

      {/* Demo Friends + Clubs tabs area */}
      <div data-onboarding="social-tabs" className="flex gap-2 mb-3">
        <div className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-center bg-primary text-primary-foreground">친구</div>
        <div className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-center bg-secondary text-muted-foreground">산악회</div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">활발한 등산러</h2>
        <div className="space-y-2.5">
          {demoFriends.map((f) => (
            <div key={f.nickname} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {f.nickname.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{f.nickname}</p>
                <p className="text-xs text-muted-foreground truncate">{f.bio}</p>
              </div>
              <span className="text-xs text-muted-foreground">{f.completedCount}좌 완등</span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Clubs */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">인기 산악회</h2>
        <div className="space-y-3">
          {demoGroups.map((g) => (
            <div key={g.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{g.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{g.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{g.member_count}명</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link to="/auth" className="block rounded-2xl bg-primary/10 p-5 text-center">
        <p className="text-sm font-bold text-primary">로그인하고 친구를 추가하세요</p>
        <p className="text-xs text-muted-foreground mt-1">함께 등산하면 더 즐거워요!</p>
      </Link>
    </div>
  );
}

export default SocialPage;
