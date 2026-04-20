import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WalkingPath {
  id: string;
  mountain_id: number | null;
  name: string;
  path_type: string; // dulle | olle | forest 등
  total_distance_km: number | null;
  total_courses: number | null;
  difficulty: string | null;
  duration_hours: number | null;
  region: string | null;
  province: string | null;
  description: string | null;
  highlights: string | null;
  start_point: string | null;
  end_point: string | null;
  website_url: string | null;
  image_url: string | null;
  is_active: boolean | null;
}

export interface WalkingPathCourse {
  id: string;
  walking_path_id: string | null;
  course_number: string;
  course_name: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  difficulty: string | null;
  start_point: string | null;
  end_point: string | null;
  description: string | null;
}

export const PATH_TYPE_LABEL: Record<string, string> = {
  dulle: "둘레길",
  olle: "올레길",
  forest: "숲길",
  trail: "트레일",
};

export function pathTypeLabel(t: string | null | undefined) {
  if (!t) return "둘레길";
  return PATH_TYPE_LABEL[t] || t;
}

export function useWalkingPathsByMountain(mountainId: number | undefined) {
  return useQuery<WalkingPath[]>({
    queryKey: ["walking_paths", "mountain", mountainId],
    enabled: !!mountainId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("walking_paths")
        .select("*")
        .eq("mountain_id", mountainId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as WalkingPath[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useAllWalkingPaths() {
  return useQuery<WalkingPath[]>({
    queryKey: ["walking_paths", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("walking_paths")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as WalkingPath[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useWalkingPath(id: string | undefined) {
  return useQuery<{ path: WalkingPath | null; courses: WalkingPathCourse[] }>({
    queryKey: ["walking_paths", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: pathData, error: pErr }, { data: courseData, error: cErr }] = await Promise.all([
        (supabase as any).from("walking_paths").select("*").eq("id", id).maybeSingle(),
        (supabase as any).from("walking_path_courses").select("*").eq("walking_path_id", id).order("course_number"),
      ]);
      if (pErr) throw pErr;
      if (cErr) throw cErr;
      return {
        path: (pathData as WalkingPath) || null,
        courses: (courseData || []) as WalkingPathCourse[],
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
