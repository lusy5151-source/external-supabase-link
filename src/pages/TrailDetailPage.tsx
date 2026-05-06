import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMountains } from "@/contexts/MountainsContext";
import MountainMascot from "@/components/MountainMascot";
import {
  ArrowLeft, ChevronLeft, Route, Clock, MapPin, Ruler, TrendingUp, Star, Car, Bus,
  ParkingCircle, Copy, Navigation, ExternalLink, Info, Lightbulb, Mountain, Hexagon, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TrailDetailMap } from "@/components/TrailDetailMap";

interface TrailDetail {
  id: string;
  mountain_id: number;
  name: string;
  distance_km: number;
  difficulty: string;
  duration_minutes: number;
  starting_point: string;
  elevation_gain_m: number | null;
  description: string | null;
  is_popular: boolean;
  course_type: string;
  parking_info: string | null;
  transport_public: string | null;
  transport_car: string | null;
  hiking_tips: string | null;
  geometry: { type?: string; coordinates?: any } | null;
  waypoints: string | null;
  ending_point: string | null;
  waypoints_json: any | null;
  route_segments: any | null;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case "쉬움": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "어려움": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }
}

export default function TrailDetailPage() {
  const { mountains } = useMountains();
  const params = useParams<{ trailId?: string; courseId?: string }>();
  // Course id can be prefixed: "t-<uuid>" (trail) or "np-<id>" (national park course)
  const rawId = params.trailId || params.courseId || "";
  const isParkCourse = rawId.startsWith("np-");
  const trailId = rawId.startsWith("t-") ? rawId.slice(2) : rawId.startsWith("np-") ? null : rawId;
  const [trail, setTrail] = useState<TrailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!trailId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("trails")
        .select("*")
        .eq("id", trailId)
        .single();
      if (!error && data) {
        setTrail(data as any);
      }
      setLoading(false);
    })();
  }, [trailId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <MountainMascot mood="loading" size={80} />
        <p className="mt-4 text-sm text-muted-foreground">코스 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (isParkCourse) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <MountainMascot mood="loading" size={80} />
        <p className="mt-4 text-muted-foreground">국립공원 공식 코스 상세 페이지는 준비 중입니다</p>
        <Link to="/mountains" className="mt-2 inline-block text-sm text-primary hover:underline">
          산 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <MountainMascot mood="sad" size={80} />
        <p className="mt-4 text-muted-foreground">코스를 찾을 수 없습니다</p>
        <Link to="/mountains" className="mt-2 inline-block text-sm text-primary hover:underline">
          산 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const mountain = mountains.find((m) => m.id === trail.mountain_id);

  const handleCopyAddress = () => {
    const address = trail.starting_point;
    navigator.clipboard.writeText(address).then(() => {
      toast({ title: "주소가 복사되었습니다 📋" });
    });
  };

  const handleOpenNaverMap = () => {
    const query = encodeURIComponent(trail.starting_point);
    window.open(`https://map.naver.com/v5/search/${query}`, "_blank");
  };

  const handleNavigate = () => {
    const query = encodeURIComponent(trail.starting_point);
    window.open(`https://map.naver.com/v5/search/${query}`, "_blank");
  };

  const difficultyBadgeStyle = (() => {
    switch (trail.difficulty) {
      case "쉬움": return { background: "#ECFDF5", color: "#065F46" };
      case "어려움": return { background: "#FEF2F2", color: "#991B1B" };
      default: return { background: "#FFFBEB", color: "#92400E" };
    }
  })();
  const courseTypeLabel =
    trail.course_type === "summit" ? "정상" :
    trail.course_type === "traverse" ? "종주" :
    trail.course_type === "loop" ? "순환" :
    trail.course_type === "partial" ? "일부" : (trail.course_type || "-");
  const courseTypeBadgeStyle = (() => {
    switch (trail.course_type) {
      case "summit": return { background: "#EFF6FF", color: "#1E40AF" };
      case "traverse": return { background: "#EEF2FF", color: "#3730A3" };
      case "loop": return { background: "#ECFEFF", color: "#155E75" };
      default: return { background: "#F3F4F6", color: "#374151" };
    }
  })();
  const baseBadge: React.CSSProperties = {
    fontSize: 10, padding: "2px 8px", borderRadius: 9999, fontWeight: 500,
    display: "inline-flex", alignItems: "center", gap: 2, whiteSpace: "nowrap",
  };
  const hours = trail.duration_minutes ? Math.floor(trail.duration_minutes / 60) : null;
  const mins = trail.duration_minutes ? trail.duration_minutes % 60 : null;

  return (
    <div className="mx-auto max-w-2xl pb-24" style={{ background: "#e6ede0", minHeight: "100vh" }}>
      {/* Back bar */}
      <Link
        to={`/mountains/${trail.mountain_id}`}
        className="inline-flex items-center gap-1"
        style={{ padding: "0 14px 12px", fontSize: 12, color: "#555" }}
      >
        <ChevronLeft size={14} color="#555" />
        {mountain?.nameKo || "산 상세"}으로 돌아가기
      </Link>

      {/* Course Route Map */}
      <TrailDetailMap
        geometry={trail.geometry}
        difficulty={trail.difficulty}
        waypoints={trail.waypoints}
        mountainLat={mountain?.lat ?? null}
        mountainLng={mountain?.lng ?? null}
        waypointsJson={(trail as any).waypoints_json ?? null}
        routeSegments={(trail as any).route_segments ?? null}
      />

      {/* Course Title Card */}
      <div style={{ background: "white", borderRadius: 18, padding: 14, margin: "8px 12px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#173404", margin: 0 }}>{trail.name}</h1>
            {mountain && (
              <p style={{ marginTop: 4, fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
                <Mountain size={11} /> {mountain.nameKo} · {mountain.height}m
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {trail.is_popular && (
              <span style={{ ...baseBadge, background: "#FFF1D9", color: "#9E6713" }}>
                <Star size={9} fill="#9E6713" stroke="#9E6713" /> 인기
              </span>
            )}
            {trail.difficulty && (
              <span style={{ ...baseBadge, ...difficultyBadgeStyle }}>{trail.difficulty}</span>
            )}
            {trail.course_type && (
              <span style={{ ...baseBadge, ...courseTypeBadgeStyle }}>{courseTypeLabel}</span>
            )}
          </div>
        </div>
        {trail.description && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#444", lineHeight: 1.6 }}>{trail.description}</p>
        )}
      </div>

      {/* Stats Strip */}
      <div style={{
        background: "white", borderRadius: 16, padding: "12px 4px", margin: "0 12px 8px",
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      }}>
        {[
          { icon: TrendingUp, label: "거리", value: trail.distance_km != null ? `${trail.distance_km}km` : null, small: false },
          { icon: Clock, label: "소요", value: trail.duration_minutes != null ? `${hours}시간 ${mins}분` : null, small: false },
          { icon: ArrowUpRight, label: "고도차", value: trail.elevation_gain_m != null ? `${trail.elevation_gain_m}m` : null, small: false },
          { icon: Hexagon, label: "유형", value: trail.course_type ? courseTypeLabel : null, small: true },
        ].map((col, i, arr) => {
          const Icon = col.icon;
          return (
            <div key={col.label} style={{
              textAlign: "center",
              borderRight: i < arr.length - 1 ? "0.5px solid #f1efe8" : "none",
            }}>
              <Icon size={16} color="#888780" strokeWidth={2} style={{ display: "block", margin: "0 auto 3px" }} />
              <div style={{ fontSize: 10, color: "#888780" }}>{col.label}</div>
              {col.value ? (
                <div style={{ fontSize: col.small ? 11 : 13, fontWeight: 700, color: "#173404" }}>{col.value}</div>
              ) : (
                <div style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>정보 없음</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleNavigate}>
          <Navigation className="h-3.5 w-3.5" /> 길찾기
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopyAddress}>
          <Copy className="h-3.5 w-3.5" /> 주소 복사
        </Button>
      </div>

      {/* Start / End Points */}
      <SectionCard title="출발지 · 도착지" icon={MapPin}>
        <div className="divide-y divide-border">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  출발
                </span>
              </div>
              <p className="text-sm font-medium text-foreground break-words">
                {trail.starting_point || "정보 없음"}
              </p>
            </div>
            {trail.starting_point && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() =>
                  window.open(
                    `https://map.naver.com/v5/search/${encodeURIComponent(trail.starting_point)}`,
                    "_blank"
                  )
                }
              >
                <Navigation className="h-3.5 w-3.5" /> 길찾기
              </Button>
            )}
          </div>
          <div className="flex items-start justify-between gap-3 pt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  도착
                </span>
              </div>
              <p className="text-sm font-medium text-foreground break-words">
                {(trail as any).ending_point || "정보 없음"}
              </p>
            </div>
            {(trail as any).ending_point && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() =>
                  window.open(
                    `https://map.naver.com/v5/search/${encodeURIComponent((trail as any).ending_point)}`,
                    "_blank"
                  )
                }
              >
                <Navigation className="h-3.5 w-3.5" /> 길찾기
              </Button>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Public Transportation */}
      <SectionCard title="대중교통 안내" icon={Bus}>
        {trail.transport_public ? (
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{trail.transport_public}</p>
        ) : (
          <EmptyInfo text="아직 정보가 등록되지 않았습니다." />
        )}
      </SectionCard>

      {/* Car Access */}
      <SectionCard title="자가용 안내" icon={Car}>
        {trail.transport_car ? (
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{trail.transport_car}</p>
        ) : (
          <EmptyInfo text="아직 정보가 등록되지 않았습니다." />
        )}
      </SectionCard>

      {/* Parking Info */}
      <SectionCard title="주차장 정보" icon={ParkingCircle}>
        {trail.parking_info ? (
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{trail.parking_info}</p>
        ) : (
          <EmptyInfo text="아직 정보가 등록되지 않았습니다." />
        )}
      </SectionCard>

      {/* Hiking Tips */}
      <SectionCard title="등산 팁" icon={Lightbulb}>
        {trail.hiking_tips ? (
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{trail.hiking_tips}</p>
        ) : (
          <EmptyInfo text="아직 정보가 등록되지 않았습니다." />
        )}
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-1 rounded-full bg-primary" />
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function EmptyInfo({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground/60 italic">
      <Info className="h-3.5 w-3.5" />
      {text}
    </div>
  );
}
