import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Footprints, Route, MapPin, Clock, ExternalLink, Mountain as MountainIcon, Sparkles, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWalkingPath, pathTypeLabel } from "@/hooks/useWalkingPaths";
import { useMountains } from "@/contexts/MountainsContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const WalkingPathDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useWalkingPath(id);
  const { mountains } = useMountains();

  if (isLoading) return <LoadingSpinner message="둘레길 정보를 불러오는 중..." />;
  if (!data?.path) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">둘레길을 찾을 수 없습니다.</p>
        <Link to="/mountains" className="text-primary text-sm mt-2 inline-block">목록으로</Link>
      </div>
    );
  }

  const { path, courses } = data;
  const linkedMountain = path.mountain_id ? mountains.find((m) => m.id === path.mountain_id) : null;
  const diffColor =
    path.difficulty === "쉬움"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : path.difficulty === "어려움"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

  return (
    <div className="space-y-5 pb-24">
      <Link to="/mountains" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 산 목록
      </Link>

      {/* Hero */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
            <Footprints className="h-3 w-3 mr-1" />
            {pathTypeLabel(path.path_type)}
          </Badge>
          {path.difficulty && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${diffColor}`}>{path.difficulty}</span>
          )}
          {path.region && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />{path.region}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{path.name}</h1>
        {path.description && <p className="text-sm text-muted-foreground leading-relaxed">{path.description}</p>}
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Route} label="총 거리" value={path.total_distance_km != null ? `${path.total_distance_km}km` : "-"} />
        <StatCard icon={Footprints} label="코스" value={path.total_courses != null ? `${path.total_courses}개` : `${courses.length}개`} />
        <StatCard icon={Clock} label="소요" value={path.duration_hours != null ? `${path.duration_hours}h` : "-"} />
      </div>

      {/* Highlights */}
      {path.highlights && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">하이라이트</h2>
          </div>
          <p className="text-sm text-muted-foreground">{path.highlights}</p>
        </section>
      )}

      {/* Start / End */}
      {(path.start_point || path.end_point) && (
        <section className="rounded-xl border border-border bg-card p-4 text-sm space-y-1.5">
          {path.start_point && (
            <div className="flex items-center gap-2">
              <Flag className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-muted-foreground">시작:</span>
              <span className="text-foreground">{path.start_point}</span>
            </div>
          )}
          {path.end_point && (
            <div className="flex items-center gap-2">
              <Flag className="h-3.5 w-3.5 text-red-600" />
              <span className="text-muted-foreground">종점:</span>
              <span className="text-foreground">{path.end_point}</span>
            </div>
          )}
        </section>
      )}

      {/* Linked mountain */}
      {linkedMountain && (
        <Link
          to={`/mountains/${linkedMountain.id}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:bg-accent/50 transition-colors"
        >
          <MountainIcon className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">연계 산</p>
            <p className="font-medium text-foreground truncate">{linkedMountain.nameKo}</p>
          </div>
          <span className="text-xs text-primary">상세 →</span>
        </Link>
      )}

      {/* Website */}
      {path.website_url && (
        <Button asChild className="w-full">
          <a href={path.website_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" /> 공식 홈페이지
          </a>
        </Button>
      )}

      {/* Courses */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">코스 목록</h2>
          <span className="text-xs text-muted-foreground">{courses.length}개</span>
        </div>
        {courses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            등록된 코스 정보가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => (
              <article key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {c.course_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{c.course_name || `${c.course_number} 코스`}</h3>
                    {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{c.description}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {c.distance_km != null && (
                        <span className="inline-flex items-center gap-1"><Route className="h-3 w-3" />{c.distance_km}km</span>
                      )}
                      {c.duration_minutes != null && (
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{Math.floor(c.duration_minutes / 60)}h {c.duration_minutes % 60}m</span>
                      )}
                      {c.difficulty && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{c.difficulty}</span>}
                    </div>
                    {(c.start_point || c.end_point) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {c.start_point} {c.start_point && c.end_point && "→"} {c.end_point}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-primary mb-1" />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default WalkingPathDetail;
