import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mountain, Route, Clock, Ruler, MoonStar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface Props {
  mountainId: number;
  isNationalPark?: boolean;
}

function difficultyClasses(d: string | null) {
  if (d === "하") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (d === "중") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (d === "상") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-secondary text-muted-foreground";
}

export function NationalParkCoursesSection({ mountainId, isNationalPark }: Props) {
  const [courses, setCourses] = useState<NPCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isNationalPark) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("national_park_courses")
        .select("*")
        .eq("mountain_id", mountainId)
        .order("forward_minutes", { ascending: true });
      if (!cancelled) {
        if (error) {
          console.error("national_park_courses fetch error:", error);
          setCourses([]);
        } else {
          setCourses((data || []) as NPCourse[]);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mountainId, isNationalPark]);

  if (!isNationalPark) return null;
  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 국립공원 탐방로를 찾는 중...
        </div>
      </section>
    );
  }
  if (courses.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <Mountain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">국립공원 공식 탐방로</h2>
        <Badge variant="secondary" className="ml-auto rounded-full px-2 py-0.5 text-xs">
          {courses.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {courses.map((c) => {
          const isOvernight = c.cos_schdul === "1박2일";
          return (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-secondary/30 p-4 hover:bg-secondary/60 transition-colors"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <Route className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="font-semibold text-foreground flex-1">{c.cos_kor_nm}</p>
                {c.difficulty && (
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium shrink-0",
                      difficultyClasses(c.difficulty)
                    )}
                  >
                    {c.difficulty}
                  </span>
                )}
              </div>

              {c.detail_cos && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2 pl-6">
                  {c.detail_cos}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-muted-foreground">
                {c.leng && (
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    {c.leng}
                  </span>
                )}
                {c.forward_tm && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {c.forward_tm}
                  </span>
                )}
                {isOvernight && (
                  <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <MoonStar className="h-3 w-3" />
                    1박2일
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/70 text-right pt-1">
        출처: 국립공원공단
      </p>
    </section>
  );
}

export default NationalParkCoursesSection;
