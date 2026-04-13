import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitReport = useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      reason,
      description,
    }: {
      targetType: "post" | "comment" | "journal";
      targetId: string;
      reason: "spam" | "inappropriate" | "harassment" | "other";
      description?: string;
    }) => {
      if (!user) throw new Error("로그인이 필요합니다.");

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "신고 접수 완료", description: "검토 후 적절한 조치를 취하겠습니다." });
    },
    onError: () => {
      toast({ title: "신고 실패", description: "다시 시도해주세요.", variant: "destructive" });
    },
  });

  return { submitReport };
};
