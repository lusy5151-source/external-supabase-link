import { useParams, Link } from "react-router-dom";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { useMountains } from "@/contexts/MountainsContext";
import { badges } from "@/data/badges";
import { JournalCard, JournalGridCard } from "@/components/JournalCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, User, MapPin, Mountain, BookOpen, Trophy,
  Calendar, Users, ChevronRight, Flag, Crown, Ban, MoreVertical, UserPlus, Check, Clock,
} from "lucide-react";
import { ContentMenu } from "@/components/ContentMenu";
import { useUserBlocks } from "@/hooks/useUserBlocks";
import { Button } from "@/components/ui/button";

const HIKING_STYLES = [
  { id: "solo", label: "솔로 등산", emoji: "🧍" },
  
  { id: "trekking", label: "트레킹", emoji: "🥾" },
  { id: "photography", label: "사진촬영", emoji: "📸" },
  { id: "summit", label: "정상 도전", emoji: "⛰️" },
  { id: "healing", label: "힐링 하이킹", emoji: "🌿" },
];

interface Profile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  hiking_styles: string[] | null;
}

const FriendProfilePage = () => {
  const { mountains } = useMountains();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { fetchUserJournals } = useHikingJournals();
  const { isBlocked, blockUser, unblockUser } = useUserBlocks();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [journals, setJournals] = useState<HikingJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<HikingJournal | null>(null);
  const [friendStatus, setFriendStatus] = useState<"self" | "friend" | "pending_sent" | "pending_received" | "none">("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [summitClaimCount, setSummitClaimCount] = useState(0);
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [leaderTitles, setLeaderTitles] = useState<string[]>([]);

  useEffect(() => {
    if (!userId || !user) return;

    const load = async () => {
      setLoading(true);
      setActivityLoading(true);
      setSelectedJournal(null);
      setLeaderTitles([]);

      try {
        const profilePromise = supabase
          .from("public_profiles")
          .select("user_id, nickname, avatar_url, bio, location, hiking_styles")
          .eq("user_id", userId)
          .maybeSingle();

        const friendshipPromise = user.id === userId
          ? Promise.resolve({ data: [], error: null } as any)
          : supabase
              .from("friendships")
              .select("id, requester_id, addressee_id, status")
              .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
              .limit(1);

        const journalsPromise = fetchUserJournals(userId);
        const claimsPromise = (supabase as any)
          .from("summit_claims")
          .select("id, mountain_id, summit_id, photo_url, claimed_at", { count: "exact" })
          .eq("user_id", userId)
          .not("photo_url", "is", null)
          .order("claimed_at", { ascending: false })
          .limit(6);

        const [profileResult, friendshipResult, journalData, claimsResult] = await Promise.all([
          profilePromise,
          friendshipPromise,
          journalsPromise,
          claimsPromise,
        ]);

        setProfile((profileResult.data as Profile | null) || null);

        const friendship = (friendshipResult.data || [])[0] as any;
        setFriendshipId(friendship?.id || null);
        if (user.id === userId) setFriendStatus("self");
        else if (friendship?.status === "accepted") setFriendStatus("friend");
        else if (friendship?.status === "pending" && friendship.requester_id === user.id) setFriendStatus("pending_sent");
        else if (friendship?.status === "pending" && friendship.addressee_id === user.id) setFriendStatus("pending_received");
        else setFriendStatus("none");

        setJournals(journalData);
        setSummitClaimCount(claimsResult.count || 0);

        const claimsData = (claimsResult.data as any[]) || [];
        if (claimsData.length > 0) {
          const summitIds = [...new Set(claimsData.map((c: any) => c.summit_id).filter(Boolean))];
          const { data: summitsData } = summitIds.length
            ? await (supabase as any).from("summits").select("id, summit_name").in("id", summitIds)
            : { data: [] };
          const summitMap = new Map((summitsData || []).map((s: any) => [s.id, s.summit_name]));
          setRecentClaims(claimsData.map((c: any) => ({
            ...c,
            summit_name: summitMap.get(c.summit_id) || "정상",
          })));
        } else {
          setRecentClaims([]);
        }
      } finally {
        setLoading(false);
        setActivityLoading(false);
      }
    };

    load();
  }, [userId, user, fetchUserJournals]);

  const handleFriendAction = async () => {
    if (!user || !userId || user.id === userId || friendActionLoading) return;
    setFriendActionLoading(true);
    try {
      if (friendStatus === "none") {
        const { data, error } = await supabase
          .from("friendships")
          .insert({ requester_id: user.id, addressee_id: userId })
          .select("id")
          .single();
        if (error) throw error;
        setFriendshipId((data as any)?.id || null);
        setFriendStatus("pending_sent");
      } else if (friendStatus === "pending_received" && friendshipId) {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", friendshipId);
        if (error) throw error;
        setFriendStatus("friend");
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const completedMountains = useMemo(() => {
    const ids = new Set(journals.map((j) => j.mountain_id));
    return ids.size;
  }, [journals]);

  const isFriend = friendStatus === "friend";

  const recentHike = useMemo(() => {
    if (journals.length === 0) return null;
    const j = journals[0];
    const m = mountains.find((mt) => mt.id === j.mountain_id);
    return { journal: j, mountain: m };
  }, [journals]);

  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">로그인이 필요합니다</p>
        <Link to="/auth" className="mt-2 inline-block text-sm text-primary hover:underline">로그인하기</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5 pb-24 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/social" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <User className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-muted-foreground">프로필을 찾을 수 없습니다</p>
        <Link to="/social" className="mt-2 inline-block text-sm text-primary hover:underline">돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/social" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">{profile.nickname || "사용자"}</h1>
          {isFriend && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">친구</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {userId && isBlocked(userId) ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => unblockUser.mutate(userId)}
            >
              차단 해제
            </Button>
          ) : userId ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-destructive hover:text-destructive"
              onClick={() => blockUser.mutate(userId)}
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              차단
            </Button>
          ) : null}
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <div className="mx-auto mb-3 h-20 w-20">
          {profile.avatar_url ? (
            <img
              src={normalizeImageUrl(profile.avatar_url)}
              alt="프로필"
              className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <User className="h-9 w-9 text-primary" />
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-foreground">{profile.nickname || "사용자"}</h2>
        {profile.bio && <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>}
        {profile.location && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {profile.location}
          </p>
        )}
        {profile.hiking_styles && profile.hiking_styles.length > 0 && (
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
        {friendStatus !== "self" && (
          <Button
            className="mt-4 rounded-xl gap-2"
            variant={friendStatus === "friend" ? "secondary" : "default"}
            disabled={friendActionLoading || friendStatus === "pending_sent" || friendStatus === "friend"}
            onClick={handleFriendAction}
          >
            {friendStatus === "friend" && <><Check className="h-4 w-4" /> 친구</>}
            {friendStatus === "pending_sent" && <><Clock className="h-4 w-4" /> 요청 보냄</>}
            {friendStatus === "pending_received" && <><Check className="h-4 w-4" /> 친구 요청 수락</>}
            {friendStatus === "none" && <><UserPlus className="h-4 w-4" /> 친구 추가</>}
          </Button>
        )}
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{activityLoading ? "…" : journals.length}</p>
          <p className="text-[9px] text-muted-foreground">등산 일지</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-primary">{activityLoading ? "…" : completedMountains}</p>
          <p className="text-[9px] text-muted-foreground">완등</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{activityLoading ? "…" : summitClaimCount}</p>
          <p className="text-[9px] text-muted-foreground">정상 정복</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">
            {activityLoading ? "…" : `${Math.round((completedMountains / Math.max(1, mountains.length)) * 100)}%`}
          </p>
          <p className="text-[9px] text-muted-foreground">진행률</p>
        </div>
      </div>

      {/* Mountain Leader Titles */}
      {leaderTitles.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 dark:border-amber-800/30 p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" /> 산 대장 타이틀
          </p>
          <div className="flex flex-wrap gap-1.5">
            {leaderTitles.map((title) => (
              <Badge key={title} variant="secondary" className="text-[10px] gap-1 bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300">
                👑 {title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recent Summit Claims */}
      {recentClaims.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-primary" /> 최근 정상 정복
          </p>
          <div className="grid grid-cols-3 gap-2">
            {recentClaims.slice(0, 6).map((claim: any) => {
              const mt = mountains.find((m) => m.id === claim.mountain_id);
              return (
                <div key={claim.id} className="space-y-1">
                  <img
                    src={claim.photo_url}
                    alt={claim.summit_name}
                    className="w-full aspect-square rounded-lg object-cover"
                    loading="lazy"
                  />
                  <p className="text-[10px] font-medium text-foreground truncate">{claim.summit_name}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(claim.claimed_at).toLocaleDateString("ko-KR")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Hike */}
      {recentHike && recentHike.mountain && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> 최근 등산
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mountain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{recentHike.mountain.nameKo}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(recentHike.journal.hiked_at).toLocaleDateString("ko-KR")}
                {recentHike.journal.course_name && ` · ${recentHike.journal.course_name}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Journal Posts Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">등산 일지</h3>
          <span className="text-xs text-muted-foreground">({journals.length})</span>
        </div>

        {journals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              {isFriend ? "아직 공유된 일지가 없습니다" : "친구만 볼 수 있는 일지입니다"}
            </p>
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
      </div>
    </div>
  );
};

export default FriendProfilePage;
