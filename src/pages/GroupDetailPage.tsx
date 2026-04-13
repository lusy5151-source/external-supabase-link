import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { mountains } from "@/data/mountains";
import {
  useHikingGroups,
  type HikingGroup,
  type GroupMember,
  type GroupInvitation,
} from "@/hooks/useHikingGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Globe, Lock, ArrowLeft, Crown, UserPlus, LogOut, Search,
  UserMinus, Settings, CheckCircle, XCircle, Clock, Trash2, Flag, Mountain, Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ClubChat from "@/components/ClubChat";
import ClubHikingPlans from "@/components/ClubHikingPlans";

interface ClubSummitClaim {
  id: string;
  user_id: string;
  mountain_id: number;
  summit_id: string;
  photo_url: string;
  claimed_at: string;
  summit_name?: string;
  nickname?: string | null;
  avatar_url?: string | null;
}

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    fetchGroupById, fetchGroupMembers, joinGroup, leaveGroup, removeMember,
    updateGroup, deleteGroup, sendInvite, requestJoin, fetchInvitations,
    acceptJoinRequest, rejectJoinRequest, searchUsers,
  } = useHikingGroups();
  const { toast } = useToast();

  const [group, setGroup] = useState<HikingGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Summit stats
  const [totalClaims, setTotalClaims] = useState(0);
  const [recentClaims, setRecentClaims] = useState<ClubSummitClaim[]>([]);
  const [claimedMountains, setClaimedMountains] = useState<{ mountain_id: number; count: number }[]>([]);

  // Modals
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Invite search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublic, setEditPublic] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [g, m] = await Promise.all([fetchGroupById(id), fetchGroupMembers(id)]);
    setGroup(g);
    setMembers(m);
    if (user && g) {
      setIsLeader(g.creator_id === user.id);
      setIsMember(m.some((mb) => mb.user_id === user.id));
    }

    // Fetch club summit claims
    const { data: claimsData } = await supabase
      .from("summit_claims")
      .select("id, user_id, mountain_id, summit_id, photo_url, claimed_at")
      .eq("group_id", id)
      .order("claimed_at", { ascending: false });

    const claimsArr = (claimsData as any[]) || [];
    setTotalClaims(claimsArr.length);

    // Mountain breakdown
    const mtCounts = new Map<number, number>();
    claimsArr.forEach((c) => mtCounts.set(c.mountain_id, (mtCounts.get(c.mountain_id) || 0) + 1));
    setClaimedMountains(
      [...mtCounts.entries()]
        .map(([mountain_id, count]) => ({ mountain_id, count }))
        .sort((a, b) => b.count - a.count)
    );

    // Enrich recent claims
    const recent = claimsArr.slice(0, 6);
    if (recent.length > 0) {
      const userIds = [...new Set(recent.map((c: any) => c.user_id))];
      const summitIds = [...new Set(recent.map((c: any) => c.summit_id))];
      const [{ data: profiles }, { data: summits }] = await Promise.all([
        supabase.from("profiles").select("user_id, nickname, avatar_url").in("user_id", userIds),
        supabase.from("summits").select("id, summit_name").in("id", summitIds),
      ]);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const summitMap = new Map((summits || []).map((s: any) => [s.id, s.summit_name]));
      setRecentClaims(recent.map((c: any) => ({
        ...c,
        summit_name: summitMap.get(c.summit_id) || "정상",
        nickname: profileMap.get(c.user_id)?.nickname || null,
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      })));
    } else {
      setRecentClaims([]);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (isLeader && id) fetchInvitations(id).then(setInvitations);
  }, [isLeader, id]);

  useEffect(() => {
    if (!isMember && !isLeader && user && id) {
      supabase
        .from("group_invitations" as any)
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .then(({ data }) => setHasPendingRequest((data as any[] || []).length > 0));
    }
  }, [isMember, isLeader, user, id]);

  const handleJoin = async () => {
    if (!id) return;
    // Always require join request (leader must approve)
    const { error } = await requestJoin(id);
    if (error) toast({ title: "이미 요청을 보냈습니다", variant: "destructive" });
    else { toast({ title: "가입 요청을 보냈습니다. 리더의 승인을 기다려주세요." }); setHasPendingRequest(true); }
  };

  const handleLeave = async () => {
    if (!id) return;
    const { error } = await leaveGroup(id);
    setConfirmLeave(false);
    if (error) toast({ title: "탈퇴에 실패했습니다", variant: "destructive" });
    else { toast({ title: "산악회에서 탈퇴했습니다" }); navigate("/social"); }
  };

  const handleRemoveMember = async () => {
    if (!id || !removingUserId) return;
    const { error } = await removeMember(id, removingUserId);
    setRemovingUserId(null);
    if (error) toast({ title: "멤버 제거에 실패했습니다", variant: "destructive" });
    else { toast({ title: "멤버를 제거했습니다" }); loadData(); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchQuery);
    const memberIds = new Set(members.map((m) => m.user_id));
    setSearchResults(results.filter((r: any) => !memberIds.has(r.user_id)));
    setSearching(false);
  };

  const handleSendInvite = async (userId: string) => {
    if (!id) return;
    const { error } = await sendInvite(id, userId);
    if (error) toast({ title: "초대에 실패했습니다", variant: "destructive" });
    else { toast({ title: "초대를 보냈습니다!" }); setSearchResults((p) => p.filter((r: any) => r.user_id !== userId)); }
  };

  const handleAcceptRequest = async (inv: GroupInvitation) => {
    const { error } = await acceptJoinRequest(inv.id, inv.group_id, inv.user_id);
    if (!error) { toast({ title: "가입 요청을 승인했습니다" }); setInvitations((p) => p.filter((i) => i.id !== inv.id)); loadData(); }
  };

  const handleRejectRequest = async (inv: GroupInvitation) => {
    const { error } = await rejectJoinRequest(inv.id);
    if (!error) { toast({ title: "가입 요청을 거절했습니다" }); setInvitations((p) => p.filter((i) => i.id !== inv.id)); }
  };

  const handleEditSave = async () => {
    if (!id) return;
    const { error } = await updateGroup(id, { name: editName, description: editDesc || undefined, is_public: editPublic });
    if (error) toast({ title: "수정에 실패했습니다", variant: "destructive" });
    else { toast({ title: "산악회 정보를 수정했습니다" }); setShowEdit(false); loadData(); }
  };

  const openEdit = () => {
    if (group) { setEditName(group.name); setEditDesc(group.description || ""); setEditPublic(group.is_public); setShowEdit(true); }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    const { error } = await deleteGroup(id);
    setConfirmDelete(false);
    if (error) toast({ title: "삭제에 실패했습니다", variant: "destructive" });
    else { toast({ title: "산악회가 삭제되었습니다" }); navigate("/social"); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingLogo(true);
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "profile");
    if (!compressed) { setUploadingLogo(false); return; }
    const path = `${id}/logo.jpg`;
    const { error: uploadErr } = await supabase.storage.from("club-logos").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) {
      toast({ title: "로고 업로드에 실패했습니다", variant: "destructive" });
      setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(path);
    await supabase.from("hiking_groups").update({ avatar_url: urlData.publicUrl } as any).eq("id", id);
    setUploadingLogo(false);
    toast({ title: "로고가 업데이트되었습니다!" });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">불러오는 중...</p></div>;

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Users className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">산악회를 찾을 수 없습니다</p>
        <Button variant="outline" onClick={() => navigate("/social")}>돌아가기</Button>
      </div>
    );
  }

  const joinRequests = invitations.filter((i) => i.type === "request");

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/social")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground truncate">{group.name}</h1>
        {isLeader && (
          <div className="flex gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={openEdit}><Settings className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Group Info Card */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16 rounded-xl">
              {group.avatar_url && <AvatarImage src={group.avatar_url} alt={group.name} />}
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">{group.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {isLeader && (
              <>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" ref={logoFileRef} onChange={handleLogoUpload} className="hidden" />
                <button
                  onClick={() => logoFileRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploadingLogo}
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{group.name}</h2>
              {group.is_public ? (
                <Badge variant="secondary" className="gap-1 text-[10px]"><Globe className="h-2.5 w-2.5" /> 공개</Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="h-2.5 w-2.5" /> 비공개</Badge>
              )}
            </div>
            {group.description && <p className="text-xs text-muted-foreground mt-1">{group.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-2">{members.length}명 멤버 · {new Date(group.created_at).toLocaleDateString("ko-KR")} 생성</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isMember && !isLeader && (
            hasPendingRequest ? (
              <Button variant="secondary" className="flex-1 rounded-xl gap-1.5" disabled><Clock className="h-4 w-4" /> 승인 대기 중</Button>
            ) : (
              <Button className="flex-1 rounded-xl gap-1.5" onClick={handleJoin}>
                <UserPlus className="h-4 w-4" /> 가입 요청
              </Button>
            )
          )}
          {isMember && !isLeader && (
            <Button variant="outline" className="flex-1 rounded-xl gap-1.5 text-destructive hover:text-destructive" onClick={() => setConfirmLeave(true)}>
              <LogOut className="h-4 w-4" /> 산악회 탈퇴
            </Button>
          )}
          {isLeader && (
            <>
              <Button className="flex-1 rounded-xl gap-1.5" onClick={() => setShowInvite(true)}><UserPlus className="h-4 w-4" /> 멤버 초대</Button>
              {joinRequests.length > 0 && (
                <Button variant="outline" className="rounded-xl gap-1.5 relative" onClick={() => setShowRequests(true)}>
                  가입 요청
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{joinRequests.length}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Summit Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <Flag className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{totalClaims}</p>
          <p className="text-[10px] text-muted-foreground">총 정상 정복</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <Mountain className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{claimedMountains.length}</p>
          <p className="text-[10px] text-muted-foreground">정복한 산</p>
        </div>
      </div>

      {/* ── Claimed Mountains ── */}
      {claimedMountains.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">🏔 정복한 산</h2>
          <div className="space-y-2">
            {claimedMountains.slice(0, 5).map(({ mountain_id, count }) => {
              const mt = mountains.find((m) => m.id === mountain_id);
              return (
                <Link key={mountain_id} to={`/mountains/${mountain_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Mountain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{mt?.nameKo || `산 #${mountain_id}`}</p>
                    <p className="text-[10px] text-muted-foreground">{mt?.region}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                    <Flag className="h-2.5 w-2.5" /> {count}회
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent Summit Activity ── */}
      {recentClaims.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">🔥 최근 정복 활동</h2>
          <div className="space-y-2">
            {recentClaims.map((claim) => {
              const mt = mountains.find((m) => m.id === claim.mountain_id);
              return (
                <div key={claim.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <Link to={`/profile/${claim.user_id}`} className="shrink-0">
                    <Avatar className="h-8 w-8">
                      {claim.avatar_url && <AvatarImage src={claim.avatar_url} />}
                      <AvatarFallback className="text-[10px] bg-muted">{(claim.nickname || "?").charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/profile/${claim.user_id}`} className="text-xs font-medium text-primary hover:underline">
                        {claim.nickname || "멤버"}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="text-xs font-medium text-foreground truncate">{claim.summit_name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {mt?.nameKo} · {new Date(claim.claimed_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <img src={claim.photo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" loading="lazy" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Member List */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">멤버 ({members.length})</h2>
        <div className="space-y-2">
          {members
            .sort((a, b) => (a.user_id === group.creator_id ? -1 : b.user_id === group.creator_id ? 1 : 0))
            .map((member) => {
              const memberIsLeader = member.user_id === group.creator_id;
              return (
                <div key={member.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
                  <Link to={`/profile/${member.user_id}`}>
                    <Avatar className="h-9 w-9">
                      {member.profile?.avatar_url && <AvatarImage src={member.profile.avatar_url} />}
                      <AvatarFallback className="text-xs bg-muted">{(member.profile?.nickname || "?").charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/profile/${member.user_id}`} className="text-sm font-medium text-foreground truncate hover:text-primary">
                        {member.profile?.nickname || "알 수 없음"}
                      </Link>
                      {memberIsLeader && (
                        <Badge className="gap-0.5 text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                          <Crown className="h-2.5 w-2.5" /> 리더
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isLeader && !memberIsLeader && member.user_id !== user?.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setRemovingUserId(member.user_id)}>
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      </section>


      {/* ── Club Hiking Plans ── */}
      {id && <ClubHikingPlans clubId={id} isLeader={isLeader} isMember={isMember || isLeader} />}

      {/* ── Club Chat ── */}
      {(isMember || isLeader) && id && <ClubChat clubId={id} />}

      {/* ── Modals ── */}
      {/* Invite */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>멤버 초대</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Input placeholder="닉네임 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="rounded-xl" />
              <Button size="sm" onClick={handleSearch} disabled={searching} className="rounded-xl shrink-0"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-xs text-muted-foreground text-center py-4">검색 결과가 없습니다</p>
              )}
              {searchResults.map((u: any) => (
                <div key={u.user_id} className="flex items-center gap-3 p-2 rounded-xl border border-border">
                  <Avatar className="h-8 w-8">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-xs bg-muted">{(u.nickname || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{u.nickname || "알 수 없음"}</span>
                  <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => handleSendInvite(u.user_id)}>초대</Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Requests */}
      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>가입 요청</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto mt-2">
            {joinRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">대기 중인 요청이 없습니다</p>
            ) : (
              joinRequests.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <Avatar className="h-8 w-8">
                    {inv.profile?.avatar_url && <AvatarImage src={inv.profile.avatar_url} />}
                    <AvatarFallback className="text-xs bg-muted">{(inv.profile?.nickname || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{inv.profile?.nickname || "알 수 없음"}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleAcceptRequest(inv)}><CheckCircle className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRejectRequest(inv)}><XCircle className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>산악회 정보 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs">산악회 이름</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 rounded-xl" /></div>
            <div><Label className="text-xs">설명</Label><Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1 rounded-xl" rows={3} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">공개 산악회</Label><Switch checked={editPublic} onCheckedChange={setEditPublic} /></div>
            <Button onClick={handleEditSave} disabled={!editName.trim()} className="w-full rounded-xl">저장</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Confirm */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>산악회 탈퇴</AlertDialogTitle>
            <AlertDialogDescription>정말 이 산악회에서 탈퇴하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">탈퇴</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member */}
      <AlertDialog open={!!removingUserId} onOpenChange={(open) => !open && setRemovingUserId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>멤버 제거</AlertDialogTitle>
            <AlertDialogDescription>이 멤버를 산악회에서 제거하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">제거</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>산악회 삭제</AlertDialogTitle>
            <AlertDialogDescription>이 산악회를 삭제하시겠습니까? 모든 멤버와 데이터가 삭제됩니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupDetailPage;
