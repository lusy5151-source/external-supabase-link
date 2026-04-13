import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingJournals, type HikingJournal } from "@/hooks/useHikingJournals";
import { mountains } from "@/data/mountains";
import { badges } from "@/data/badges";
import { JournalCard, JournalGridCard } from "@/components/JournalCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, User, MapPin, Mountain, BookOpen, Trophy,
  Calendar, Users, ChevronRight, Flag, Crown, Ban, MoreVertical,
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
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { fetchUserJournals } = useHikingJournals();
  const { isBlocked, blockUser, unblockUser } = useUserBlocks();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [journals, setJournals] = useState<HikingJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJournal, setSelectedJournal] = useState<HikingJournal | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [summitClaimCount, setSummitClaimCount] = useState(0);
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [leaderTitles, setLeaderTitles] = useState<string[]>([]);

  useEffect(() => {
    if (!userId || !user) return;

    const load = async () => {
      setLoading(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      setProfile(profileData as Profile | null);

      // Check friendship
      const { data: friendship } = await supabase
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);
      setIsFriend((friendship || []).length > 0);

      // Fetch journals (RLS handles visibility)
      const data = await fetchUserJournals(userId);
      setJournals(data);

      // Fetch summit claims
      const { data: claimsData } = await supabase
        .from("summit_claims")
        .select("id, mountain_id, summit_id, photo_url, claimed_at")
        .eq("user_id", userId)
        .order("claimed_at", { ascending: false })
        .limit(6);
      setSummitClaimCount((claimsData as any[] || []).length);

      // Enrich recent claims with summit names
      if (claimsData && (claimsData as any[]).length > 0) {
        const summitIds = [...new Set((claimsData as any[]).map((c: any) => c.summit_id))];
        const { data: summitsData } = await supabase
          .from("summits")
          .select("id, summit_name")
          .in("id", summitIds);
        const summitMap = new Map((summitsData || []).map((s: any) => [s.id, s.summit_name]));
        setRecentClaims((claimsData as any[]).map((c: any) => ({
          ...c,
          summit_name: summitMap.get(c.summit_id) || "정상",
        })));
      }

      // Check mountain leader titles
      const { data: allClaims } = await supabase
        .from("summit_claims")
        .select("user_id, mountain_id")
        .order("claimed_at", { ascending: true });
      if (allClaims) {
        const mtMap = new Map<number, Map<string, number>>();
        (allClaims as any[]).forEach((c: any) => {
          if (!mtMap.has(c.mountain_id)) mtMap.set(c.mountain_id, new Map());
          const um = mtMap.get(c.mountain_id)!;
          um.set(c.user_id, (um.get(c.user_id) || 0) + 1);
        });
        const titles: string[] = [];
        mtMap.forEach((userMap, mtId) => {
          let topUser = "";
          let topCount = 0;
          userMap.forEach((count, uid) => {
            if (count > topCount) { topUser = uid; topCount = count; }
          });
          if (topUser === userId) {
            const mt = mountains.find((m) => m.id === mtId);
            if (mt) titles.push(`${mt.nameKo} 대장`);
          }
        });
        setLeaderTitles(titles);
      }

      setLoading(false);
    };

    load();
  }, [userId, user]);

  const completedMountains = useMemo(() => {
    const ids = new Set(journals.map((j) => j.mountain_id));
    return ids.size;
  }, [journals]);

  const sharedHikes = useMemo(
    () => journals.filter((j) => j.tagged_friends && j.tagged_friends.length > 0).length,
    [journals]
  );

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
              src={profile.avatar_url}
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
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{journals.length}</p>
          <p className="text-[9px] text-muted-foreground">등산 일지</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-primary">{completedMountains}</p>
          <p className="text-[9px] text-muted-foreground">완등</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">{summitClaimCount}</p>
          <p className="text-[9px] text-muted-foreground">정상 정복</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground">
            {Math.round((completedMountains / mountains.length) * 100)}%
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