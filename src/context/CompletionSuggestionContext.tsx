import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, BookOpen, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { updateChallengeProgress } from "@/lib/challengeUtils";

type SuggestionState = {
  mountainId: number;
  mountainName?: string;
} | null;

interface ContextShape {
  suggest: (mountainId: number, mountainName?: string) => void;
}

const Ctx = createContext<ContextShape | null>(null);

export function CompletionSuggestionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<SuggestionState>(null);
  const [hasClaim, setHasClaim] = useState(false);
  const [hasJournal, setHasJournal] = useState(false);

  const suggest = useCallback((mountainId: number, mountainName?: string) => {
    setState({ mountainId, mountainName });
  }, []);

  // When opened, query whether actions are already done — and refresh challenge progress
  useEffect(() => {
    if (!state || !user) return;
    let cancelled = false;
    (async () => {
      setHasClaim(false);
      setHasJournal(false);
      const [{ count: claimCount }, { count: journalCount }] = await Promise.all([
        (supabase as any)
          .from("summit_claims")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mountain_id", state.mountainId),
        supabase
          .from("hiking_journals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mountain_id", state.mountainId),
      ]);
      if (cancelled) return;
      setHasClaim((claimCount || 0) > 0);
      setHasJournal((journalCount || 0) > 0);
      // Update challenges in the background
      updateChallengeProgress(user.id);
    })();
    return () => { cancelled = true; };
  }, [state, user]);

  const close = () => setState(null);

  const goClaim = () => {
    close();
    navigate("/summit-claim");
  };

  const goJournal = () => {
    if (!state) return;
    close();
    navigate(`/mountains/${state.mountainId}?focusJournal=1`);
  };

  return (
    <Ctx.Provider value={{ suggest }}>
      {children}
      <Dialog open={!!state} onOpenChange={(o) => !o && close()}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">🎉 완등을 기록했어요!</DialogTitle>
            <DialogDescription>
              {state?.mountainName ? `${state.mountainName} ` : ""}
              {hasClaim && hasJournal
                ? "이미 정상 인증과 일지가 모두 있어요. 챌린지가 갱신되었어요."
                : "남은 활동도 함께 남겨볼까요?"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {!hasClaim && (
              <Button onClick={goClaim} className="w-full justify-start gap-2">
                <Camera className="h-4 w-4" /> 정상 인증하기
              </Button>
            )}
            {!hasJournal && (
              <Button onClick={goJournal} variant="secondary" className="w-full justify-start gap-2">
                <BookOpen className="h-4 w-4" /> 일지 작성하기
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button onClick={close} variant="ghost" className="w-full gap-2">
              <Clock className="h-4 w-4" /> 나중에
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useCompletionSuggestion() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback no-op so consumers outside provider don't crash
    return { suggest: () => {} };
  }
  return ctx;
}
