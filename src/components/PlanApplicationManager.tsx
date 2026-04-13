import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mountains } from "@/data/mountains";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Application {
  id: string;
  plan_id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: {
    nickname: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  planId: string;
  mountainId: number;
  isCreator: boolean;
}

export default function PlanApplicationManager({ planId, mountainId, isCreator }: Props) {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    const { data } = await supabase
      .from("plan_applications")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });

    const apps = (data as any[] || []) as Application[];
    if (apps.length > 0) {
      const userIds = apps.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles as any[] || []).map((p) => [p.user_id, p]));
      apps.forEach((a) => { a.profile = profileMap.get(a.user_id) || undefined; });
    }
    setApplications(apps);
    setLoading(false);
  }, [planId]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleDecision = async (app: Application, decision: "accepted" | "rejected") => {
    setProcessingId(app.id);
    const { error } = await supabase
      .from("plan_applications")
      .update({ status: decision } as any)
      .eq("id", app.id);

    if (error) {
      toast({ title: "처리 실패", variant: "destructive" });
    } else {
      const mt = mountains.find((m) => m.id === mountainId);
      const mtName = mt?.nameKo || "등산";
      if (decision === "accepted") {
        // Also add as plan_participant with going status
        await supabase.from("plan_participants").insert({
          plan_id: planId,
          user_id: app.user_id,
          rsvp_status: "going",
          status: "accepted",
        } as any);

        await supabase.from("plan_notifications").insert({
          user_id: app.user_id,
          plan_id: planId,
          type: "application_accepted",
          message: `축하해요! ${mtName} 참가 신청이 수락되었습니다 🎉`,
        } as any);
        toast({ title: "참가 신청을 수락했습니다 ✅" });
      } else {
        await supabase.from("plan_notifications").insert({
          user_id: app.user_id,
          plan_id: planId,
          type: "application_rejected",
          message: `죄송합니다. ${mtName} 참가 신청이 거절되었습니다`,
        } as any);
        toast({ title: "참가 신청을 거절했습니다" });
      }
      fetchApplications();
    }
    setProcessingId(null);
  };

  if (loading) return <p className="text-xs text-muted-foreground py-2">불러오는 중...</p>;

  const pending = applications.filter((a) => a.status === "pending");
  const accepted = applications.filter((a) => a.status === "accepted");
  const rejected = applications.filter((a) => a.status === "rejected");

  return (
    <div className="space-y-4">
      {/* Pending applications */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            대기 중인 신청 ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((app) => (
              <div key={app.id} className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={app.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {app.profile?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {app.profile?.nickname || "사용자"}
                </span>
                {isCreator && (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={processingId === app.id}
                      onClick={() => handleDecision(app, "accepted")}
                    >
                      <UserCheck className="h-3 w-3 mr-1" /> 수락
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs text-destructive border-destructive/30"
                      disabled={processingId === app.id}
                      onClick={() => handleDecision(app, "rejected")}
                    >
                      <UserX className="h-3 w-3 mr-1" /> 거절
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted */}
      {accepted.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            확정 참가자 ({accepted.length})
          </p>
          <div className="space-y-1.5">
            {accepted.map((app) => (
              <div key={app.id} className="flex items-center gap-2 py-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={app.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {app.profile?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-foreground">
                  {app.profile?.nickname || "사용자"}
                </span>
                <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  확정
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            거절됨 ({rejected.length})
          </p>
          <div className="space-y-1.5 opacity-50">
            {rejected.map((app) => (
              <div key={app.id} className="flex items-center gap-2 py-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={app.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {app.profile?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-foreground">
                  {app.profile?.nickname || "사용자"}
                </span>
                <Badge variant="secondary" className="text-[10px]">거절</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          아직 참가 신청이 없습니다
        </p>
      )}
    </div>
  );
}
