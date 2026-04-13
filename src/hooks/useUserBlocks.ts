import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useUserBlocks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blockedUsers = [], isLoading } = useQuery({
    queryKey: ["user-blocks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_blocks")
        .select("*")
        .eq("blocker_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const blockedUserIds = blockedUsers.map((b) => b.blocked_id);

  const isBlocked = (userId: string) => blockedUserIds.includes(userId);

  const blockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-blocks"] });
      toast({ title: "사용자 차단 완료", description: "해당 사용자의 콘텐츠가 더 이상 표시되지 않습니다." });
    },
    onError: () => {
      toast({ title: "차단 실패", description: "다시 시도해주세요.", variant: "destructive" });
    },
  });

  const unblockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-blocks"] });
      toast({ title: "차단 해제 완료" });
    },
    onError: () => {
      toast({ title: "차단 해제 실패", variant: "destructive" });
    },
  });

  return { blockedUsers, blockedUserIds, isBlocked, isLoading, blockUser, unblockUser };
};
