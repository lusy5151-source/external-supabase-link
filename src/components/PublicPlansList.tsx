import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { mountains } from "@/data/mountains";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Mountain, Calendar, Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PublicPlan {
  id: string;
  mountain_id: number;
  planned_date: string;
  start_time: string | null;
  meeting_location: string | null;
  max_participants: number;
  creator_id: string;
  status: string;
  trail_name: string | null;
  notes: string | null;
}

interface CreatorProfile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

export default function PublicPlansList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Map<string, CreatorProfile>>(new Map());
  const [applicationMap, setApplicationMap] = useState<Record<string, string>>({}); // planId -> status
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [confirmPlan, setConfirmPlan] = useState<PublicPlan | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchPublicPlans = useCallback(async () => {
    const { data } = await supabase
      .from("hiking_plans")
      .select("*")
      .eq("is_public", true)
      .gte("planned_date", new Date().toISOString().split("T")[0])
      .order("planned_date", { ascending: true });

    const planList = (data as any[] || []) as PublicPlan[];
    setPlans(planList);
    setLoading(false);

    if (planList.length === 0) return;

    // Fetch creator profiles
    const creatorIds = [...new Set(planList.map((p) => p.creator_id))];
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", creatorIds);
    const pMap = new Map<string, CreatorProfile>();
    (profileData as any[] || []).forEach((p) => pMap.set(p.user_id, p));
    setProfiles(pMap);

    // Fetch user's existing applications
    if (user) {
      const planIds = planList.map((p) => p.id);
      const { data: apps } = await supabase
        .from("plan_applications")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .in("plan_id", planIds);
      const appMap: Record<string, string> = {};
      (apps as any[] || []).forEach((a) => { appMap[a.plan_id] = a.status; });
      setApplicationMap(appMap);

      // Also check plan_participants for legacy RSVP
      const { data: parts } = await supabase
        .from("plan_participants")
        .select("plan_id")
        .eq("user_id", user.id)
        .in("plan_id", planIds);
      (parts as any[] || []).forEach((p) => {
        if (!appMap[p.plan_id]) appMap[p.plan_id] = "participant";
      });
      setApplicationMap({ ...appMap });
    }

    // Fetch accepted participant counts per plan
    const planIds = planList.map((p) => p.id);
    const { data: acceptedApps } = await supabase
      .from("plan_applications")
      .select("plan_id")
      .in("plan_id", planIds)
      .eq("status", "accepted");
    const counts: Record<string, number> = {};
    planIds.forEach((id) => { counts[id] = 0; });
    (acceptedApps as any[] || []).forEach((a) => {
      counts[a.plan_id] = (counts[a.plan_id] || 0) + 1;
    });
    // Also count going participants from plan_participants
    const { data: goingParts } = await supabase
      .from("plan_participants")
      .select("plan_id")
      .in("plan_id", planIds)
      .eq("rsvp_status", "going");
    (goingParts as any[] || []).forEach((p) => {
      counts[p.plan_id] = (counts[p.plan_id] || 0) + 1;
    });
    // +1 for creator
    planList.forEach((p) => { counts[p.id] = (counts[p.id] || 0) + 1; });
    setParticipantCounts(counts);
  }, [user]);

  useEffect(() => { fetchPublicPlans(); }, [fetchPublicPlans]);

  const handleApply = async () => {
    if (!user || !confirmPlan) return;
    setApplying(true);
    const { error } = await supabase
      .from("plan_applications")
      .insert({ plan_id: confirmPlan.id, user_id: user.id, status: "pending" } as any);

    if (error) {
      toast({ title: "참가 신청 실패", variant: "destructive" });
    } else {
      // Notify creator
      const mt = mountains.find((m) => m.id === confirmPlan.mountain_id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("user_id", user.id)
        .single();
      const name = (profile as any)?.nickname || "누군가";
      await supabase.from("plan_notifications").insert({
        user_id: confirmPlan.creator_id,
        plan_id: confirmPlan.id,
        type: "application",
        message: `${name}님이 ${mt?.nameKo || "등산"} 계획에 참가 신청했어요`,
      } as any);

      setApplicationMap((prev) => ({ ...prev, [confirmPlan.id]: "pending" }));
      toast({ title: "참가 신청 완료! 승인을 기다려주세요 🎉" });
    }
    setApplying(false);
    setConfirmPlan(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">공개 일정을 불러오는 중...</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Mountain className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">아직 공개된 등산 일정이 없습니다</p>
        <p className="text-xs text-muted-foreground/60 mt-1">새 계획을 만들고 공개로 설정해보세요!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {plans.map((plan) => {
          const mt = mountains.find((m) => m.id === plan.mountain_id);
          const creator = profiles.get(plan.creator_id);
          const currentCount = participantCounts[plan.id] || 1;
          const maxP = (plan as any).max_participants || 10;
          const isFull = currentCount >= maxP;
          const myApp = applicationMap[plan.id];
          const isCreator = user?.id === plan.creator_id;

          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3"
            >
              {/* Header: Mountain + Creator */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Mountain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/plans/${plan.id}`)}
                  >
                    {mt?.nameKo || `산 #${plan.mountain_id}`}
                  </h3>
                  {plan.trail_name && (
                    <p className="text-[10px] text-muted-foreground">🥾 {plan.trail_name}</p>
                  )}
                </div>
              </div>

              {/* Creator info */}
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={creator?.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">
                    {creator?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {creator?.nickname || "알 수 없음"}
                </span>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(plan.planned_date), "M월 d일 (EEE)", { locale: ko })}
                </span>
                {plan.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {plan.start_time.slice(0, 5)}
                  </span>
                )}
                {plan.meeting_location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {plan.meeting_location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {currentCount}/{maxP}명
                </span>
              </div>

              {/* Action button */}
              {isCreator ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-full text-xs"
                  onClick={() => navigate(`/plans/${plan.id}`)}
                >
                  내 계획 보기
                </Button>
              ) : myApp === "accepted" || myApp === "participant" ? (
                <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs">
                  참가 확정 ✅
                </Badge>
              ) : myApp === "pending" ? (
                <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs bg-muted">
                  신청 완료 (승인 대기)
                </Badge>
              ) : myApp === "rejected" ? (
                <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs bg-destructive/10 text-destructive">
                  신청 거절됨
                </Badge>
              ) : isFull ? (
                <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs bg-muted">
                  마감
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="w-full rounded-full text-xs bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setConfirmPlan(plan)}
                >
                  참가 신청
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmPlan} onOpenChange={() => setConfirmPlan(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>참가 신청</DialogTitle>
            <DialogDescription>
              {confirmPlan && mountains.find((m) => m.id === confirmPlan.mountain_id)?.nameKo} 등산
              계획에 참가 신청할까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmPlan(null)}>
              취소
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {applying ? "신청 중..." : "신청하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
