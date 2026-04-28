import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrailGeometry {
  type?: string;
  coordinates?: number[][] | number[][][];
}

export interface Trail {
  id: string;
  mountain_id: number;
  name: string;
  distance_km: number | null;
  difficulty: string | null;
  duration_minutes: number | null;
  geometry?: TrailGeometry | null;
  starting_point: string | null;
  elevation_gain_m: number | null;
  description: string | null;
  is_popular: boolean | null;
  course_type: string | null;
}

export function useTrails(mountainId: number) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrails() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from("trails")
          .select("*")
          .eq("mountain_id", mountainId)
          .order("is_popular", { ascending: false });

        if (dbError) {
          setError("코스 정보를 불러올 수 없습니다");
          setTrails([]);
          return;
        }

        if (!cancelled) {
          setTrails((data || []) as Trail[]);
        }
      } catch {
        if (!cancelled) {
          setError("코스 정보를 불러오는 중 오류가 발생했습니다");
          setTrails([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTrails();
    return () => { cancelled = true; };
  }, [mountainId]);

  return { trails, loading, error };
}
