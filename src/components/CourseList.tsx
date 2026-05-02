import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, Map as MapIcon } from "lucide-react";
import { useTrails, type Trail } from "@/hooks/useTrails";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface NPCourse {
  id: number;
  cos_kor_nm: string;
  detail_cos: string | null;
  leng: string | null;
  forward_tm: string | null;
  forward_minutes: number | null;
  difficulty: string | null;
  cos_schdul: string | null;
  park_name: string | null;
}

export interface UnifiedCourse {
  id: string;            // routing id, e.g. "t-<uuid>" or "np-<num>"
  source: "trail" | "park";
  name: string;
  distance: string | null;        // e.g. "3.4km"
  duration: string | null;        // e.g. "1시간 30분"
  elevationGain: string | null;   // e.g. "500m"
  difficulty: string | null;
  isPopular: boolean;
  raw: Trail | NPCourse;
}

function formatMinutes(min: number | null | undefined): string | null {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

interface Props {
  mountainId: number;
  isNationalPark?: boolean;
  onSelectTrail?: (trail: Trail) => void;
}

export function CourseList({ mountainId, isNationalPark, onSelectTrail }: Props) {
  const navigate = useNavigate();
  const { trails, loading: trailsLoading } = useTrails(mountainId);
  const [npCourses, setNpCourses] = useState<NPCourse[]>([]);
  const [npLoading, setNpLoading] = useState<boolean>(!!isNationalPark);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!isNationalPark) {
      setNpLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setNpLoading(true);
      const { data, error } = await (supabase as any)
        .from("national_park_courses")
        .select("*")
        .eq("mountain_id", mountainId)
        .order("forward_minutes", { ascending: true });
      if (!cancelled) {
        if (error) {
          console.error("national_park_courses fetch error:", error);
          setNpCourses([]);
        } else {
          setNpCourses((data || []) as NPCourse[]);
        }
        setNpLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mountainId, isNationalPark]);

  const courses: UnifiedCourse[] = useMemo(() => {
    const list: UnifiedCourse[] = [];
    for (const t of trails) {
      list.push({
        id: `t-${t.id}`,
        source: "trail",
        name: t.name,
        distance: t.distance_km != null ? `${t.distance_km}km` : null,
        duration: formatMinutes(t.duration_minutes),
        elevationGain: t.elevation_gain_m != null ? `${t.elevation_gain_m}m` : null,
        difficulty: t.difficulty,
        isPopular: !!t.is_popular,
        raw: t,
      });
    }
    for (const c of npCourses) {
      list.push({
        id: `np-${c.id}`,
        source: "park",
        name: c.cos_kor_nm,
        distance: c.leng,
        duration: c.forward_tm || formatMinutes(c.forward_minutes),
        elevationGain: null,
        difficulty: c.difficulty,
        isPopular: false,
        raw: c,
      });
    }
    // Sort: popular first, then by name
    list.sort((a, b) => {
      if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
      return a.name.localeCompare(b.name, "ko");
    });
    return list;
  }, [trails, npCourses]);

  const loading = trailsLoading || npLoading;
  const FEATURED_MAX = 3;
  const featured = courses.slice(0, FEATURED_MAX);
  const rest = courses.slice(FEATURED_MAX);

  const openCourse = (c: UnifiedCourse) => {
    navigate(`/mountains/${mountainId}/courses/${c.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-[10px] bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground">등록된 코스가 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      {featured.map((c) => (
        <CourseCard
          key={c.id}
          course={c}
          featured
          onOpen={() => openCourse(c)}
          onShowOnMap={() => {
            if (c.source === "trail" && onSelectTrail) onSelectTrail(c.raw as Trail);
          }}
        />
      ))}

      {rest.length > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full flex items-center justify-center gap-1 mt-1 mb-2 rounded-[10px] border border-border bg-card hover:bg-secondary/40 transition-colors"
          style={{ padding: "10px 12px", fontSize: 12 }}
        >
          <span className="text-foreground">전체 코스 보기 ({courses.length}개)</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {showAll && rest.map((c) => (
        <CourseCard key={c.id} course={c} onOpen={() => openCourse(c)} />
      ))}

      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full text-center mt-1 text-muted-foreground hover:text-foreground"
          style={{ fontSize: 11, padding: "6px 0" }}
        >
          접기
        </button>
      )}
    </div>
  );
}

function CourseCard({
  course,
  featured,
  onOpen,
  onShowOnMap,
}: {
  course: UnifiedCourse;
  featured?: boolean;
  onOpen: () => void;
  onShowOnMap?: () => void;
}) {
  const stats = [course.distance, course.duration, course.elevationGain && `고도차 ${course.elevationGain}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="bg-card cursor-pointer hover:bg-secondary/30 transition-colors"
      style={{
        border: "0.5px solid hsl(var(--border) / 0.12)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-2">
        <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>
          {course.name}
        </p>
        {course.isPopular && (
          <Badge variant="default" className="shrink-0 gap-0.5" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, height: "auto" }}>
            <Star className="h-2.5 w-2.5" /> 인기
          </Badge>
        )}
        {course.difficulty && (
          <span
            className="ml-auto shrink-0 bg-secondary text-secondary-foreground"
            style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}
          >
            {course.difficulty}
          </span>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>
          {stats}
        </p>
      )}

      {/* Bottom row (featured only) */}
      {featured && (
        <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
          {onShowOnMap && course.source === "trail" && (
            <button
              onClick={(e) => { e.stopPropagation(); onShowOnMap(); }}
              className="inline-flex items-center gap-1 text-primary hover:underline"
              style={{ fontSize: 11 }}
            >
              <MapIcon className="h-3 w-3" />
              지도에서 보기
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="ml-auto inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
            style={{ fontSize: 11 }}
          >
            상세 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default CourseList;
