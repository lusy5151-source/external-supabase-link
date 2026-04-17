import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ChallengeListType = "forestry_100" | "bac_100";

export interface ChallengeMountainItem {
  /** Unique row id used by DB. For forestry: mountains.id, for bac: bac100_mountains.id */
  rowId: number;
  /** mountain_id used to navigate to /mountains/:id (may be null for unmapped bac rows) */
  mountainId: number | null;
  rank: number | null;
  name_ko: string;
  height: number | null;
  region: string | null;
  address: string | null;
}

export function useChallengeMountains(type: ChallengeListType) {
  return useQuery<ChallengeMountainItem[]>({
    queryKey: ["challenge-mountains", type],
    queryFn: async () => {
      if (type === "forestry_100") {
        const { data, error } = await supabase
          .from("mountains")
          .select("id, name_ko, height, region, address, bac100_rank")
          .eq("is_bac100", true)
          .order("bac100_rank", { ascending: true, nullsFirst: false })
          .order("name_ko", { ascending: true });
        if (error) throw error;
        return (data || []).map((r: any) => ({
          rowId: r.id,
          mountainId: r.id,
          rank: r.bac100_rank,
          name_ko: r.name_ko || "",
          height: r.height,
          region: r.region,
          address: r.address,
        }));
      }
      const { data, error } = await supabase
        .from("bac100_mountains")
        .select("id, name_ko, bac_rank, height, region, address, mountain_id")
        .eq("is_active", true)
        .order("bac_rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        rowId: r.id,
        mountainId: r.mountain_id,
        rank: r.bac_rank,
        name_ko: r.name_ko,
        height: r.height,
        region: r.region,
        address: r.address,
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

export interface UserChallengeRow {
  id: string;
  challenge_type: ChallengeListType;
  mountain_id: number | null;
  bac100_id: number | null;
  is_completed: boolean;
  completed_at: string | null;
}

export function useUserMountainChallenges(type: ChallengeListType) {
  const { user } = useAuth();
  return useQuery<UserChallengeRow[]>({
    queryKey: ["user-mountain-challenges", type, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_mountain_challenges")
        .select("id, challenge_type, mountain_id, bac100_id, is_completed, completed_at")
        .eq("user_id", user.id)
        .eq("challenge_type", type);
      if (error) throw error;
      return (data || []) as UserChallengeRow[];
    },
    enabled: !!user,
  });
}

export function useToggleChallengeCompletion(type: ChallengeListType) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mountainId,
      bac100Id,
      isCompleted,
      existingId,
    }: {
      mountainId: number | null;
      bac100Id: number | null;
      isCompleted: boolean;
      existingId?: string;
    }) => {
      if (!user) throw new Error("로그인이 필요합니다");
      if (existingId) {
        const { error } = await supabase
          .from("user_mountain_challenges")
          .update({
            is_completed: !isCompleted,
            completed_at: !isCompleted ? new Date().toISOString() : null,
          })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_mountain_challenges").insert({
          user_id: user.id,
          challenge_type: type,
          mountain_id: mountainId,
          bac100_id: bac100Id,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-mountain-challenges", type, user?.id] });
    },
  });
}
