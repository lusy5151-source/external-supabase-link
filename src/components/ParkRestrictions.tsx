import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TrailRestriction {
  trail_name: string;
  reason: string;
  start_date: string;
  end_date: string;
  restriction_type: string;
}

interface TrailRestrictionsResponse {
  is_national_park: boolean;
  park_name?: string;
  has_restrictions: boolean;
  restrictions: TrailRestriction[];
  api_result_code: string;
}

interface Props {
  mountainId: number;
}

function formatDate(d: string): string {
  if (!d) return "";
  const digits = d.replace(/[^0-9]/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return d;
}

export function ParkRestrictions({ mountainId }: Props) {
  const [isPark, setIsPark] = useState<boolean | null>(null);
  const [parkName, setParkName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrailRestrictionsResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setHasError(false);

      // 1. 국립공원 여부 확인
      const { data: park } = await supabase
        .from("national_parks")
        .select("id, name_ko")
        .eq("mountain_id", mountainId)
        .maybeSingle();

      if (cancelled) return;

      if (!park) {
        setIsPark(false);
        setLoading(false);
        return;
      }

      setIsPark(true);
      setParkName(park.name_ko);

      // 2. Edge Function 호출
      try {
        const { data: result, error } = await supabase.functions.invoke(
          "get-trail-restrictions",
          { body: { mountain_id: mountainId } }
        );
        if (cancelled) return;

        if (error || !result) {
          setHasError(true);
        } else {
          setData(result as TrailRestrictionsResponse);
        }
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mountainId]);

  // 국립공원이 아니면 숨김
  if (isPark === false) return null;

  // 로딩 중: 스피너
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          탐방로 통제 정보를 확인하는 중...
        </div>
      </div>
    );
  }

  // 오류 또는 API 결과코드 비정상 → 전체 숨김
  if (hasError || !data || data.api_result_code !== "00") return null;

  // 통제 있음
  if (data.has_restrictions) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-red-600">🚫 탐방로 통제 현황</h2>
        {data.park_name && (
          <p className="text-xs text-muted-foreground">{data.park_name} 기준</p>
        )}
        <ul className="space-y-2">
          {data.restrictions.map((r, i) => (
            <li
              key={i}
              className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-red-900">{r.trail_name}</span>
                {r.restriction_type && (
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 text-[10px] font-medium px-2 py-0.5">
                    {r.restriction_type}
                  </span>
                )}
              </div>
              {r.reason && (
                <p className="text-xs text-red-800 leading-relaxed">{r.reason}</p>
              )}
              {(r.start_date || r.end_date) && (
                <p className="text-[11px] text-red-700/80">
                  📅 {formatDate(r.start_date)} ~ {formatDate(r.end_date)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 통제 없음
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
      <h2 className="text-base font-semibold text-foreground">탐방로 통제 현황</h2>
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-green-700 font-medium text-sm">✅ 현재 통제 구간 없음</p>
        {(data.park_name || parkName) && (
          <p className="text-xs text-green-700/70 mt-0.5">
            {data.park_name || parkName} 기준
          </p>
        )}
      </div>
    </div>
  );
}
