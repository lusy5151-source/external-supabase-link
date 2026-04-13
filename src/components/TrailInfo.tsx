import { Link } from "react-router-dom";
import { useTrails } from "@/hooks/useTrails";
import type { TrailInfo as TrailInfoType } from "@/data/mountains";
import { Route, Clock, MapPin, Ruler, TrendingUp, Star, AlertCircle, ChevronRight } from "lucide-react";

interface TrailInfoSectionProps {
  mountainId: number;
  fallbackTrails?: TrailInfoType[];
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function TrailInfoSection({ mountainId, fallbackTrails = [] }: TrailInfoSectionProps) {
  const { trails, loading, error } = useTrails(mountainId);

  const hasDbTrails = trails.length > 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <h2 className="text-lg font-semibold text-foreground">등산 코스</h2>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && fallbackTrails.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!hasDbTrails && fallbackTrails.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">등산 코스</h2>
          <p className="text-xs text-muted-foreground">
            {hasDbTrails ? `${trails.length}개 코스` : "주요 등산로 정보"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {hasDbTrails
          ? trails.map((trail) => (
              <Link
                key={trail.id}
                to={`/trails/${trail.id}`}
                className="block rounded-xl bg-secondary/50 p-4 transition-colors hover:bg-secondary/70"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Route className="h-4 w-4 text-primary" />
                  <p className="font-medium text-foreground">{trail.name}</p>
                  {trail.is_popular && (
                    <span className="flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <Star className="h-2.5 w-2.5" /> 인기
                    </span>
                  )}
                  <span className="ml-auto rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {trail.difficulty}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
                {trail.description && (
                  <p className="text-xs text-muted-foreground mb-3">{trail.description}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TrailStat icon={Ruler} label="거리" value={`${trail.distance_km}km`} />
                  <TrailStat icon={Clock} label="소요시간" value={formatDuration(trail.duration_minutes)} />
                  <TrailStat icon={MapPin} label="출발점" value={trail.starting_point} />
                  {trail.elevation_gain_m && (
                    <TrailStat icon={TrendingUp} label="고도차" value={`${trail.elevation_gain_m}m`} />
                  )}
                </div>
              </Link>
            ))
          : fallbackTrails.map((trail, i) => (
              <div key={i} className="rounded-xl bg-secondary/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Route className="h-4 w-4 text-primary" />
                  <p className="font-medium text-foreground">{trail.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <TrailStat icon={Ruler} label="거리" value={trail.distance} />
                  <TrailStat icon={Clock} label="소요시간" value={trail.duration} />
                  <TrailStat icon={MapPin} label="출발점" value={trail.startingPoint} />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function TrailStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-0.5 text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
