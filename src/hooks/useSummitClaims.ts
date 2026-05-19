import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardXp } from "@/lib/xp";

const QK = ["summit-claims-mine"] as const;

export function useSummitClaims() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<Set<number>>({
    queryKey: [...QK, user?.id ?? "anon"],
    queryFn: async () => {
      if (!user) return new Set<number>();
      const { data, error } = await (supabase as any)
        .from("summit_claims")
        .select("mountain_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("[useSummitClaims] fetch error", error);
        return new Set<number>();
      }
      return new Set<number>(((data || []) as any[]).map((r) => r.mountain_id));
    },
    staleTime: 1000 * 60,
  });

  const refetch = useCallback(() => {
    qc.invalidateQueries({ queryKey: QK });
  }, [qc]);

  // Refetch on focus / visibility
  useEffect(() => {
    const onFocus = () => refetch();
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refetch]);

  const toggleClaim = useCallback(
    async (mountainId: number, mountainName?: string) => {
      const { data, error } = await (supabase as any).rpc("toggle_summit_claim", {
        p_mountain_id: mountainId,
      });
      console.log("[SummitToggle]", { mountain_id: mountainId, response: data, error });
      if (error) {
        return { ok: false, action: null as null, message: error.message };
      }
      if (data?.success === false) {
        return { ok: false, action: null as null, message: data?.message || "기록 실패" };
      }
      // Optimistic update on cache
      qc.setQueryData<Set<number>>([...QK, user?.id ?? "anon"], (prev) => {
        const next = new Set(prev ?? []);
        if (data?.action === "marked") next.add(mountainId);
        else if (data?.action === "unmarked") next.delete(mountainId);
        return next;
      });
      // Background refetch to stay in sync
      qc.invalidateQueries({ queryKey: QK });
      return { ok: true, action: data?.action as "marked" | "unmarked", message: data?.message, mountainName };
    },
    [qc, user?.id],
  );

  return {
    claimedIds: query.data ?? new Set<number>(),
    isLoading: query.isLoading,
    refetch,
    toggleClaim,
  };
}
