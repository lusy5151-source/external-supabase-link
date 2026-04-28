import { Link } from "react-router-dom";
import { useTrails, type Trail } from "@/hooks/useTrails";
import type { TrailInfo as TrailInfoType } from "@/data/mountains";
import { Route, Clock, MapPin, Ruler, TrendingUp, Star, AlertCircle, ChevronRight, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrailInfoSectionProps {
  mountainId: number;
  fallbackTrails?: TrailInfoType[];
  selectedTrailId?: string | null;
  onSelectTrail?: (trail: Trail) => void;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function hasRouteGeometry(t: Trail): boolean {
  const c = t.geometry?.coordinates as any;
  return Array.isArray(c) && c.length > 0;
}

export function TrailInfoSection({ mountainId, fallbackTrails = [], selectedTrailId, onSelectTrail }: TrailInfoSectionProps) {
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
            <div key={i} className="h-28 rounded-xl bg-secondary/50 animate-pulse" />
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
            {hasDbTrails ? `${trails.length}개 코스 · 선택하면 지도에 루트가 표시됩니다` : "주요 등산로 정보"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {hasDbTrails
          ? trails.map((trail) => {
              const hasRoute = hasRouteGeometry(trail);
              const isSelected = selectedTrailId === trail.id;
              return (
                <div
                  key={trail.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-secondary/30 hover:bg-secondary/60"
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-medium text-foreground truncate">{trail.name}</p>
                    {trail.is_popular && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 shrink-0">
                        <Star className="h-2.5 w-2.5" /> 인기
                      </Badge>
                    )}
                    {!hasRoute && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0 text-muted-foreground">
                        루트 준비중
                      </Badge>
                    )}
                    {trail.difficulty && (
                      <span className="ml-auto rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                        {trail.difficulty}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {trail.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{trail.description}</p>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {trail.distance_km != null && (
                      <TrailStat icon={Ruler} label="거리" value={`${trail.distance_km}km`} />
                    )}
                    {trail.duration_minutes != null && (
                      <TrailStat icon={Clock} label="소요시간" value={formatDuration(trail.duration_minutes)} />
                    )}
                    {trail.starting_point && (
                      <TrailStat icon={MapPin} label="출발점" value={trail.starting_point} />
                    )}
                    {trail.elevation_gain_m != null && (
                      <TrailStat icon={TrendingUp} label="고도차" value={`${trail.elevation_gain_m}m`} />
                    )}
                  </div>

                  {/* Detailed info */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <DetailRow icon="📍" label="출발지점" value={trail.starting_point} />
                    <DetailRow
                      icon="⛰️"
                      label="고도차"
                      value={trail.elevation_gain_m != null ? `${trail.elevation_gain_m}m` : null}
                    />
                    <DetailRow icon="🚌" label="대중교통" value={trail.transport_public} />
                    <DetailRow icon="🚗" label="자가용" value={trail.transport_car} />
                    <DetailRow icon="💡" label="등산 팁" value={trail.hiking_tips} />
                  </div>

                  {/* Action row */}
                  <div className="mt-3 flex items-center gap-2">
                    {onSelectTrail && (
                      <button
                        type="button"
                        onClick={() => onSelectTrail(trail)}
                        disabled={!hasRoute}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : hasRoute
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                      >
                        <MapPinned className="h-3.5 w-3.5" />
                        {isSelected ? "지도에 표시됨" : hasRoute ? "지도에서 보기" : "루트 준비중"}
                      </button>
                    )}
                    <Link
                      to={`/trails/${trail.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      상세 <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          : fallbackTrails.map((trail, i) => (
              <div key={i} className="rounded-xl border border-border bg-secondary/30 p-4">
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

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  const hasValue = value != null && String(value).trim() !== "";
  return (
    <div className="flex items-start gap-1.5">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{label}: </span>
        <span className={hasValue ? "text-muted-foreground" : "text-muted-foreground/60 italic"}>
          {hasValue ? value : "아직 정보가 등록되지 않았습니다."}
        </span>
      </div>
    </div>
  );
}
