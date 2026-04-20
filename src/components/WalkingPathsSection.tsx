import { Link } from "react-router-dom";
import { Footprints, Route, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWalkingPathsByMountain, pathTypeLabel } from "@/hooks/useWalkingPaths";

export function WalkingPathsSection({ mountainId }: { mountainId: number }) {
  const { data: paths = [], isLoading } = useWalkingPathsByMountain(mountainId);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 둘레길을 찾는 중...
        </div>
      </section>
    );
  }

  if (paths.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Footprints className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">연계 둘레길</h2>
        <span className="text-xs text-muted-foreground">{paths.length}개</span>
      </div>
      <div className="space-y-2">
        {paths.map((p) => {
          const diffColor =
            p.difficulty === "쉬움"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : p.difficulty === "어려움"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
          return (
            <Link
              key={p.id}
              to={`/walking-paths/${p.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/40 text-primary">
                      {pathTypeLabel(p.path_type)}
                    </Badge>
                    {p.difficulty && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${diffColor}`}>
                        {p.difficulty}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{p.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {p.total_distance_km != null && (
                      <span className="inline-flex items-center gap-1">
                        <Route className="h-3 w-3" />
                        {p.total_distance_km}km
                      </span>
                    )}
                    {p.total_courses != null && (
                      <span className="inline-flex items-center gap-1">
                        <Footprints className="h-3 w-3" />
                        {p.total_courses}개 코스
                      </span>
                    )}
                    {p.region && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.region}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default WalkingPathsSection;
