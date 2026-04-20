import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

interface Restriction {
  section: string;
  content: string;
  startDate: string;
  endDate: string;
  status: string;
  parkName: string;
}

interface Props {
  mountainId: number;
}

function formatYmd(ymd: string): string {
  const digits = (ymd || "").replace(/[^0-9]/g, "");
  if (digits.length !== 8) return ymd || "";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export function ParkRestrictions({ mountainId }: Props) {
  const [parkName, setParkName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // 1. 이 산이 국립공원인지 확인
      const { data: park } = await supabase
        .from("national_parks")
        .select("name_ko")
        .eq("mountain_id", mountainId)
        .maybeSingle();

      if (cancelled) return;

      if (!park) {
        setParkName(null);
        setLoading(false);
        return;
      }

      setParkName(park.name_ko);

      // 2. 엣지 함수 호출
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-park-restrictions",
        { body: null, method: "GET" as any }
      ).catch(() => ({ data: null, error: null }));

      // supabase.functions.invoke는 GET 쿼리스트링 지원이 제한적이므로 직접 fetch
      try {
        const url = `https://ylcjlzlchinijvyojdbc.supabase.co/functions/v1/get-park-restrictions?parkName=${encodeURIComponent(park.name_ko)}`;
        const res = await fetch(url, {
          headers: {
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsY2psemxjaGluaWp2eW9qZGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDM0NjEsImV4cCI6MjA4ODY3OTQ2MX0.rPK3w7Yb85MaKACLC0wbthM_YGmE_QoWa62B89Iwfr4",
          },
        });
        const json = await res.json();
        if (cancelled) return;

        if (json.error && (!json.restrictions || json.restrictions.length === 0)) {
          setError(json.error);
        }
        setRestrictions(json.restrictions || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "통제 정보를 불러올 수 없습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mountainId]);

  // 국립공원이 아니면 섹션 숨김
  if (!loading && !parkName) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-1 rounded-full bg-primary" />
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">탐방로 통제 정보</h2>
        {parkName && (
          <span className="text-xs text-muted-foreground">· {parkName}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          통제 정보를 확인하는 중...
        </div>
      ) : restrictions.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              현재 {restrictions.length}개 구간이 통제 중입니다
            </p>
          </div>
          <ul className="space-y-2">
            {restrictions.map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10 p-3 space-y-1"
              >
                {r.section && (
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    🚫 {r.section}
                  </p>
                )}
                {r.content && (
                  <p className="text-xs text-foreground leading-relaxed">{r.content}</p>
                )}
                {(r.startDate || r.endDate) && (
                  <p className="text-[11px] text-muted-foreground">
                    📅 {formatYmd(r.startDate)} ~ {formatYmd(r.endDate)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            통제 정보를 일시적으로 불러올 수 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            현재 통제 구간 없음 ✅
          </p>
        </div>
      )}
    </div>
  );
}
