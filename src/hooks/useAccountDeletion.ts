import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useAccountDeletion = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingRequest } = useQuery({
    queryKey: ["account-deletion", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const requestDeletion = useMutation({
    mutationFn: async (reason?: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const { error } = await supabase.from("account_deletion_requests").insert({
        user_id: user.id,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-deletion"] });
      toast({
        title: "계정 삭제 요청 접수",
        description: "7일 이내에 처리가 시작되며, 30일 이내에 완전 삭제됩니다.",
      });
    },
    onError: () => {
      toast({ title: "요청 실패", description: "다시 시도해주세요.", variant: "destructive" });
    },
  });

  const cancelDeletion = useMutation({
    mutationFn: async () => {
      if (!user || !pendingRequest) throw new Error("취소할 요청이 없습니다.");
      const { error } = await supabase
        .from("account_deletion_requests")
        .update({ status: "cancelled" })
        .eq("id", pendingRequest.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-deletion"] });
      toast({ title: "삭제 요청 취소됨", description: "계정이 유지됩니다." });
    },
    onError: () => {
      toast({ title: "취소 실패", variant: "destructive" });
    },
  });

  return { pendingRequest, requestDeletion, cancelDeletion };
};
