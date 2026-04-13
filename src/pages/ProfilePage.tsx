import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useStore } from "@/context/StoreContext";
import { useGearStore } from "@/hooks/useGearStore";
import { useAchievementStore } from "@/hooks/useAchievementStore";
import { useSharedCompletionCounts } from "@/hooks/useSharedCompletionCounts";
import { useProfile } from "@/hooks/useProfile";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { useFriends } from "@/hooks/useFriends";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { badges, BadgeCategory } from "@/data/badges";
import { mountains, regions } from "@/data/mountains";
import { JournalCard, JournalGridCard } from "@/components/JournalCard";
import { Link } from "react-router-dom";
import {
  User, Trophy, Mountain, ChevronRight, Star, Camera, MapPin,
  Settings, LogOut, Shield, Edit3, BookOpen, Users, Heart, Globe, Lock, Eye, Trash2, Flag,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const HIKING_STYLES = [
  { id: "solo", label: "솔로 등산", emoji: "🧍" },
  { id: "trekking", label: "트레킹", emoji: "🥾" },
  { id: "photography", label: "사진촬영", emoji: "📸" },
  { id: "summit", label: "정상 도전", emoji: "⛰️" },
  { id: "healing", label: "힐링 하이킹", emoji: "🌿" },
];

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { records, completedCount, totalCompletions } = useStore();
  const { items: gearItems } = useGearStore();
  const sharedCompletions = useSharedCompletionCounts();
  const { earnedBadges, earnedCount, totalBadges, featuredBadge, setFeatured, featuredBadgeId } =
    useAchievementStore(records, gearItems, sharedCompletions);
  const { profile, loading: profileLoading, updateProfile, uploadAvatar } = useProfile();
  const { fetchMyJournals } = useHikingJournals();
  const { friends } = useFriends();
  const { toast } = useToast();
  const { settings: privacySettings, updateSettings: updatePrivacy, isPrivateAccount } = usePrivacySettings();

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [journals, setJournals] = useState<HikingJournal[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<HikingJournal | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "stats">("posts");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const percentage = Math.round((completedCount / mountains.length) * 100);

  useEffect(() => {
    if (user) {
      fetchMyJournals().then(setJournals);
    }
  }, [user]);

  // Shared hikes count (journals with tagged friends)
  const sharedHikesCount = useMemo(
    () => journals.filter((j) => j.tagged_friends && j.tagged_friends.length > 0).length,
    [journals]
  );

  // Recent tagged friends
  const recentTaggedFriends = useMemo(() => {
    const allFriendIds = journals
      .flatMap((j) => j.tagged_friends || [])
      .filter(Boolean);
    return [...new Set(allFriendIds)].slice(0, 6);
  }, [journals]);

  const [taggedProfiles, setTaggedProfiles] = useState<Map<string, { nickname: string | null; avatar_url: string | null }>>(new Map());
  useEffect(() => {
    if (recentTaggedFriends.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", recentTaggedFriends)
      .then(({ data }) => {
        if (data) setTaggedProfiles(new Map(data.map((p) => [p.user_id, p])));
      });
  }, [recentTaggedFriends]);

  const regionProgress = useMemo(() => {
    const uniqueByRegion = new Map<string, Set<number>>();
    records.forEach((r) => {
      const m = mountains.find((mt) => mt.id === r.mountainId);
      if (m) {
        if (!uniqueByRegion.has(m.region)) uniqueByRegion.set(m.region, new Set());
        uniqueByRegion.get(m.region)!.add(m.id);
      }
    });
    return regions.map((region) => {
      const total = mountains.filter((m) => m.region === region).length;
      const completed = uniqueByRegion.get(region)?.size || 0;
      return { region, total, completed };
    });
  }, [records]);

  // Mountains with repeat completions
  const repeatMountains = useMemo(() => {
    const countMap = new Map<number, number>();
    records.forEach((r) => {
      countMap.set(r.mountainId, (countMap.get(r.mountainId) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ mountain: mountains.find((m) => m.id === id), count }))
      .filter((x) => x.mountain);
  }, [records]);

  const recentBadge = useMemo(() => {
    if (earnedBadges.length === 0) return null;
    return [...earnedBadges].sort(
      (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
    )[0];
  }, [earnedBadges]);

  const startEditing = () => {
    setNickname(profile?.nickname || "");
    setBio(profile?.bio || "");
    setLocation(profile?.location || "");
    setSelectedStyles(profile?.hiking_styles || []);
    setEditing(true);
  };

  const saveProfile = async () => {
    await updateProfile({ nickname, bio, location, hiking_styles: selectedStyles });
    setEditing(false);
    toast({ title: "프로필이 저장되었습니다" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    toast({ title: "프로필 사진이 업데이트되었습니다" });
  };

  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  if (!user) return null;

  return (
    <div className="space-y-5 pb-24">
      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center relative">
        <button
          onClick={editing ? saveProfile : startEditing}
          className="absolute top-4 right-4 rounded-lg p-2 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
        >
          {editing ? <span className="text-xs font-medium text-primary">저장</span> : <Edit3 className="h-4 w-4" />}
        </button>

        <div className="relative mx-auto mb-3 h-20 w-20">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="프로필"
              className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <User className="h-9 w-9 text-primary" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm"
            title="프로필 사진을 변경합니다. 다른 사용자에게 표시됩니다."
          >
            <Camera className="h-3 w-3" />
          </button>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">프로필 사진은 다른 사용자에게 표시됩니다</p>

        {editing ? (
          <div className="space-y-3 mt-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="자기소개"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="지역 (선택)"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">등산 스타일</p>
              <div className="flex flex-wrap justify-center gap-2">
                {HIKING_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleStyle(s.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedStyles.includes(s.id)
                        ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-foreground">
              {profile?.nickname || user.email?.split("@")[0]}
            </h1>
            {profile?.bio && <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>}
            {profile?.location && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {profile.location}
              </p>
            )}
            {profile?.hiking_styles && profile.hiking_styles.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {profile.hiking_styles.map((id) => {
                  const style = HIKING_STYLES.find((s) => s.id === id);
                  return style ? (
                    <span key={id} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                      {style.emoji} {style.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {featuredBadge && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <span className="text-base">{featuredBadge.icon}</span>
                <span className="text-xs font-medium text-primary">{featuredBadge.name}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Summary - 5 stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{journals.length}</p>
          <p className="text-[9px] text-muted-foreground">등산 일지</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-primary">{completedCount}</p>
          <p className="text-[9px] text-muted-foreground">완등 산</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{totalCompletions}</p>
          <p className="text-[9px] text-muted-foreground">총 완등</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{sharedHikesCount}</p>
          <p className="text-[9px] text-muted-foreground">함께 등산</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{percentage}%</p>
          <p className="text-[9px] text-muted-foreground">진행률</p>
        </div>
      </div>

      {/* Recent tagged friends */}
      {recentTaggedFriends.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> 최근 함께한 친구
          </p>
          <div className="flex gap-3">
            {recentTaggedFriends.map((fId) => {
              const p = taggedProfiles.get(fId);
              return (
                <div key={fId} className="flex flex-col items-center gap-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">{p?.nickname?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-[9px] text-foreground font-medium truncate w-12 text-center">
                    {p?.nickname || "친구"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors",
            activeTab === "posts" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" /> 등산 일지
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors",
            activeTab === "stats" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy className="h-3.5 w-3.5" /> 통계 & 업적
        </button>
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <section>
          {journals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">아직 게시된 일지가 없습니다</p>
              <p className="text-xs text-muted-foreground/70 mt-1">산 상세 페이지에서 일지를 작성하고 게시해보세요</p>
            </div>
          ) : selectedJournal ? (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedJournal(null)}
                className="text-xs text-primary hover:underline"
              >
                ← 목록으로
              </button>
              <JournalCard journal={selectedJournal} showAuthor={false} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {journals.map((j) => (
                <JournalGridCard key={j.id} journal={j} onClick={() => setSelectedJournal(j)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Stats tab */}
      {activeTab === "stats" && (
        <section className="space-y-5">
          {/* Overall progress */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">전체 진행률</h2>
              <span className="text-xs text-muted-foreground">{completedCount} / {mountains.length}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Region progress */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">지역별 진행률</h2>
            <div className="space-y-3">
              {regionProgress.map(({ region, total, completed }) => (
                <div key={region}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground">{region}</span>
                    <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-500"
                      style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repeat completions */}
          {repeatMountains.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-3">재등반 기록</h2>
              <div className="space-y-2.5">
                {repeatMountains.map(({ mountain: mt, count }) => (
                  <Link
                    key={mt!.id}
                    to={`/mountains/${mt!.id}`}
                    className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Mountain className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{mt!.nameKo}</p>
                        <p className="text-[10px] text-muted-foreground">{mt!.region} · {mt!.height}m</p>
                      </div>
                    </div>
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {count}회
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent achievement */}
          {recentBadge && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-3">최근 업적</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl">{recentBadge.badge.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{recentBadge.badge.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(recentBadge.earnedAt).toLocaleDateString("ko-KR")} 달성
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Badge gallery */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">업적 갤러리</h2>
              <Link to="/achievements" className="text-xs text-primary hover:underline">모두 보기</Link>
            </div>
            {earnedBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">아직 획득한 업적이 없습니다</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {earnedBadges.slice(0, 12).map((eb) => (
                  <button
                    key={eb.badgeId}
                    onClick={() => setFeatured(featuredBadgeId === eb.badgeId ? null : eb.badgeId)}
                    className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                      featuredBadgeId === eb.badgeId
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <span className="text-2xl">{eb.badge.icon}</span>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                      {eb.badge.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {featuredBadgeId && (
              <p className="mt-2 text-[10px] text-primary text-center">
                ⭐ 대표 배지로 설정됨 (다시 클릭하면 해제)
              </p>
            )}
          </div>
        </section>
      )}

      {/* Privacy Settings */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">계정 공개 설정</h2>
        </div>

        {/* Account type toggle */}
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
          <div className="flex items-center gap-2">
            {isPrivateAccount ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 text-primary" />
            )}
            <div>
              <p className="text-xs font-medium text-foreground">
                {isPrivateAccount ? "비공개 계정" : "공개 계정"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isPrivateAccount
                  ? "친구만 내 활동을 볼 수 있습니다"
                  : "모든 사람이 내 활동을 볼 수 있습니다"}
              </p>
            </div>
          </div>
          <Switch
            checked={isPrivateAccount}
            onCheckedChange={async (checked) => {
              await updatePrivacy({
                profile_visibility: checked ? "private" : "public",
                journal_visibility: checked ? "friends" : "public",
              });
              toast({
                title: checked ? "비공개 계정으로 전환되었습니다 🔒" : "공개 계정으로 전환되었습니다 🌐",
              });
            }}
          />
        </div>

        {/* Default journal visibility */}
        <div>
          <p className="text-xs font-medium text-foreground mb-2">기본 일지 공개 범위</p>
          <div className="flex gap-2">
            {[
              { value: "public", label: "전체 공개", icon: Globe, disabled: isPrivateAccount },
              { value: "friends", label: "친구만", icon: Users, disabled: false },
              { value: "private", label: "나만 보기", icon: Lock, disabled: false },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = privacySettings?.journal_visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  disabled={opt.disabled}
                  onClick={async () => {
                    await updatePrivacy({ journal_visibility: opt.value as any });
                    toast({ title: `기본 공개 범위가 '${opt.label}'로 변경되었습니다` });
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-secondary/50",
                    opt.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {isPrivateAccount && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              비공개 계정에서는 '전체 공개'를 사용할 수 없습니다
            </p>
          )}
        </div>

        {/* Friend requests toggle */}
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
          <div>
            <p className="text-xs font-medium text-foreground">친구 요청 허용</p>
            <p className="text-[10px] text-muted-foreground">
              다른 사람이 친구 요청을 보낼 수 있습니다
            </p>
          </div>
          <Switch
            checked={privacySettings?.allow_friend_requests ?? true}
            onCheckedChange={async (checked) => {
              await updatePrivacy({ allow_friend_requests: checked });
              toast({
                title: checked ? "친구 요청이 허용되었습니다" : "친구 요청이 차단되었습니다",
              });
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Link
          to="/feed"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary/50"
        >
          <Heart className="h-4 w-4 text-primary" />
          친구 피드 보기
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          to="/achievements"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary/50"
        >
          <Trophy className="h-4 w-4 text-primary" />
          전체 업적 보기
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {isAdmin && (
          <Link
            to="/admin/announcements"
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              공지사항 관리
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/magazine"
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              매거진 관리
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/reports"
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-destructive" />
              신고 관리
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/mountains"
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              산 승인 관리
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        <Link
          to="/privacy"
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            개인정보처리방침
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>

        <Separator className="my-2" />

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex w-full items-center justify-center gap-2 p-3 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: '#FF696C' }}
        >
          <Trash2 className="h-4 w-4" />
          계정 탈퇴
        </button>
      </div>

      {/* Account deletion confirmation */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          showDeleteConfirm ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-destructive">계정 탈퇴</h3>
          <p className="text-xs text-muted-foreground">
            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              취소
            </button>
            <button
              onClick={async () => {
                setDeletingAccount(true);
                try {
                  const { error } = await supabase.rpc('delete_user_account' as any);
                  if (error) throw error;
                  await signOut();
                } catch (err: any) {
                  toast({ title: "탈퇴 실패", description: "다시 시도해주세요.", variant: "destructive" });
                  setDeletingAccount(false);
                }
              }}
              disabled={deletingAccount}
              className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deletingAccount ? "처리 중..." : "탈퇴하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
