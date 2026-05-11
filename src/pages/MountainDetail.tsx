import { useParams, Link, useSearchParams } from "react-router-dom";
import { mountains as staticMountains } from "@/data/mountains";
import type { Mountain } from "@/data/mountains";
import { useMountains } from "@/contexts/MountainsContext";
import { useUserMountains, toMountain } from "@/hooks/useUserMountains";
import { usePioneerBadges } from "@/hooks/usePioneerBadges";
import DuplicateReportModal from "@/components/DuplicateReportModal";
import { useStore } from "@/context/StoreContext";
import { SummitClaimSection } from "@/components/SummitClaimSection";
import { useSummits } from "@/hooks/useSummits";
import { useMountains as useMountainsCtx } from "@/contexts/MountainsContext";
import { createPortal } from "react-dom";
import SummitMarkerMap from "@/components/SummitMarkerMap";
import {
  ArrowLeft, Mountain as MountainIcon, MapPin, TrendingUp, CheckCircle2, Circle, Calendar,
  Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudSun, ImagePlus, X, Users,
  Clock, Route, Flag, Save, UserPlus, UserMinus, Globe, Lock, Upload, User,
  Heart, Share2, Check, Camera,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import type { WeatherCondition, CompletionRecord } from "@/hooks/useMountainStore";
import { WeatherCard } from "@/components/WeatherCard";
import { TrailInfoSection } from "@/components/TrailInfo";
import { NearbyPlaces } from "@/components/NearbyPlaces";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingJournals } from "@/hooks/useHikingJournals";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";

const weatherOptions: { value: WeatherCondition; label: string; icon: any }[] = [
  { value: "맑음", label: "맑음", icon: Sun },
  { value: "구름", label: "구름 조금", icon: CloudSun },
  { value: "흐림", label: "흐림", icon: Cloud },
  { value: "비", label: "비", icon: CloudRain },
  { value: "눈", label: "눈", icon: CloudSnow },
  { value: "안개", label: "안개", icon: CloudFog },
];

const difficultyOptions = [
  { value: "쉬움", label: "쉬움", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "보통", label: "보통", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "어려움", label: "어려움", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

async function resizeImage(file: File): Promise<string> {
  const { compressImageToDataUrl } = await import("@/lib/imageUpload");
  const result = await compressImageToDataUrl(file, "general");
  if (result) return result;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.readAsDataURL(file);
  });
}

const MountainDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { userMountains } = useUserMountains();
  const { getMountain, isLoading: mountainsLoading } = useMountains();

  const mountainId = Number(id);
  const dbMountain = getMountain(mountainId);
  const userMountainRow = !dbMountain ? userMountains.find((m) => m.mountain_id === mountainId) : null;
  const mountain = dbMountain || (userMountainRow ? toMountain(userMountainRow) : null);
  const isUserCreated = !!(mountain as any)?.isUserCreated;
  const createdBy = (mountain as any)?.createdBy as string | undefined;

  const {
    isCompleted, toggleComplete, addCompletion, getRecord, getCompletionCount,
    updateNotes, updateDate, updateWeather, addPhotos, removePhoto,
    updateTaggedFriends, updateCourseInfo, updateDuration, updateDifficulty,
  } = useStore();

  const { user } = useAuth();

  // Also fetch certified summit count from Supabase summit_claims
  const [certifiedCount, setCertifiedCount] = useState(0);
  useEffect(() => {
    if (!mountain || !user) return;
    supabase
      .from("summit_claims")
      .select("id", { count: "exact", head: true })
      .eq("mountain_id", mountain.id)
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (count && count > 0) setCertifiedCount(count);
      });
  }, [mountain?.id, user?.id]);

  // Lazy-load heavy detail-only fields (overview/description/address) which
  // are stripped from the global mountains list to keep initial load fast.
  const [detailFields, setDetailFields] = useState<{ overview?: string; description?: string; address?: string } | null>(null);
  useEffect(() => {
    if (!mountain?.id) return;
    let cancelled = false;
    supabase
      .from("mountains")
      .select("overview, description, address")
      .eq("id", mountain.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDetailFields({
          overview: (data as any).overview || "",
          description: (data as any).description || "",
          address: (data as any).address || "",
        });
      });
    return () => { cancelled = true; };
  }, [mountain?.id]);

  // Auto-scroll to journal section when ?focusJournal=1
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("focusJournal") !== "1") return;
    const tryScroll = (attempt = 0) => {
      const el = document.getElementById("mountain-journal-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempt < 10) {
        setTimeout(() => tryScroll(attempt + 1), 200);
      }
    };
    tryScroll();
  }, [searchParams, mountain?.id]);


  // Fetch creator profile for user-created mountains
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [showDuplicateReport, setShowDuplicateReport] = useState(false);
  const { pioneerBadges } = usePioneerBadges(createdBy);

  useEffect(() => {
    if (!createdBy) return;
    supabase.from("profiles").select("nickname").eq("user_id", createdBy).single().then(({ data }) => {
      setCreatorName(data?.nickname || "사용자");
    });
  }, [createdBy]);

  if (!mountain) {
    if (mountainsLoading) {
      return (
        <div className="py-20 text-center">
          <p className="text-muted-foreground animate-pulse">산 정보를 불러오는 중...</p>
        </div>
      );
    }
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">산을 찾을 수 없습니다</p>
        <Link to="/mountains" className="mt-2 inline-block text-sm text-primary hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const completed = isCompleted(mountain.id) || certifiedCount > 0;
  const record = getRecord(mountain.id);
  const completionCount = Math.max(getCompletionCount(mountain.id), certifiedCount);

  const [activeTab, setActiveTab] = useState<"개요" | "코스" | "날씨" | "편의시설">("개요");
  const tabs = ["개요", "코스", "날씨", "편의시설"] as const;

  const getDifficultyColor = (d: string) => {
    if (d === "쉬움") return "bg-green-500";
    if (d === "어려움") return "bg-red-500";
    return "bg-amber-500";
  };

  const imageUrl = (mountain as any).image_url as string | null;
  const isBlackyak = (mountain as any).is_bac100_blackyak;
  const isBac100 = (mountain as any).is_bac100;
  const isNP = (mountain as any).is_national_park;
  const npName = (mountain as any).national_park_name;
  const address = detailFields?.address ?? (mountain as any).address;

  const diffStyle =
    mountain.difficulty === "쉬움" ? { background: "#EAF3DE", color: "#173404" } :
    mountain.difficulty === "어려움" ? { background: "#FCEBEB", color: "#501313" } :
    { background: "#FAEEDA", color: "#412402" };

  const bannerHeight = imageUrl ? 220 : 150;

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#e6ede0" }}>

      {/* ── 배너 ── */}
      <div
        style={{
          margin: "12px 12px 0",
          height: bannerHeight,
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 60%, #4a7ba8 100%)",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={mountain.nameKo}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
          />
        )}
        {!imageUrl && (
          <svg viewBox="0 0 380 100" preserveAspectRatio="none"
               style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 75, opacity: 0.5 }}>
            <path d="M0 100 L50 55 L95 75 L150 30 L195 60 L240 38 L290 65 L340 45 L380 55 L380 100 Z"
                  fill="rgba(255,255,255,0.1)"/>
            <path d="M0 100 L70 65 L120 45 L175 70 L225 50 L275 75 L325 55 L380 70 L380 100 Z"
                  fill="rgba(255,255,255,0.16)"/>
          </svg>
        )}

        {/* 상단 버튼 줄 */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <Link to="/mountains"
                style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              aria-label="좋아요"
              style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", border: "none" }}
            >
              <Heart size={15} />
            </button>
            <button
              aria-label="공유"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: mountain.nameKo, url: window.location.href }).catch(() => {});
                }
              }}
              style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", border: "none" }}
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* 산 이름 */}
        <div style={{ position: "absolute", bottom: 14, left: 14, zIndex: 2 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", margin: 0 }}>{mountain.nameKo}</h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 3, margin: 0 }}>
            {mountain.name}{mountain.region ? ` · ${mountain.region}` : ""}
          </p>
        </div>

        {/* 배지 */}
        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", zIndex: 2 }}>
          {isBlackyak && (
            <span style={{ background: "white", color: "#633806", border: "0.5px solid #FAC775", fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
              100대 명산
            </span>
          )}
          {isBac100 && (
            <span style={{ background: "white", color: "#173404", border: "0.5px solid #c6d56c", fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
              산림청 100대 명산
            </span>
          )}
          {isNP && npName && (
            <span style={{ background: "white", color: "#04342C", border: "0.5px solid #9FE1CB", fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
              {npName}
            </span>
          )}
        </div>
      </div>

      {/* ── 정보 카드 (높이/난이도/소요) ── */}
      <div style={{ background: "white", borderRadius: 16, margin: "10px 12px 8px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "12px 4px" }}>
        <div style={{ textAlign: "center", borderRight: "0.5px solid #f1efe8" }}>
          <MountainIcon size={14} color="#888780" strokeWidth={2} style={{ display: "inline-block" }} />
          <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>높이</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#173404", marginTop: 2 }}>{mountain.height}m</div>
        </div>
        <div style={{ textAlign: "center", borderRight: "0.5px solid #f1efe8" }}>
          <TrendingUp size={14} color="#888780" strokeWidth={2} style={{ display: "inline-block" }} />
          <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>난이도</div>
          <div style={{ marginTop: 2 }}>
            <span style={{ ...diffStyle, fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 6, display: "inline-block" }}>
              {mountain.difficulty}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <Clock size={14} color="#888780" strokeWidth={2} style={{ display: "inline-block" }} />
          <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>소요</div>
          <div style={{ fontSize: 11, color: "#aaa", fontStyle: "italic", marginTop: 2 }}>정보 없음</div>
        </div>
      </div>

      {/* ── 탭바 (알약형) ── */}
      <div style={{ background: "#f7faf2", borderRadius: 14, padding: 3, margin: "12px 12px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 4px",
                textAlign: "center",
                fontSize: 11,
                cursor: "pointer",
                background: active ? "#c6d56c" : "transparent",
                borderRadius: active ? 11 : 0,
                color: active ? "#173404" : "#666",
                fontWeight: active ? 600 : 400,
                border: "none",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div className="flex-1">

        {/* 개요 탭 */}
        {activeTab === "개요" && (
          <>
            {/* 1. 산 소개 */}
            <OverviewIntroCard text={detailFields?.overview || detailFields?.description || (mountain as any).overview || mountain.description || "소개 정보가 없습니다."} />

            {/* 2. 정상 정복 (그리드 + 접기) */}
            <div style={sectionCardStyle}>
              <SummitGridSection mountainId={mountain.id} mountainName={mountain.nameKo} />
            </div>

            {/* 3. 위치 */}
            <OverviewLocationBlock mountain={mountain} address={address} />


            {/* 4. 등산 일지 (완등 기록 있을 때만) */}
            {completed && record && (
              <div id="mountain-journal-section" style={{ margin: "0 12px 10px", scrollMarginTop: 80 }}>
                <JournalSection
                  record={record}
                  mountainId={mountain.id}
                  mountainName={mountain.nameKo}
                  mountainTrails={mountain.trails}
                  updateNotes={updateNotes}
                  updateDate={updateDate}
                  updateWeather={updateWeather}
                  addPhotos={addPhotos}
                  removePhoto={removePhoto}
                  updateTaggedFriends={updateTaggedFriends}
                  updateCourseInfo={updateCourseInfo}
                  updateDuration={updateDuration}
                  updateDifficulty={updateDifficulty}
                />
              </div>
            )}

            {/* 5. 공유 카드 (완등 기록 있을 때만) */}
            {completed && record && (
              <div style={{ margin: "0 12px 10px" }}>
                <ShareCardSection
                  mountain={mountain}
                  record={record}
                />
              </div>
            )}

            {/* 사용자 등록 산 관련 */}
            {isUserCreated && creatorName && (
              <div style={{ background: "white", borderRadius: 16, padding: 12, margin: "0 12px 8px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#666" }}>
                <User size={14} />
                <span>등록자: {creatorName}</span>
              </div>
            )}
            {isUserCreated && (
              <div style={{ margin: "0 12px 8px" }}>
                <button
                  onClick={() => setShowDuplicateReport(true)}
                  style={{ width: "100%", fontSize: 11, color: "#888", textAlign: "center", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  이 산은 이미 목록에 있어요
                </button>
                <DuplicateReportModal
                  reportedMountainId={mountainId}
                  open={showDuplicateReport}
                  onOpenChange={setShowDuplicateReport}
                />
              </div>
            )}
          </>
        )}

        {/* 코스 탭 */}
        {activeTab === "코스" && (
          <div style={{ margin: "0 12px" }}>
            <TrailInfoSection mountainId={mountain.id} fallbackTrails={mountain.trails} />
          </div>
        )}

        {/* 날씨 탭 */}
        {activeTab === "날씨" && (
          <div style={{ margin: "0 12px" }}>
            <WeatherCard mountainId={mountain.id} />
          </div>
        )}

        {/* 편의시설 탭 */}
        {activeTab === "편의시설" && (
          <div style={{ margin: "0 12px" }}>
            <NearbyPlaces lat={mountain.lat} lng={mountain.lng} mountainName={mountain.nameKo} />
          </div>
        )}

      </div>
    </div>
  );
};

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

// ───────────── Shared section styles ─────────────
const sectionCardStyle: React.CSSProperties = {
  background: "white",
  border: "none",
  borderRadius: 12,
  padding: 12,
  margin: "0 12px 10px",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#173404",
  borderLeft: "2.5px solid #C7D66D",
  paddingLeft: 7,
  marginBottom: 8,
  marginTop: 0,
};

// ───────────── 1. 산 소개 카드 (3줄 + 더보기) ─────────────
function OverviewIntroCard({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    // Measure overflow only when collapsed
    if (!expanded) {
      setOverflow(el.scrollHeight > el.clientHeight + 1);
    }
  }, [text, expanded]);

  return (
    <div style={sectionCardStyle}>
      <h2 style={sectionTitleStyle}>산 소개</h2>
      <p
        ref={pRef}
        style={{
          fontSize: 12,
          color: "#444",
          lineHeight: 1.6,
          margin: 0,
          display: expanded ? "block" : "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : 3,
          WebkitBoxOrient: "vertical" as any,
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {(overflow || expanded) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 6,
            background: "transparent",
            border: "none",
            color: "#4F7A3A",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "▴ 접기" : "더 보기 ▾"}
        </button>
      )}
    </div>
  );
}

// ───────────── 3. 위치 + 봉우리 마커 지도 ─────────────
function OverviewLocationBlock({ mountain, address }: { mountain: any; address: string }) {
  const { summits, claims } = useSummits(mountain?.id);
  const { user } = useAuth();
  const summitsWithStatus = useMemo(
    () =>
      summits.map((s) => ({
        ...s,
        isCompleted: claims.some((c) => c.summit_id === s.id && c.user_id === user?.id),
      })),
    [summits, claims, user?.id]
  );
  if (!mountain) return null;
  return (
    <div style={sectionCardStyle}>
      <h2 style={sectionTitleStyle}>위치</h2>
      {address && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, flex: 1, lineHeight: 1.5 }}>{address}</p>
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(mountain.nameKo)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#03C75A", color: "white", fontSize: 11, fontWeight: 600,
              padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
            }}
          >
            <MapPin size={11} /> 네이버지도
          </a>
        </div>
      )}
      <SummitMarkerMap
        mountain={{ lat: mountain.lat, lng: mountain.lng, nameKo: mountain.nameKo }}
        summits={summitsWithStatus as any}
      />
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: "#666" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "#C7D66D", color: "#173404", fontSize: 9, fontWeight: 700 }}>▲</span>
          미정복 봉우리
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "#FF696C", color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>
          정복한 봉우리
        </span>
      </div>
    </div>
  );
}

// ───────────── 2. 정상 정복 그리드 ─────────────
function SummitGridSection({ mountainId, mountainName }: { mountainId: number; mountainName: string }) {
  const { user } = useAuth();
  const { mountains: allMountains } = useMountainsCtx();
  const { summits, claims, loading } = useSummits(mountainId);
  const [expanded, setExpanded] = useState(false);
  const [triggerSummitId, setTriggerSummitId] = useState<string | null>(null);

  const mData = useMemo(() => allMountains.find((m) => m.id === mountainId), [allMountains, mountainId]);

  const displaySummits = useMemo(() => {
    if (summits.length > 0) return summits;
    if (!mData) return [];
    return [{
      id: `fallback-${mountainId}`,
      mountain_id: mountainId,
      summit_name: `${mountainName} 정상`,
      latitude: mData.lat,
      longitude: mData.lng,
      elevation: mData.height,
    }];
  }, [summits, mountainId, mountainName, mData]);

  const myClaimedIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(claims.filter((c) => c.user_id === user.id).map((c) => c.summit_id));
  }, [claims, user]);

  const conqueredCount = displaySummits.filter((s) => myClaimedIds.has(s.id)).length;
  const visible = expanded ? displaySummits : displaySummits.slice(0, 6);
  const remaining = displaySummits.length - 6;

  if (loading) return <p style={{ fontSize: 11, color: "#999", margin: 0 }}>불러오는 중...</p>;
  if (displaySummits.length === 0) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>정상 정복</h2>
        <span style={{ fontSize: 11, color: "#888780", fontWeight: 600 }}>
          {conqueredCount} / {displaySummits.length}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
        {visible.map((s) => {
          const claimed = myClaimedIds.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => setTriggerSummitId(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: claimed ? "rgba(199,214,109,0.12)" : "#fafbf6",
                border: claimed ? "0.5px solid #C7D66D" : "none",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                minHeight: 44,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "1.5px solid #C7D66D",
                  background: claimed ? "#C7D66D" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {claimed && <Check size={11} color="#173404" strokeWidth={3} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#173404", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.summit_name}
                </span>
                <span style={{ fontSize: 10, color: "#888780" }}>{s.elevation}m</span>
              </span>
            </button>
          );
        })}
      </div>

      {displaySummits.length > 6 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 8,
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#4F7A3A",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            padding: "6px 0",
          }}
        >
          {expanded ? "▴ 접기" : `+${remaining}개 더 보기 ▾`}
        </button>
      )}

      {/* Reuse existing claim flow (dialog/celebration) without rendering its own list */}
      <SummitClaimSection
        mountainId={mountainId}
        mountainName={mountainName}
        hideList
        triggerSummitId={triggerSummitId}
        onTriggerHandled={() => setTriggerSummitId(null)}
      />
    </>
  );
}

// ───────────── 5. 공유 카드 섹션 ─────────────
function ShareCardSection({ mountain, record }: { mountain: Mountain; record: CompletionRecord }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgPhoto, setBgPhoto] = useState<string | null>(record.photos?.[0] || (mountain as any).image_url || null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  const { claims } = useSummits(mountain.id);
  const { toast } = useToast();

  const myClaim = useMemo(
    () => claims.find((c) => c.user_id === user?.id),
    [claims, user]
  );

  // Resolve a peak name from claims (best effort), fallback to "{산이름} 정상"
  const conqueredPeak = useMemo(() => {
    if (!myClaim) return `${mountain.nameKo} 정상`;
    return `${mountain.nameKo} 정상`;
  }, [myClaim, mountain.nameKo]);

  const dateStr = (record.completedAt || new Date().toISOString()).slice(0, 10);
  const formattedDate = new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const handlePick = (capture?: boolean) => {
    if (!fileInputRef.current) return;
    if (capture) fileInputRef.current.setAttribute("capture", "environment");
    else fileInputRef.current.removeAttribute("capture");
    fileInputRef.current.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setBgPhoto(r.result as string);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const handleExport = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const node = cardRef.current;
      // Render at full 1080x1920
      const rect = node.getBoundingClientRect();
      const scale = 1080 / rect.width;
      const canvas = await html2canvas(node, {
        scale,
        useCORS: true,
        backgroundColor: null,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("blob fail");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `완등_${mountain.nameKo}_${dateStr}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "이미지 저장 완료" });
    } catch (err) {
      console.error(err);
      toast({ title: "저장 실패", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      const scale = 1080 / rect.width;
      const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: null });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], `완등_${mountain.nameKo}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${mountain.nameKo} 완등`, files: [file] });
      } else {
        handleExport();
      }
    } catch (err) { console.error(err); }
  };

  // Reusable card renderer (used both for thumb and modal — use one shared ref so html2canvas reads modal-sized version when open, otherwise thumb)
  const Card = ({ innerRef, onClick }: { innerRef?: React.Ref<HTMLDivElement>; onClick?: () => void }) => (
    <div
      ref={innerRef}
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "9 / 16",
        borderRadius: 14,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        background: bgPhoto ? "#000" : "linear-gradient(160deg, #013F92, #2F403A)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
      }}
    >
      {bgPhoto && (
        <img
          src={bgPhoto}
          alt=""
          crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {bgPhoto && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)" }} />
      )}

      {/* Top-left logo */}
      <div style={{ position: "absolute", top: "5%", left: "6%", color: "white", fontSize: "5%", fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "5.5%" }}>🏔</span>
        <span>완등</span>
      </div>

      {/* Bottom block */}
      <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "5%", color: "white" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: "3%", flexWrap: "wrap" }}>
          {(mountain as any).is_bac100_blackyak && (
            <span style={{ fontSize: "2.2%", padding: "1.5% 3%", borderRadius: 999, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>100대 명산</span>
          )}
          {(mountain as any).is_bac100 && (
            <span style={{ fontSize: "2.2%", padding: "1.5% 3%", borderRadius: 999, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>산림청 100대</span>
          )}
        </div>
        <h3 style={{ fontSize: "9%", fontWeight: 800, margin: 0, lineHeight: 1.05, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          {mountain.nameKo}
        </h3>
        <p style={{ fontSize: "3.5%", margin: "1% 0 0", opacity: 0.9, fontWeight: 500 }}>{mountain.height}m</p>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "5%", fontSize: "3%" }}>
          <span style={{ display: "inline-flex", width: "4%", height: "4%", borderRadius: "50%", background: "#C7D66D", alignItems: "center", justifyContent: "center", color: "#173404", fontWeight: 800 }}>✓</span>
          <span style={{ fontWeight: 600 }}>{conqueredPeak}</span>
        </div>

        <p style={{ fontSize: "2.8%", margin: "3% 0 0", opacity: 0.8 }}>{formattedDate}</p>

        <div style={{ height: 1, background: "rgba(255,255,255,0.3)", margin: "4% 0 2%" }} />
        <p style={{ fontSize: "2.3%", margin: 0, opacity: 0.75, lineHeight: 1.3 }}>
          완등으로 기록하기<br />wandeung.com
        </p>
      </div>
    </div>
  );

  return (
    <div style={sectionCardStyle}>
      <h2 style={sectionTitleStyle}>📤 공유 카드</h2>

      {/* Thumbnail (clickable). When modal open we move ref into modal so export uses larger size */}
      <div style={{ maxWidth: 220, margin: "0 auto" }}>
        {!open ? (
          <div ref={cardRef}>
            <Card onClick={() => setOpen(true)} />
          </div>
        ) : (
          // Placeholder while modal is open
          <div style={{ aspectRatio: "9 / 16", borderRadius: 14, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 11 }}>
            전체화면에서 보는 중
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10 }}>
        <button onClick={() => handlePick(true)} style={shareBtnStyle}>
          <Camera size={13} /> 카메라
        </button>
        <button onClick={() => handlePick(false)} style={shareBtnStyle}>
          <ImagePlus size={13} /> 갤러리
        </button>
        <button onClick={handleExport} disabled={exporting} style={{ ...shareBtnStyle, background: "#C7D66D", color: "#173404", borderColor: "#C7D66D" }}>
          <Save size={13} /> {exporting ? "저장 중" : "이미지 저장"}
        </button>
      </div>

      {/* Fullscreen modal */}
      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.18)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="닫기"
          >
            <X size={18} />
          </button>

          <div onClick={(e) => e.stopPropagation()} style={{ height: "85vh", aspectRatio: "9 / 16", maxWidth: "92vw" }}>
            <div ref={cardRef} style={{ height: "100%" }}>
              <Card />
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: 14, width: "min(92vw, 360px)" }}>
            <button onClick={handleExport} disabled={exporting} style={{ ...shareBtnStyle, flex: 1, height: 44, background: "#C7D66D", color: "#173404", borderColor: "#C7D66D", fontSize: 13 }}>
              <Save size={14} /> {exporting ? "저장 중" : "이미지 저장"}
            </button>
            <button onClick={handleShare} style={{ ...shareBtnStyle, flex: 1, height: 44, background: "white", color: "#173404", fontSize: 13 }}>
              <Share2 size={14} /> 공유하기
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const shareBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "8px 6px",
  borderRadius: 10,
  border: "none",
  background: "white",
  color: "#173404",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};


function JournalSection({
  record,
  mountainId,
  mountainName,
  mountainTrails,
  updateNotes,
  updateDate,
  updateWeather,
  addPhotos,
  removePhoto,
  updateTaggedFriends,
  updateCourseInfo,
  updateDuration,
  updateDifficulty,
}: {
  record: CompletionRecord;
  mountainId: number;
  mountainName: string;
  mountainTrails?: { name: string; distance: string; duration: string; startingPoint: string }[];
  updateNotes: (id: number, notes: string) => void;
  updateDate: (id: number, date: string) => void;
  updateWeather: (id: number, weather: WeatherCondition) => void;
  addPhotos: (id: number, photos: string[]) => void;
  removePhoto: (id: number, index: number) => void;
  updateTaggedFriends: (id: number, friends: string[]) => void;
  updateCourseInfo: (id: number, course: { courseName?: string; courseStartingPoint?: string; courseNotes?: string }) => void;
  updateDuration: (id: number, duration: string) => void;
  updateDifficulty: (id: number, difficulty: string) => void;
}) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const { toast } = useToast();
  const { createJournal, uploadPhoto } = useHikingJournals();

  const [notes, setNotes] = useState(record.notes);
  const [date, setDate] = useState(record.completedAt.slice(0, 10));
  const [courseName, setCourseName] = useState(record.courseName || "");
  const [courseStartingPoint, setCourseStartingPoint] = useState(record.courseStartingPoint || "");
  const [courseNotes, setCourseNotes] = useState(record.courseNotes || "");
  const [duration, setDuration] = useState(record.duration || "");
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const [publishing, setPublishing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState<Map<string, { nickname: string | null; avatar_url: string | null }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = record.photos || [];
  const taggedFriends = record.taggedFriends || [];

  useEffect(() => {
    setNotes(record.notes);
    setDate(record.completedAt.slice(0, 10));
    setCourseName(record.courseName || "");
    setCourseStartingPoint(record.courseStartingPoint || "");
    setCourseNotes(record.courseNotes || "");
    setDuration(record.duration || "");
  }, [record]);

  // Load profiles for tagged friends
  useEffect(() => {
    if (taggedFriends.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", taggedFriends)
      .then(({ data }) => {
        if (data) {
          setFriendProfiles(new Map(data.map((p) => [p.user_id, p])));
        }
      });
  }, [taggedFriends]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const resized = await Promise.all(files.map((f) => resizeImage(f)));
    addPhotos(mountainId, resized);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTagFriend = async (friendUserId: string) => {
    const newTagged = [...taggedFriends, friendUserId];
    updateTaggedFriends(mountainId, newTagged);

    if (user) {
      await supabase.from("plan_notifications").insert({
        user_id: friendUserId,
        plan_id: "00000000-0000-0000-0000-000000000000",
        type: "tag",
        message: `${mountainName} 등산 일지에 함께한 친구로 태그되었습니다 🏔️`,
      } as any);
    }

    toast({ title: "친구를 태그했습니다" });
  };

  const handleUntagFriend = (friendUserId: string) => {
    updateTaggedFriends(mountainId, taggedFriends.filter((id) => id !== friendUserId));
  };

  const handleSelectTrail = (trail: { name: string; startingPoint: string }) => {
    setCourseName(trail.name);
    setCourseStartingPoint(trail.startingPoint);
    updateCourseInfo(mountainId, { courseName: trail.name, courseStartingPoint: trail.startingPoint });
  };

  const handleSave = () => {
    updateNotes(mountainId, notes);
    updateCourseInfo(mountainId, { courseName, courseStartingPoint, courseNotes });
    updateDuration(mountainId, duration);
    toast({ title: "일지가 저장되었습니다 ✅" });
  };

  const handlePublish = async () => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }
    setPublishing(true);
    // Save locally first
    handleSave();

    const { error } = await createJournal({
      mountain_id: mountainId,
      course_name: courseName || undefined,
      course_starting_point: courseStartingPoint || undefined,
      course_notes: courseNotes || undefined,
      duration: duration || undefined,
      difficulty: record.difficulty || undefined,
      weather: record.weather || undefined,
      notes: notes || undefined,
      photos: photos.length > 0 ? photos : undefined,
      tagged_friends: taggedFriends.length > 0 ? taggedFriends : undefined,
      visibility,
      hiked_at: date,
    });
    setPublishing(false);

    if (error) {
      toast({ title: "게시 실패", description: (error as any).message, variant: "destructive" });
    } else {
      toast({ title: "일지가 피드에 게시되었습니다! 🎉" });
    }
  };

  const untaggedFriends = friends.filter(
    (f) => !taggedFriends.includes(f.friendProfile.user_id)
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">등산 일지</h2>
            <p className="text-xs text-muted-foreground">{mountainName}에서의 기억</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> 저장
        </Button>
      </div>

      {/* Date */}
      <div>
        <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          방문 날짜
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            updateDate(mountainId, e.target.value);
          }}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Course Info */}
      <div className="space-y-3">
        <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Route className="h-3.5 w-3.5" />
          등산 코스
        </label>

        {/* Quick select from mountain trails */}
        {mountainTrails && mountainTrails.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mountainTrails.map((trail) => (
              <button
                key={trail.name}
                onClick={() => handleSelectTrail(trail)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  courseName === trail.name
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {trail.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              onBlur={() => updateCourseInfo(mountainId, { courseName })}
              placeholder="코스 이름"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={courseStartingPoint}
                onChange={(e) => setCourseStartingPoint(e.target.value)}
                onBlur={() => updateCourseInfo(mountainId, { courseStartingPoint })}
                placeholder="출발지점"
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <textarea
          rows={2}
          value={courseNotes}
          onChange={(e) => setCourseNotes(e.target.value)}
          onBlur={() => updateCourseInfo(mountainId, { courseNotes })}
          placeholder="코스 관련 메모 (선택)"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Duration */}
      <div>
        <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          소요 시간
        </label>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={() => updateDuration(mountainId, duration)}
          placeholder="예: 3시간 30분"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">체감 난이도</label>
        <div className="flex gap-2">
          {difficultyOptions.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => updateDifficulty(mountainId, record.difficulty === value ? "" : value)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                record.difficulty === value
                  ? `${color} ring-1 ring-current/20`
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">날씨</label>
        <div className="flex flex-wrap gap-2">
          {weatherOptions.map(({ value, label, icon: Icon }) => {
            const selected = record.weather === value;
            return (
              <button
                key={value}
                onClick={() => updateWeather(mountainId, selected ? "" : value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  selected
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tagged Friends */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            함께한 친구
          </label>
          {user && friends.length > 0 && (
            <button
              onClick={() => setShowFriendPicker(!showFriendPicker)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <UserPlus className="h-3 w-3" /> 태그하기
            </button>
          )}
        </div>

        {taggedFriends.length > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 mb-2">
            <p className="text-xs text-primary font-medium mb-2">
              🤝 {mountainName}을 함께 완등했습니다
            </p>
            <div className="flex flex-wrap gap-2">
              {taggedFriends.map((fId) => {
                const profile = friendProfiles.get(fId);
                return (
                  <div key={fId} className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">{profile?.nickname?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground">{profile?.nickname || "친구"}</span>
                    <button
                      onClick={() => handleUntagFriend(fId)}
                      className="text-muted-foreground hover:text-destructive ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showFriendPicker && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
            {untaggedFriends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">태그할 수 있는 친구가 없습니다</p>
            ) : (
              untaggedFriends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleTagFriend(f.friendProfile.user_id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/60 transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={f.friendProfile.avatar_url || ""} />
                    <AvatarFallback className="text-[9px]">{f.friendProfile.nickname?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-foreground text-left">{f.friendProfile.nickname}</span>
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                </button>
              ))
            )}
          </div>
        )}

        {!user && taggedFriends.length === 0 && (
          <p className="text-xs text-muted-foreground">로그인하면 함께한 친구를 태그할 수 있습니다</p>
        )}
      </div>

      {/* Photos */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">사진</label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
              <img
                src={src}
                alt={`등산 사진 ${i + 1}`}
                className="h-full w-full object-cover cursor-pointer transition-transform hover:scale-105"
                onClick={() => setLightboxIndex(i)}
              />
              <button
                onClick={() => removePhoto(mountainId, i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/60 text-background opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px]">추가</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Diary Notes */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          오늘의 산행 일지
        </label>
        <textarea
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => updateNotes(mountainId, notes)}
          placeholder={`${mountainName}에서의 하루를 기록해보세요.\n\n어떤 코스로 올랐나요? 정상에서 본 풍경은 어떠했나요?\n함께한 사람, 느꼈던 감정, 기억하고 싶은 순간들을 자유롭게 적어주세요...`}
          className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Visibility & Actions */}
      <div className="space-y-3">
        {user && (
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">공개 설정</label>
            <div className="flex gap-2">
              {([
                { v: "public" as const, icon: Globe, label: "전체 공개" },
                { v: "friends" as const, icon: Users, label: "친구 공개" },
                { v: "private" as const, icon: Lock, label: "나만 보기" },
              ]).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    visibility === v
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} className="flex-1 gap-2">
            <Save className="h-4 w-4" /> 저장
          </Button>
          {user && (
            <Button onClick={handlePublish} disabled={publishing} className="flex-1 gap-2">
              <Upload className="h-4 w-4" /> {publishing ? "게시 중..." : "피드에 게시"}
            </Button>
          )}
        </div>
      </div>


      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={photos[lightboxIndex]}
            alt="사진 확대"
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default MountainDetail;
