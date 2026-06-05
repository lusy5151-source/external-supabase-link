import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CharacterAnimation, { CHARACTER_META, type Character } from "@/components/CharacterAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/context/StoreContext";
import { useSummitClaims } from "@/hooks/useSummitClaims";
import { useProfile } from "@/hooks/useProfile";
import { useUserXp } from "@/hooks/useUserXp";
import { useCharacterEmotion } from "@/hooks/useCharacterEmotion";
import { useFriends } from "@/hooks/useFriends";
import { useAchievementStore } from "@/hooks/useAchievementStore";
import { useGearStore } from "@/hooks/useGearStore";
import { useSharedCompletionCounts } from "@/hooks/useSharedCompletionCounts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, Users, Mountain, BookOpen, Settings, LogOut, HelpCircle, Bell, ShieldCheck, ExternalLink, Lock, UserCircle2 } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { useUnreadChat } from "@/contexts/UnreadChatContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { usePushNotification } from "@/hooks/usePushNotification";
import { usePlanNotifications } from "@/hooks/usePlanNotifications";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const menuItems = [
  { label: "프로필 설정", to: "/profile", icon: Settings },
  { label: "친구 관리", to: "/social", icon: Users },
  { label: "산악회", to: "/social", icon: Users },
  
  { label: "등산 계획", to: "/plans", icon: BookOpen },
];

const MyPage = () => {
  const { user, signOut } = useAuth();
  const { records, completedCount: localCompletedCount } = useStore();
  const { claimedIds } = useSummitClaims();
  // Merge localStorage records + Supabase summit claims (정상 인증)
  const completedCount = (() => {
    const ids = new Set<number>(claimedIds);
    records.forEach((r) => ids.add(r.mountainId));
    return ids.size || localCompletedCount;
  })();
  const { profile } = useProfile();
  const xpInfo = useUserXp();
  const charEmotion = useCharacterEmotion();
  const { friends } = useFriends();
  const { items: gearItems } = useGearStore();
  const sharedCompletions = useSharedCompletionCounts();
  const { earnedCount } = useAchievementStore(records, gearItems, sharedCompletions);
  const { unreadChatCount, isChatNotifEnabled, setChatNotifEnabled, isFriendActivityEnabled, setFriendActivityEnabled } = useUnreadChat();
  const { restartTutorial } = useTutorial();
  const { isGranted, isDenied, requestPermission } = usePushNotification();
  const { isDdayEnabled, setDdayEnabled } = usePlanNotifications();
  const { isAdmin, isSuperAdmin } = useAdmin();
  const nav = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [characterId, setCharacterId] = useState<Character | null>(() => {
    try {
      const cached = localStorage.getItem("wandeung_character_id");
      return (cached as Character) || null;
    } catch {
      return null;
    }
  });

  type CharRow = {
    id: string;
    name_ko: string;
    color: string | null;
    image_original: string | null;
    image_badge: string | null;
  };
  const [myChar, setMyChar] = useState<CharRow | null>(null);
  const [allChars, setAllChars] = useState<CharRow[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Record<string, string | null>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: profileRow }, { data: chars }, { data: badges }] = await Promise.all([
        (supabase as any).from("profiles").select("character_id").eq("user_id", user.id).single(),
        (supabase as any).from("characters").select("id, name_ko, color, image_original, image_badge").order("id"),
        (supabase as any).from("user_badges").select("character_id, earned_at").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const cid: string | null = profileRow?.character_id ?? null;
      if (cid) {
        setCharacterId(cid as Character);
        try { localStorage.setItem("wandeung_character_id", cid); } catch {}
      }
      const all = (chars as CharRow[]) || [];
      setAllChars(all);
      if (cid) setMyChar(all.find((c) => c.id === cid) || null);
      const map: Record<string, string | null> = {};
      ((badges as any[]) || []).forEach((b) => { if (b?.character_id) map[b.character_id] = b.earned_at ?? null; });
      setEarnedBadges(map);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const earnedIds = Object.keys(earnedBadges);
  const formatEarnedDate = (iso: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch { return ""; }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">로그인이 필요합니다</p>
        <Link to="/auth" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          로그인
        </Link>
      </div>
    );
  }

  const nickname = profile?.nickname || user.email?.split("@")[0] || "사용자";
  const avatarUrl = profile?.avatar_url;
  const friendCount = friends?.length || 0;

  return (
    <div className="max-w-lg mx-auto pb-24 space-y-5">
      {/* Profile header card */}
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
        <Avatar className="h-11 w-11">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-muted text-sm font-semibold">
            {nickname.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{nickname}</p>
          <Badge
            variant="secondary"
            className="mt-0.5 text-[10px] px-2 py-0 h-4 gap-1"
          >
            <Mountain className="h-2.5 w-2.5" />
            완등 {completedCount}개
          </Badge>
        </div>
        {myChar && (
          <button
            onClick={() => nav("/character-select")}
            className="flex flex-col items-center flex-shrink-0"
            style={{ gap: 2 }}
            aria-label="등산 메이트 변경"
          >
            {myChar.image_original ? (
              <img
                src={myChar.image_original}
                alt={myChar.name_ko}
                style={{ width: 52, height: 52, objectFit: "contain" }}
                loading="lazy"
              />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: myChar.color || "#EAF3DE" }} />
            )}
            <span style={{ fontSize: 11, color: "#3B6D11", fontWeight: 500 }}>{myChar.name_ko}</span>
          </button>
        )}
      </div>

      {/* Badge collection */}
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>나의 뱃지</span>
          <span style={{ fontSize: 12, color: "#3B6D11" }}>{earnedIds.length}/{Math.max(allChars.length, 7)} 수집</span>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {allChars.map((c) => {
            const earned = !!earnedBadges[c.id];
            const isActive = activeTooltip === c.id;
            return (
              <div key={c.id} className="flex flex-col items-center flex-shrink-0 relative" style={{ width: 64 }}>
                <button
                  onClick={() => setActiveTooltip(isActive ? null : c.id)}
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: earned ? "transparent" : (c.color || "#C7D66D"),
                    border: earned ? "2px solid #639922" : "none",
                    overflow: "hidden",
                    position: "relative",
                  }}
                  aria-label={earned ? `${c.name_ko} 뱃지` : "미획득 뱃지"}
                >
                  {earned ? (
                    c.image_badge ? (
                      <img
                        src={c.image_badge}
                        alt={c.name_ko}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        loading="lazy"
                      />
                    ) : (
                      <span style={{ fontSize: 18, color: "white" }}>{c.name_ko.charAt(0)}</span>
                    )
                  ) : (
                    <Lock style={{ width: 16, height: 16, color: "white", opacity: 0.7 }} />
                  )}
                </button>
                <span
                  style={{
                    fontSize: 10,
                    marginTop: 4,
                    color: earned ? "#27500A" : "hsl(var(--muted-foreground))",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {earned ? c.name_ko : "???"}
                </span>
                {isActive && (
                  <div
                    onClick={() => setActiveTooltip(null)}
                    style={{
                      position: "absolute",
                      top: 66,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(39,80,10,0.95)",
                      color: "white",
                      fontSize: 10,
                      padding: "6px 8px",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                      zIndex: 5,
                      lineHeight: 1.3,
                    }}
                  >
                    {earned
                      ? `${c.name_ko}${earnedBadges[c.id] ? ` · ${formatEarnedDate(earnedBadges[c.id])}` : ""}`
                      : "등산 메이트로 선택하면 획득해요"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Change hiking mate menu */}
      <button
        onClick={() => nav("/character-select")}
        className="flex items-center gap-3 w-full rounded-2xl bg-card px-4 py-3.5 transition-colors hover:bg-accent/50"
      >
        <UserCircle2 style={{ width: 18, height: 18, color: "hsl(var(--muted-foreground))" }} />
        <span className="flex-1 text-left text-sm font-medium text-foreground">등산 메이트 변경</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
      </button>

      {/* Character card */}
      {(() => {
        const charKey = (characterId || "oreumi") as Character;
        const meta = CHARACTER_META[charKey];
        const { level, name: lvName, xp, nextLevelMinXp, xpForNextLevel, xpIntoLevel, progressPct, isMax } = xpInfo;
        return (
          <div
            style={{
              background: "linear-gradient(135deg, #EAF3DE, #F8FAED, #E6F1FB)",
              border: "1.5px solid #C7D66D",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CharacterAnimation character={charKey} emotion={charEmotion} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-foreground">{meta.name}</span>
                <span className="text-[10px] text-muted-foreground">{meta.type}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xs font-bold" style={{ color: "#3B6D11" }}>
                  Lv.{level} {lvName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isMax ? `${xp} XP · MAX` : `${xpIntoLevel} / ${xpForNextLevel} XP`}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div style={{ width: `${progressPct}%`, height: "100%", background: "#C7D66D", transition: "width 0.3s" }} />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {isMax ? "MAX" : `다음 ${nextLevelMinXp - xp} XP`}
                </span>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "완등한 산", value: completedCount },
          { label: "친구", value: friendCount },
          { label: "업적", value: earnedCount },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-xl bg-card py-3"
          >
            <span className="text-lg font-bold text-foreground">{s.value}</span>
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Admin content management entry (top of menu, admin-only) */}
      {isAdmin && (
        <Link
          to="/admin/magazine"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-opacity hover:opacity-90"
          style={{ background: "#EAF3DE" }}
        >
          <ShieldCheck style={{ width: 16, height: 16, color: "#639922" }} />
          <span className="flex-1" style={{ fontSize: 14, color: "#639922", fontWeight: 600 }}>
            콘텐츠 관리
          </span>
          <ChevronRight style={{ width: 16, height: 16, color: "#639922" }} />
        </Link>
      )}

      {/* Menu list */}
      <div className="rounded-2xl bg-card overflow-hidden">
        {menuItems.map((item, idx) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50"
            style={{
              borderTop: idx > 0 ? "0.5px solid hsl(var(--border))" : undefined,
            }}
          >
            <item.icon className="h-4.5 w-4.5 text-muted-foreground" style={{ width: 18, height: 18 }} />
            <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
            {item.label === "산악회" && unreadChatCount > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 font-semibold text-white"
                style={{ fontSize: 11, background: "hsl(var(--brand-coral))", lineHeight: "14px" }}
              >
                {unreadChatCount}개 새 메시지
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </Link>
        ))}

        {/* Admin entry (only visible to admins) — separated by divider */}
        {isAdmin && (
          <>
            <div className="h-px bg-border" />
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3.5 bg-primary/5 transition-colors hover:bg-primary/10"
            >
              <ShieldCheck className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
              <span className="flex-1 text-sm font-semibold text-primary">
                관리자 페이지
              </span>
              <span className="text-[10px] font-medium text-primary/70 mr-1">
                {isSuperAdmin ? "최고 관리자" : "관리자"}
              </span>
              <ChevronRight className="h-4 w-4 text-primary/40" />
            </Link>
          </>
        )}
      </div>

      {/* Extra menu rows */}
      <div className="rounded-2xl bg-card overflow-hidden">
        {/* 알림 설정 */}
        <button
          onClick={() => {
            if (isDenied) {
              toast("브라우저 설정에서 알림을 허용해주세요", {
                description: "주소창 왼쪽 🔒 아이콘 → 사이트 설정 → 알림 → 허용",
              });
            } else if (!isGranted) {
              requestPermission();
            } else {
              setShowNotifSettings((p) => !p);
            }
          }}
          className="flex w-full items-center gap-3 px-4"
          style={{ height: 48 }}
        >
          <Bell style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))" }} />
          <span className="flex-1 text-left text-sm font-medium text-foreground">
            알림 설정
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: isGranted ? "#3B6D11" : "hsl(var(--muted-foreground))", marginRight: 4 }}
          >
            {isGranted ? "켜짐" : "꺼짐"}
          </span>
          <ChevronRight
            style={{
              width: 16, height: 16,
              color: "hsl(var(--muted-foreground) / 0.4)",
              transform: showNotifSettings ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        {/* Notification sub-settings */}
        {showNotifSettings && isGranted && (
          <div
            className="px-4 py-3 space-y-3"
            style={{ borderTop: "0.5px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">등산 계획 D-day 알림</p>
                <p className="text-xs text-muted-foreground mt-0.5">D-1 저녁, 당일 아침 알림</p>
              </div>
              <Switch
                checked={isDdayEnabled}
                onCheckedChange={(checked) => setDdayEnabled(checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">산악회 채팅 알림</p>
                <p className="text-xs text-muted-foreground mt-0.5">새 메시지가 올 때 알림</p>
              </div>
              <Switch
                checked={isChatNotifEnabled}
                onCheckedChange={(checked) => setChatNotifEnabled(checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">친구 활동 알림</p>
                <p className="text-xs text-muted-foreground mt-0.5">정상 인증, 등산일지 작성 알림</p>
              </div>
              <Switch
                checked={isFriendActivityEnabled}
                onCheckedChange={(checked) => setFriendActivityEnabled(checked)}
              />
            </div>
          </div>
        )}


        {/* 튜토리얼 다시 보기 */}
        <button
          onClick={() => {
            restartTutorial();
            nav("/auth");
          }}
          className="flex w-full items-center gap-3 px-4"
          style={{
            height: 48,
            borderTop: "0.5px solid hsl(var(--border))",
          }}
        >
          <HelpCircle style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground))" }} />
          <span className="flex-1 text-left text-sm font-medium text-foreground">
            튜토리얼 다시 보기
          </span>
          <ChevronRight style={{ width: 16, height: 16, color: "hsl(var(--muted-foreground) / 0.4)" }} />
        </button>
      </div>

      {/* Logout & Delete account */}
      <div className="space-y-0">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 transition-colors hover:bg-accent/50"
        >
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">로그아웃</span>
        </button>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full py-3 text-center"
          style={{ fontSize: 13, color: "hsl(var(--color-text-tertiary))" }}
        >
          회원 탈퇴
        </button>
      </div>

      {/* SNS Links */}
      <div>
        <p
          style={{
            fontSize: 12,
            color: "hsl(var(--color-text-tertiary))",
            marginBottom: 8,
          }}
        >
          완등 SNS
        </p>
        <button
          onClick={() => window.open("https://www.instagram.com/wan_deung.official", "_blank", "noopener,noreferrer")}
          className="flex items-center w-full"
          style={{ gap: 10, padding: "10px 0" }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 16, height: 16 }}
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              인스타그램
            </div>
            <div
              style={{
                fontSize: 11,
                color: "hsl(var(--color-text-tertiary))",
              }}
            >
              @wan_deung.official
            </div>
          </div>
          <ExternalLink
            style={{
              width: 14,
              height: 14,
              color: "hsl(var(--color-text-tertiary))",
              flexShrink: 0,
            }}
          />
        </button>
      </div>

      {/* Delete account confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 탈퇴하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              탈퇴 시 모든 완등 기록과 데이터가 삭제되며 복구할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <button
              onClick={() => {
                setShowDeleteDialog(false);
                toast("탈퇴가 완료되었습니다");
              }}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ background: "hsl(var(--brand-coral))" }}
            >
              탈퇴하기
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyPage;
