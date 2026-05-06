import { useParams, Link, useNavigate } from "react-router-dom";
import { useMountains } from "@/contexts/MountainsContext";
import type { Mountain } from "@/data/mountains";
import { useUserMountains, toMountain } from "@/hooks/useUserMountains";
import { usePioneerBadges } from "@/hooks/usePioneerBadges";
import DuplicateReportModal from "@/components/DuplicateReportModal";
import HikingShareCard from "@/components/HikingShareCard";
import { useStore } from "@/context/StoreContext";
import { SummitClaimSection } from "@/components/SummitClaimSection";
import {
  ArrowLeft, ChevronLeft, Heart, Share2, Mountain as MountainIcon, MapPin, TrendingUp, CheckCircle2, Circle, Calendar,
  Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudSun, ImagePlus, X, Users,
  Clock, Route, Flag, Save, UserPlus, UserMinus, Globe, Lock, Upload, User, Check, Star,
} from "lucide-react";
import { useSummits } from "@/hooks/useSummits";
import { useState, useEffect, useRef } from "react";
import type { WeatherCondition, CompletionRecord } from "@/hooks/useMountainStore";
import { WeatherCard } from "@/components/WeatherCard";
import { TrailInfoSection } from "@/components/TrailInfo";

import { TrailRouteMap, ROUTE_COLORS } from "@/components/TrailRouteMap";
import type { Trail } from "@/hooks/useTrails";
import { ParkRestrictions } from "@/components/ParkRestrictions";
import { MountainFacilities } from "@/components/MountainFacilities";
import WalkingPathsSection from "@/components/WalkingPathsSection";
import NationalParkCoursesSection from "@/components/NationalParkCoursesSection";
import CourseList from "@/components/CourseList";
import { useTrails as useTrailsForLegend } from "@/hooks/useTrails";

import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingJournals } from "@/hooks/useHikingJournals";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addRecentSearch } from "@/lib/recentSearches";

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
  const navigate = useNavigate();
  const { mountains } = useMountains();
  const { userMountains } = useUserMountains();

  // Try static mountains first, then user-created
  const mountainId = Number(id);
  const staticMountain = mountains.find((m) => m.id === mountainId);
  const userMountainRow = !staticMountain ? userMountains.find((m) => m.mountain_id === mountainId) : null;
  const mountain = staticMountain || (userMountainRow ? toMountain(userMountainRow) : null);
  useEffect(() => {
    if (mountain) addRecentSearch({ id: mountain.id, name: mountain.nameKo });
  }, [mountain?.id]);
  const isUserCreated = !!(mountain as any)?.isUserCreated;
  const createdBy = (mountain as any)?.createdBy as string | undefined;

  const {
    isCompleted, toggleComplete, addCompletion, getRecord, getCompletionCount,
    updateNotes, updateDate, updateWeather, addPhotos, removePhoto,
    updateTaggedFriends, updateCourseInfo, updateDuration, updateDifficulty,
  } = useStore();

  // Fetch creator profile for user-created mountains
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [showDuplicateReport, setShowDuplicateReport] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [activeTab, setActiveTab] = useState<"개요" | "코스" | "날씨·복장" | "편의시설">("개요");
  const [pendingTriggerSummitId, setPendingTriggerSummitId] = useState<string | null>(null);
  const { pioneerBadges } = usePioneerBadges(createdBy);

  useEffect(() => {
    if (!createdBy) return;
    supabase.from("public_profiles").select("nickname").eq("user_id", createdBy).single().then(({ data }) => {
      setCreatorName(data?.nickname || "사용자");
    });
  }, [createdBy]);

  if (!mountain) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">산을 찾을 수 없습니다</p>
        <Link to="/mountains" className="mt-2 inline-block text-sm text-primary hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const completed = isCompleted(mountain.id);
  const record = getRecord(mountain.id);
  const completionCount = getCompletionCount(mountain.id);

  const firstTrail = mountain.trails && mountain.trails.length > 0 ? mountain.trails[0] : undefined;
  const heroImage = (mountain as any).image_url || (mountain as any).photo_url || null;

  // Difficulty -> gradient fallback (uses brand tokens via CSS vars)
  const gradientByDifficulty: Record<string, string> = {
    "쉬움": "linear-gradient(135deg, hsl(var(--brand-lime)), hsl(var(--brand-sky)))",
    "보통": "linear-gradient(135deg, hsl(var(--brand-sky)), hsl(var(--brand-navy)))",
    "어려움": "linear-gradient(135deg, hsl(var(--brand-forest)), hsl(var(--brand-navy)))",
  };
  const heroBg = heroImage
    ? `url(${heroImage}) center/cover no-repeat`
    : (gradientByDifficulty[mountain.difficulty] || gradientByDifficulty["보통"]);

  // Favorite (localStorage)
  const FAV_KEY = "wandeung.favorites";
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const arr: number[] = raw ? JSON.parse(raw) : [];
      return arr.includes(mountain.id);
    } catch { return false; }
  });
  const toggleFavorite = () => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const arr: number[] = raw ? JSON.parse(raw) : [];
      const next = arr.includes(mountain.id) ? arr.filter((x) => x !== mountain.id) : [...arr, mountain.id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      setIsFavorite(next.includes(mountain.id));
    } catch {}
  };
  const handleShare = async () => {
    const url = window.location.href;
    const title = `${mountain.nameKo} · 완등`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Hero banner */}
      <div
        className="relative"
        style={{
          height: 150,
          marginLeft: 12,
          marginRight: 12,
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 60%, #4a7ba8 100%)",
        }}
      >
        {/* Mountain silhouette decoration */}
        <svg
          viewBox="0 0 380 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 75, opacity: 0.5 }}
        >
          <path d="M0 100 L50 55 L95 75 L150 30 L195 60 L240 38 L290 65 L340 45 L380 55 L380 100 Z" fill="rgba(255,255,255,0.1)" />
          <path d="M0 100 L70 65 L120 45 L175 70 L225 50 L275 75 L325 55 L380 70 L380 100 Z" fill="rgba(255,255,255,0.16)" />
        </svg>

        {/* Top bar */}
        <div className="relative flex items-center justify-between" style={{ padding: "10px 12px", zIndex: 2 }}>
          <button
            onClick={() => navigate(-1)}
            aria-label="뒤로"
            className="flex items-center justify-center rounded-full"
            style={{ width: 30, height: 30, background: "rgba(0,0,0,0.35)" }}
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              aria-label="즐겨찾기"
              className="flex items-center justify-center rounded-full"
              style={{ width: 30, height: 30, background: "rgba(0,0,0,0.35)" }}
            >
              <Heart size={14} className="text-white" fill={isFavorite ? "#fff" : "none"} />
            </button>
            <button
              onClick={handleShare}
              aria-label="공유"
              className="flex items-center justify-center rounded-full"
              style={{ width: 30, height: 30, background: "rgba(0,0,0,0.35)" }}
            >
              <Share2 size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Bottom-left title */}
        <div style={{ position: "absolute", bottom: 14, left: 14, zIndex: 2 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.1, margin: 0 }}>
            {mountain.nameKo}
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
            {[mountain.name, mountain.region].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Bottom-right badges */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-end",
            zIndex: 2,
          }}
        >
          {(() => {
            const baseBadge: React.CSSProperties = {
              background: "#fff",
              fontSize: 10,
              fontWeight: 500,
              padding: "3px 9px",
              borderRadius: 10,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              display: "inline-flex",
              alignItems: "center",
            };
            return (
              <>
                {(mountain as any).is_bac100_blackyak && (
                  <span style={{ ...baseBadge, color: "#633806", border: "0.5px solid #FAC775" }}>
                    <Star size={10} fill="#FAC775" stroke="#FAC775" strokeWidth={1} style={{ marginRight: 4 }} />
                    100대 명산
                  </span>
                )}
                {mountain.is_bac100 && (
                  <span style={{ ...baseBadge, color: "#173404", border: "0.5px solid #c6d56c" }}>
                    산림청 100대 명산
                  </span>
                )}
                {mountain.is_national_park && (
                  <span style={{ ...baseBadge, color: "#04342C", border: "0.5px solid #9FE1CB" }}>
                    {mountain.national_park_name || "국립공원"}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Stat card */}
      {(() => {
        const diffStyles: Record<string, { bg: string; fg: string }> = {
          "쉬움": { bg: "#EAF3DE", fg: "#173404" },
          "보통": { bg: "#FAEEDA", fg: "#412402" },
          "어려움": { bg: "#FCEBEB", fg: "#501313" },
        };
        const ds = diffStyles[mountain.difficulty] || diffStyles["보통"];
        const colCss: React.CSSProperties = {
          textAlign: "center",
          borderRight: "0.5px solid #f1efe8",
        };
        const lastColCss: React.CSSProperties = { textAlign: "center" };
        const labelCss: React.CSSProperties = { fontSize: 10, color: "#888780", marginBottom: 2 };
        const valNumCss: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#173404" };
        const iconStyle: React.CSSProperties = { display: "block", margin: "0 auto 3px" };
        const duration = firstTrail?.duration;
        return (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "12px 4px",
              marginLeft: 12,
              marginRight: 12,
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
            }}
          >
            <div style={colCss}>
              <MountainIcon size={14} color="#888780" strokeWidth={2} style={iconStyle} />
              <div style={labelCss}>높이</div>
              <div style={valNumCss}>{mountain.height}m</div>
            </div>
            <div style={colCss}>
              <TrendingUp size={14} color="#888780" strokeWidth={2} style={iconStyle} />
              <div style={labelCss}>난이도</div>
              <span
                style={{
                  display: "inline-block",
                  background: ds.bg,
                  color: ds.fg,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "1px 8px",
                  borderRadius: 6,
                }}
              >
                {mountain.difficulty}
              </span>
            </div>
            <div style={lastColCss}>
              <Clock size={14} color="#888780" strokeWidth={2} style={iconStyle} />
              <div style={labelCss}>소요</div>
              {duration ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#173404" }}>{duration}</div>
              ) : (
                <div style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>정보 없음</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tab bar */}
      <div
        style={{
          background: "#f7faf2",
          border: "0.5px solid #e3efcc",
          borderRadius: 14,
          padding: 3,
          margin: "12px 12px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
        }}
      >
        {(["개요", "코스", "날씨·복장", "편의시설"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "날씨·복장" ? "날씨" : tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 4px",
                textAlign: "center",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s",
                background: isActive ? "#c6d56c" : "transparent",
                borderRadius: isActive ? 11 : 0,
                color: isActive ? "#173404" : "#666",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden mt-6">
        <div
          className="flex"
          style={{
            width: "400%",
            transform: `translateX(-${["개요", "코스", "날씨·복장", "편의시설"].indexOf(activeTab) * 25}%)`,
            transition: "transform 200ms ease-out",
          }}
        >
          {/* 개요 */}
          <div className="space-y-4" style={{ width: "25%", flexShrink: 0, paddingRight: 8 }}>
            {isUserCreated && creatorName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>등록자: {creatorName}</span>
                {pioneerBadges.some((p) => p.mountainId === mountainId) && (
                  <span title="개척자">🗺️</span>
                )}
              </div>
            )}
            {isUserCreated && (
              <div>
                <button
                  onClick={() => setShowDuplicateReport(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                >
                  이 산은 이미 목록에 있어요
                </button>
              </div>
            )}
            {isUserCreated && (
              <DuplicateReportModal
                reportedMountainId={mountainId}
                open={showDuplicateReport}
                onOpenChange={setShowDuplicateReport}
              />
            )}

            {/* Block 1: 산 소개 */}
            <OverviewIntroBlock text={mountain.overview || mountain.description || ""} />

            {/* Block 2: 정상 정복 */}
            <OverviewSummitsBlock
              mountainId={mountain.id}
              mountainName={mountain.nameKo}
              onTriggerSummit={setPendingTriggerSummitId}
            />

            {/* Block 3: 위치 */}
            <OverviewLocationBlock mountain={mountain} />

            {/* Hidden claim handler — opens dialog when a peak is tapped above */}
            <SummitClaimSection
              mountainId={mountain.id}
              mountainName={mountain.nameKo}
              hideList
              triggerSummitId={pendingTriggerSummitId}
              onTriggerHandled={() => setPendingTriggerSummitId(null)}
            />

            {isUserCreated && pioneerBadges.some((p) => p.mountainId === mountainId) && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🗺️</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">이 산의 개척자</p>
                    <p className="text-xs text-muted-foreground">{creatorName} 🗺️</p>
                  </div>
                </div>
              </div>
            )}
            {completed && record && (
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
            )}
            {completed && record && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">📤 공유 카드</h2>
                <HikingShareCard
                  mountain={mountain}
                  record={record}
                  photoUrl={record.photos && record.photos.length > 0 ? record.photos[0] : undefined}
                />
              </div>
            )}
          </div>

          {/* 코스 */}
          <div className="space-y-4" style={{ width: "25%", flexShrink: 0, paddingRight: 8 }}>
            <CourseList
              mountainId={mountain.id}
              isNationalPark={mountain.is_national_park}
              onSelectTrail={setSelectedTrail}
            />
            <div style={{ height: 200 }} className="overflow-hidden rounded-[12px]">
              <TrailRouteMap
                mountainName={mountain.nameKo}
                mountainId={mountain.id}
                lat={mountain.lat}
                lng={mountain.lng}
                selectedTrail={selectedTrail}
              />
            </div>
            
            <WalkingPathsSection mountainId={mountain.id} />
          </div>

          {/* 날씨·복장 */}
          <div className="space-y-6" style={{ width: "25%", flexShrink: 0, paddingRight: 8 }}>
            <WeatherCard mountainId={mountain.id} />
          </div>

          {/* 편의시설 */}
          <div className="space-y-6" style={{ width: "25%", flexShrink: 0, paddingRight: 8 }}>
            <ParkRestrictions mountainId={mountain.id} />
            <MountainFacilities mountainId={mountain.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

const sectionCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 12,
  margin: "0 12px 8px",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#173404",
  marginBottom: 8,
  borderLeft: "2.5px solid #c6d56c",
  paddingLeft: 8,
};
const sectionBodyStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#444",
  lineHeight: 1.6,
};

function OverviewIntroBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  return (
    <div style={sectionCardStyle}>
      <div style={sectionTitleStyle}>산 소개</div>
      <p
        style={{
          ...sectionBodyStyle,
          display: expanded ? "block" : "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </p>
      {text.length > 120 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ marginTop: 4, fontSize: 12, color: "#639922", fontWeight: 500 }}
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}

function OverviewSummitsBlock({
  mountainId,
  mountainName,
  onTriggerSummit,
}: {
  mountainId: number;
  mountainName: string;
  onTriggerSummit: (id: string) => void;
}) {
  const { summits, claims, loading } = useSummits(mountainId);
  const { user } = useAuth();
  const myClaimedIds = new Set(
    (claims || []).filter((c) => user && c.user_id === user.id).map((c) => c.summit_id)
  );

  const list = summits && summits.length > 0
    ? summits
    : [{ id: `fallback-${mountainId}`, mountain_id: mountainId, summit_name: `${mountainName} 정상`, latitude: 0, longitude: 0, elevation: 0 }];

  const completedCount = list.filter((s) => myClaimedIds.has(s.id)).length;

  return (
    <div style={sectionCardStyle}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div style={sectionTitleStyle}>정상 정복</div>
        <span style={{ fontSize: 11, color: "#666" }}>
          {completedCount} / {list.length}
        </span>
      </div>
      {loading ? (
        <p style={{ ...sectionBodyStyle, color: "#888" }}>불러오는 중…</p>
      ) : (
        <div>
          {list.map((s, idx) => {
            const checked = myClaimedIds.has(s.id);
            const isLast = idx === list.length - 1;
            return (
              <button
                key={s.id}
                onClick={() => onTriggerSummit(s.id)}
                className="w-full flex items-center text-left"
                style={{
                  padding: "8px 4px",
                  gap: 10,
                  borderBottom: isLast ? "none" : "0.5px solid #f1efe8",
                }}
              >
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: checked ? "#c6d56c" : "transparent",
                    border: checked ? "none" : "1.5px solid #c6d56c",
                  }}
                >
                  {checked && <Check style={{ width: 11, height: 11, strokeWidth: 3, color: "#173404" }} />}
                </span>
                <span style={{ fontSize: 12, flex: 1, color: "#173404" }}>
                  {s.summit_name}
                </span>
                {s.elevation > 0 && (
                  <span style={{ fontSize: 11, color: "#666" }}>
                    {s.elevation.toLocaleString()}m
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverviewLocationBlock({ mountain }: { mountain: Mountain }) {
  const address = [mountain.province, mountain.address].filter(Boolean).join(" ");
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(mountain.nameKo)}`;
  return (
    <div style={sectionCardStyle}>
      <div style={sectionTitleStyle}>위치</div>
      {address && (
        <p style={{ ...sectionBodyStyle, marginBottom: 8 }}>{address}</p>
      )}
      <a
        href={naverUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative overflow-hidden"
        style={{
          height: 90,
          borderRadius: 10,
          background: "linear-gradient(180deg, #d5e8c8 0%, #c8d8b9 100%)",
        }}
        aria-label="네이버 지도에서 보기"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            style={{
              background: "#639922",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {mountain.nameKo}
          </span>
        </div>
      </a>
    </div>
  );
}

function StatCell({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={divider ? { borderLeft: "0.5px solid hsl(var(--border) / 0.12)" } : undefined}
    >
      <p className="text-muted-foreground" style={{ fontSize: 11 }}>{label}</p>
      <p className="text-foreground" style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{value}</p>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

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
      .from("public_profiles")
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
