import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { mountains } from "@/data/mountains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Plus, UserCheck, Clock, Mountain } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { HikingPlan, PlanParticipant } from "@/hooks/useHikingPlans";

interface Props {
  clubId: string;
  isLeader: boolean;
  isMember: boolean;
}

export default function ClubHikingPlans({ clubId, isLeader, isMember }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<HikingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [participantMap, setParticipantMap] = useState<Record<string, PlanParticipant[]>>({});

  // Form
  const [mountainId, setMountainId] = useState<number>(mountains[0]?.id || 1);
  const [trailName, setTrailName] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    const { data } = await supabase
      .from("hiking_plans")
      .select("*")
      .eq("group_id", clubId)
      .order("planned_date", { ascending: true });
    setPlans((data as HikingPlan[]) || []);
    setLoading(false);

    // Fetch participants for each plan
    if (data && data.length > 0) {
      const planIds = (data as any[]).map((p) => p.id);
      const { data: parts } = await supabase
        .from("plan_participants")
        .select("*")
        .in("plan_id", planIds);
      const map: Record<string, PlanParticipant[]> = {};
      (parts as any[] || []).forEach((p) => {
        if (!map[p.plan_id]) map[p.plan_id] = [];
        map[p.plan_id].push(p);
      });
      setParticipantMap(map);
    }
  }, [clubId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleCreate = async () => {
    if (!user || !plannedDate) return;
    setCreating(true);
    const { error } = await supabase.from("hiking_plans").insert({
      creator_id: user.id,
      mountain_id: mountainId,
      trail_name: trailName || null,
      planned_date: plannedDate,
      start_time: startTime || null,
      meeting_location: meetingLocation || null,
      notes: notes || null,
      group_id: clubId,
      is_public: false,
    } as any);
    setCreating(false);
    if (error) {
      toast({ title: "계획 생성에 실패했습니다", variant: "destructive" });
    } else {
      toast({ title: "등산 계획이 생성되었습니다!" });
      setShowCreate(false);
      setTrailName(""); setPlannedDate(""); setStartTime(""); setMeetingLocation(""); setNotes("");
      fetchPlans();
    }
  };

  const handleRsvp = async (planId: string, status: string) => {
    if (!user) return;
    // Check if already a participant
    const existing = participantMap[planId]?.find((p) => p.user_id === user.id);
    if (existing) {
      await supabase
        .from("plan_participants")
        .update({ rsvp_status: status, responded_at: new Date().toISOString() } as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("plan_participants").insert({
        plan_id: planId,
        user_id: user.id,
        rsvp_status: status,
      } as any);
    }
    fetchPlans();
    toast({ title: status === "going" ? "참석으로 응답했습니다" : status === "interested" ? "관심으로 응답했습니다" : "불참으로 응답했습니다" });
  };

  const rsvpLabels: Record<string, string> = { going: "참석", interested: "관심", declined: "불참", pending: "대기" };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">📅 등산 계획</h2>
        {isMember && (
          <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3" /> 새 계획
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">불러오는 중...</p>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Calendar className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">아직 등산 계획이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const mt = mountains.find((m) => m.id === plan.mountain_id);
            const participants = participantMap[plan.id] || [];
            const goingCount = participants.filter((p) => p.rsvp_status === "going").length;
            const myRsvp = participants.find((p) => p.user_id === user?.id)?.rsvp_status;
            return (
              <div key={plan.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Mountain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{mt?.nameKo || `산 #${plan.mountain_id}`}</h3>
                    {plan.trail_name && <p className="text-[10px] text-muted-foreground">{plan.trail_name}</p>}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {plan.status === "upcoming" ? "예정" : plan.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(plan.planned_date), "M월 d일 (EEE)", { locale: ko })}</span>
                  {plan.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {plan.start_time.slice(0, 5)}</span>}
                  {plan.meeting_location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {plan.meeting_location}</span>}
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {goingCount}명 참석</span>
                </div>

                {plan.notes && <p className="text-xs text-muted-foreground">{plan.notes}</p>}

                {/* RSVP buttons */}
                {isMember && (
                  <div className="flex gap-2">
                    {(["going", "interested", "declined"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={myRsvp === s ? "default" : "outline"}
                        className="rounded-full text-[10px] h-7 px-3"
                        onClick={() => handleRsvp(plan.id, s)}
                      >
                        {rsvpLabels[s]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>새 등산 계획</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">산 선택</Label>
              <select
                value={mountainId}
                onChange={(e) => setMountainId(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {mountains.map((m) => (
                  <option key={m.id} value={m.id}>{m.nameKo}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">코스/정상</Label>
              <Input value={trailName} onChange={(e) => setTrailName(e.target.value)} placeholder="예: 백운대 코스" className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">날짜</Label>
                <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">시간</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs">모임 장소</Label>
              <Input value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} placeholder="예: 북한산성 입구" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">설명</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="등산 계획 설명" className="mt-1 rounded-xl" rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={creating || !plannedDate} className="w-full rounded-xl">
              {creating ? "생성 중..." : "계획 만들기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
