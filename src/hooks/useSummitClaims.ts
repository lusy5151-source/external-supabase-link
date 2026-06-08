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
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return new Set<number>();
      const { data, error } = await (supabase as any)
        .from("summit_claims")
        .select("mountain_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("[useSummitClaims] fetch error", error.message);
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

      // XP: award only when newly marked
      if (data?.action === "marked" && user?.id) {
        try {
          const { data: m } = await (supabase as any)
            .from("mountains")
            .select("is_bac100, is_bac100_blackyak, name_ko, name")
            .eq("id", mountainId)
            .maybeSingle();
          const isBac100 = !!(m?.is_bac100 || m?.is_bac100_blackyak);
          const amount = isBac100 ? 100 : 50;
          const mName = mountainName || m?.name_ko || m?.name || "산";
          await awardXp({
            userId: user.id,
            amount,
            sourceType: "summit",
            sourceId: String(mountainId),
            description: `${mName} 정상 인증${isBac100 ? " (100대 명산)" : ""}`,
          });
        } catch (e) { console.error("[awardXp summit toggle] failed", e); }
      }

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
