import { useUserBlocks } from "@/hooks/useUserBlocks";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function BlockedUsersList() {
  const { user } = useAuth();
  const { blockedUsers, unblockUser } = useUserBlocks();

  const { data: profiles = [] } = useQuery({
    queryKey: ["blocked-profiles", blockedUsers.map((b) => b.blocked_id)],
    queryFn: async () => {
      if (blockedUsers.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", blockedUsers.map((b) => b.blocked_id));
      return data || [];
    },
    enabled: blockedUsers.length > 0,
  });

  if (!user) return null;

  if (blockedUsers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">차단한 사용자가 없습니다.</p>
    );
  }

  return (
    <div className="space-y-2">
      {blockedUsers.map((block) => {
        const profile = profiles.find((p) => p.user_id === block.blocked_id);
        return (
          <div key={block.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{profile?.nickname?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{profile?.nickname || "사용자"}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => unblockUser.mutate(block.blocked_id)}
              disabled={unblockUser.isPending}
            >
              차단 해제
            </Button>
          </div>
        );
      })}
    </div>
  );
}
