import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMountains } from "@/contexts/MountainsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Plus, UserCheck, Clock, Mountain, X, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { HikingPlan, PlanParticipant } from "@/hooks/useHikingPlans";

interface Props {
  clubId: string;
  isLeader: boolean;
  isMember: boolean;
}

interface CreatorProfile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

export default function ClubHikingPlans({ clubId, isLeader, isMember }: Props) {
  const { mountains } = useMountains();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<HikingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [participantMap, setParticipantMap] = useState<Record<string, PlanParticipant[]>>({});
  const [creatorMap, setCreatorMap] = useState<Record<string, CreatorProfile>>({});

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mountainId, setMountainId] = useState<number>(mountains[0]?.id || 1);
  const [trailName, setTrailName] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setMountainId(mountains[0]?.id || 1);
    setTrailName("");
    setPlannedDate("");
    setStartTime("");
    setMeetingLocation("");
    setNotes("");
  };

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("hiking_plans")
      .select("*")
      .eq("group_id", clubId)
      .order("planned_date", { ascending: true });
    if (error) console.error("Fetch plans error:", JSON.stringify(error));
    const planList = (data as HikingPlan[]) || [];
    setPlans(planList);
    setLoading(false);

    if (planList.length > 0) {
      const planIds = planList.map((p) => p.id);
      const creatorIds = [...new Set(planList.map((p: any) => p.creator_id).filter(Boolean))];

      const [{ data: parts }, { data: profiles }] = await Promise.all([
        supabase.from("plan_participants").select("*").in("plan_id", planIds),
        supabase
          .from("public_profiles")
          .select("user_id, nickname, avatar_url")
          .in("user_id", creatorIds),
      ]);

      const map: Record<string, PlanParticipant[]> = {};
      (parts as any[] || []).forEach((p) => {
        if (!map[p.plan_id]) map[p.plan_id] = [];
        map[p.plan_id].push(p);
      });
      setParticipantMap(map);

      const cMap: Record<string, CreatorProfile> = {};
      (profiles as any[] || []).forEach((p) => {
        cMap[p.user_id] = p;
      });
      setCreatorMap(cMap);
    } else {
      setParticipantMap({});
      setCreatorMap({});
    }
  }, [clubId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (plan: HikingPlan) => {
    setEditingId(plan.id);
    setMountainId(plan.mountain_id);
    setTrailName(plan.trail_name || "");
    setPlannedDate(plan.planned_date);
    setStartTime(plan.start_time ? plan.start_time.slice(0, 5) : "");
    setMeetingLocation(plan.meeting_location || "");
    setNotes(plan.notes || "");
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    if (!plannedDate) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return;
    }
    setCreating(true);

    if (editingId) {
      const { error } = await (supabase as any)
        .from("hiking_plans")
        .update({
          mountain_id: mountainId,
          trail_name: trailName || null,
          planned_date: plannedDate,
          start_time: startTime || null,
          meeting_location: meetingLocation || null,
          notes: notes || null,
        })
        .eq("id", editingId);
      setCreating(false);
      if (error) {
        console.error("Update plan error:", JSON.stringify(error));
        toast({ title: "계획 수정 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "계획이 수정되었어요" });
        setShowCreate(false);
        resetForm();
        fetchPlans();
      }
      return;
    }

    const { error } = await supabase.from("hiking_plans").insert({
      creator_id: authUser.id,
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
      console.error("Create plan error:", JSON.stringify(error));
      toast({ title: "계획 생성 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "계획이 생성되었어요!" });
      setShowCreate(false);
      resetForm();
      fetchPlans();
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const { error } = await supabase
      .from("hiking_plans")
      .delete()
      .eq("id", confirmDeleteId);
    setConfirmDeleteId(null);
    if (error) {
      console.error("Delete plan error:", JSON.stringify(error));
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "계획이 삭제되었어요" });
      fetchPlans();
    }
  };

  const handleRsvp = async (planId: string, status: string) => {
    if (!user) return;
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
          <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={openCreate}>
            <Plus className="h-3 w-3" /> 새 계획
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">불러오는 중...</p>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl p-4 text-center" style={{ background: "#EAF3DE", borderRadius: "var(--border-radius-lg)" }}>
          <p style={{ fontSize: 13, color: "#3B6D11", fontWeight: 500 }}>아직 등산 계획이 없어요</p>
          <p style={{ fontSize: 12, color: "#3B6D11", marginTop: 4 }}>멤버들과 함께 첫 계획을 만들어볼까요?</p>
          {isMember && (
            <button
              onClick={openCreate}
              className="mt-3 inline-flex items-center gap-1 font-medium text-white"
              style={{ background: "#639922", borderRadius: "var(--border-radius-md)", padding: "8px 20px", fontSize: 13 }}
            >
              <Plus className="h-3.5 w-3.5" /> 계획 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const mt = mountains.find((m) => m.id === plan.mountain_id);
            const participants = participantMap[plan.id] || [];
            const goingCount = participants.filter((p) => p.rsvp_status === "going").length;
            const myRsvp = participants.find((p) => p.user_id === user?.id)?.rsvp_status;
            const creator = creatorMap[(plan as any).creator_id];
            const canManage = user?.id === (plan as any).creator_id || isLeader;

            return (
              <div key={plan.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
                {/* Creator profile */}
                {creator && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        {creator.avatar_url && <AvatarImage src={creator.avatar_url} alt={creator.nickname || ""} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {(creator.nickname || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {creator.nickname || "사용자"}
                          <span className="text-muted-foreground font-normal ml-1">님이 만든 계획</span>
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => openEdit(plan)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

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

      {/* Create/Edit Plan Bottom Sheet */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="relative w-full max-w-lg bg-white dark:bg-card overflow-y-auto"
            style={{ borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "hsl(var(--color-border-secondary))" }} />
            </div>

            <button
              onClick={() => { setShowCreate(false); resetForm(); }}
              className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 style={{ fontSize: 16, fontWeight: 500 }} className="text-foreground mb-4">
              {editingId ? "등산 계획 수정" : "등산 계획 만들기"}
            </h2>

            <div className="space-y-3">
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
              <Button onClick={handleSubmit} disabled={creating || !plannedDate} className="w-full rounded-xl" style={{ background: "#639922" }}>
                {creating ? (editingId ? "수정 중..." : "생성 중...") : (editingId ? "계획 수정하기" : "계획 만들기")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>계획을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 등산 계획과 관련된 참석 정보가 모두 삭제됩니다. 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
