import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mountains } from "@/data/mountains";
import MountainMascot from "@/components/MountainMascot";
import {
  ArrowLeft, Route, Clock, MapPin, Ruler, TrendingUp, Star, Car, Bus,
  ParkingCircle, Copy, Navigation, ExternalLink, Info, Lightbulb, AlertTriangle,
  CheckCircle2, Mountain, Footprints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TrailDetail {
  id: string;
  mountain_id: number;
  name: string;
  distance_km: number;
  difficulty: string;
  duration_minutes: number;
  starting_point: string;
  starting_point_description: string | null;
  elevation_gain_m: number | null;
  description: string | null;
  is_popular: boolean;
  course_type: string;
  end_point: string | null;
  parking_info: {
    name?: string;
    available?: boolean;
    fee?: string;
    notes?: string;
  } | null;
  public_transit: Array<{
    type?: string;
    name?: string;
    description?: string;
    walk_minutes?: number;
  }> | null;
  car_access: {
    navigation_query?: string;
    parking_name?: string;
    notes?: string;
  } | null;
  tips: {
    best_season?: string;
    beginner_friendly?: boolean;
    preparation?: string[];
    caution?: string[];
  } | null;
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
  const { trailId } = useParams<{ trailId: string }>();
  const [trail, setTrail] = useState<TrailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!trailId) return;
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
  const transitSteps = Array.isArray(trail.public_transit) ? trail.public_transit : [];
  const parking = trail.parking_info && typeof trail.parking_info === "object" ? trail.parking_info : null;
  const carAccess = trail.car_access && typeof trail.car_access === "object" ? trail.car_access : null;
  const tips = trail.tips && typeof trail.tips === "object" ? trail.tips : null;

  const handleCopyAddress = () => {
    const address = trail.starting_point;
    navigator.clipboard.writeText(address).then(() => {
      toast({ title: "주소가 복사되었습니다 📋" });
    });
  };

  const handleOpenKakaoMap = () => {
    const query = encodeURIComponent(trail.starting_point);
    window.open(`https://map.kakao.com/?q=${query}`, "_blank");
  };

  const handleNavigate = () => {
    const navQuery = carAccess?.navigation_query || trail.starting_point;
    const query = encodeURIComponent(navQuery);
    window.open(`https://map.kakao.com/?q=${query}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      {/* Back */}
      <Link
        to={`/mountains/${trail.mountain_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {mountain?.nameKo || "산 상세"} 으로 돌아가기
      </Link>

      {/* Course Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{trail.name}</h1>
            </div>
            {mountain && (
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                <Mountain className="h-3.5 w-3.5" /> {mountain.nameKo} · {mountain.height}m
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trail.is_popular && (
              <span className="flex items-center gap-0.5 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <Star className="h-3 w-3" /> 인기
              </span>
            )}
            <span className={`rounded-lg px-2 py-1 text-xs font-medium ${getDifficultyStyle(trail.difficulty)}`}>
              {trail.difficulty}
            </span>
          </div>
        </div>

        {trail.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{trail.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Ruler} label="거리" value={`${trail.distance_km}km`} />
          <StatCard icon={Clock} label="소요시간" value={formatDuration(trail.duration_minutes)} />
          <StatCard icon={MapPin} label="출발점" value={trail.starting_point} />
          {trail.elevation_gain_m && (
            <StatCard icon={TrendingUp} label="고도차" value={`${trail.elevation_gain_m}m`} />
          )}
          {trail.end_point && (
            <StatCard icon={Footprints} label="종착점" value={trail.end_point} />
          )}
          <StatCard icon={Route} label="코스유형" value={trail.course_type === "summit" ? "정상" : trail.course_type === "traverse" ? "종주" : trail.course_type === "loop" ? "순환" : trail.course_type} />
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleOpenKakaoMap}>
          <ExternalLink className="h-3.5 w-3.5" /> 카카오맵
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleNavigate}>
          <Navigation className="h-3.5 w-3.5" /> 길찾기
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopyAddress}>
          <Copy className="h-3.5 w-3.5" /> 주소 복사
        </Button>
      </div>

      {/* Starting Point Section */}
      <SectionCard title="출발 지점" icon={MapPin}>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{trail.starting_point}</p>
          {trail.starting_point_description && (
            <p className="text-sm text-muted-foreground">{trail.starting_point_description}</p>
          )}
          {parking && (parking.name || parking.available !== undefined) && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
              <ParkingCircle className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div className="text-sm space-y-0.5">
                {parking.name && <p className="font-medium text-foreground">{parking.name}</p>}
                {parking.available !== undefined && (
                  <p className="text-muted-foreground">
                    주차 {parking.available ? "가능" : "불가"}
                    {parking.fee && ` · ${parking.fee}`}
                  </p>
                )}
                {parking.notes && <p className="text-muted-foreground">{parking.notes}</p>}
              </div>
            </div>
          )}
          {!trail.starting_point_description && (!parking || !parking.name) && (
            <p className="text-xs text-muted-foreground/60 italic">아직 상세 정보가 등록되지 않았습니다.</p>
          )}
        </div>
      </SectionCard>

      {/* Public Transportation */}
      <SectionCard title="대중교통 안내" icon={Bus}>
        {transitSteps.length > 0 ? (
          <div className="space-y-3">
            {transitSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <div className="text-sm">
                  {step.type && (
                    <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {step.type}
                    </span>
                  )}
                  <span className="text-foreground font-medium">{step.name}</span>
                  {step.description && <p className="text-muted-foreground mt-0.5">{step.description}</p>}
                  {step.walk_minutes && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      🚶 도보 약 {step.walk_minutes}분
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyInfo text="대중교통 정보가 아직 등록되지 않았습니다." />
        )}
      </SectionCard>

      {/* Car Access */}
      <SectionCard title="자가용 안내" icon={Car}>
        {carAccess && (carAccess.navigation_query || carAccess.parking_name) ? (
          <div className="space-y-2 text-sm">
            {carAccess.navigation_query && (
              <div className="flex items-center gap-2">
                <Navigation className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground">
                  네비 검색: <span className="font-medium">{carAccess.navigation_query}</span>
                </span>
              </div>
            )}
            {carAccess.parking_name && (
              <div className="flex items-center gap-2">
                <ParkingCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">{carAccess.parking_name}</span>
              </div>
            )}
            {carAccess.notes && (
              <p className="text-muted-foreground">{carAccess.notes}</p>
            )}
          </div>
        ) : (
          <EmptyInfo text="자가용 안내 정보가 아직 등록되지 않았습니다." />
        )}
      </SectionCard>

      {/* Hiking Tips */}
      <SectionCard title="등산 팁" icon={Lightbulb}>
        {tips && (tips.best_season || tips.preparation?.length || tips.caution?.length) ? (
          <div className="space-y-3 text-sm">
            {tips.best_season && (
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground">추천 시기: <span className="font-medium">{tips.best_season}</span></span>
              </div>
            )}
            {tips.beginner_friendly !== undefined && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground">
                  초보자 {tips.beginner_friendly ? "추천 ✅" : "비추천 ⚠️"}
                </span>
              </div>
            )}
            {tips.preparation && tips.preparation.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">🎒 준비물</p>
                <ul className="space-y-1 pl-1">
                  {tips.preparation.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-foreground">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tips.caution && tips.caution.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">⚠️ 주의사항</p>
                <ul className="space-y-1 pl-1">
                  {tips.caution.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-foreground">
                      <AlertTriangle className="mt-0.5 h-3 w-3 text-destructive shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <EmptyInfo text="등산 팁이 아직 등록되지 않았습니다." />
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
