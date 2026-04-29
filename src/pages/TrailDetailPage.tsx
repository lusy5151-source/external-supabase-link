import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMountains } from "@/contexts/MountainsContext";
import MountainMascot from "@/components/MountainMascot";
import {
  ArrowLeft, Route, Clock, MapPin, Ruler, TrendingUp, Star, Car, Bus,
  ParkingCircle, Copy, Navigation, ExternalLink, Info, Lightbulb, Mountain,
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

      {/* Course Route Map */}
      <TrailDetailMap
        geometry={trail.geometry}
        difficulty={trail.difficulty}
        waypoints={trail.waypoints}
        trailId={trail.id}
        trailName={trail.name}
        mountainName={mountain?.nameKo}
        distanceKm={trail.distance_km}
        onGeometryFetched={(geom) =>
          setTrail((prev) => (prev ? { ...prev, geometry: geom as any } : prev))
        }
      />

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
          <StatCard icon={Route} label="코스유형" value={trail.course_type === "summit" ? "정상" : trail.course_type === "traverse" ? "종주" : trail.course_type === "loop" ? "순환" : trail.course_type} />
        </div>
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

      {/* Starting Point Section */}
      <SectionCard title="출발 지점" icon={MapPin}>
        <p className="text-sm font-medium text-foreground">{trail.starting_point}</p>
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
