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
import { Calendar, MapPin, Plus, UserCheck, Clock, Mountain, X, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
  const [expandedParticipants, setExpandedParticipants] = useState<Record<string, boolean>>({});

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

      // Fetch participant profiles
      const participantUserIds = [...new Set((parts as any[] || []).map((p) => p.user_id).filter(Boolean))];
      const { data: partProfiles } = participantUserIds.length
        ? await supabase
            .from("public_profiles")
            .select("user_id, nickname, avatar_url")
            .in("user_id", participantUserIds)
        : { data: [] as any[] };
      const partProfileMap: Record<string, { nickname: string | null; avatar_url: string | null }> = {};
      (partProfiles as any[] || []).forEach((p) => {
        partProfileMap[p.user_id] = { nickname: p.nickname, avatar_url: p.avatar_url };
      });

      const map: Record<string, PlanParticipant[]> = {};
      (parts as any[] || []).forEach((p) => {
        if (!map[p.plan_id]) map[p.plan_id] = [];
        map[p.plan_id].push({ ...p, profile: partProfileMap[p.user_id] });
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

  const handleRsvp = async (planId: string, status: "going" | "interested" | "not_going") => {
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
        invited_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
      } as any);
    }
    fetchPlans();
    const msg =
      status === "going"
        ? "계획에 참석해요! 🏔"
        : status === "interested"
        ? "관심 있는 계획으로 표시했어요 👀"
        : "불참으로 변경했어요";
    toast({ title: msg });
  };

  const rsvpLabels: Record<string, string> = { going: "참석", interested: "관심", not_going: "불참", declined: "불참", pending: "대기" };

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
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--brand-lime))", borderRadius: "var(--border-radius-lg)" }}>
          <p style={{ fontSize: 13, color: "#3B6D11", fontWeight: 500 }}>아직 등산 계획이 없어요</p>
          <p style={{ fontSize: 12, color: "#3B6D11", marginTop: 4 }}>멤버들과 함께 첫 계획을 만들어볼까요?</p>
          {isMember && (
            <button
              onClick={openCreate}
              className="mt-3 inline-flex items-center gap-1 font-medium text-white"
              style={{ background: "hsl(var(--brand-lime))", color: "hsl(var(--brand-forest))", borderRadius: "var(--border-radius-md)", padding: "8px 20px", fontSize: 13 }}
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
            const goingList = participants.filter((p) => p.rsvp_status === "going");
            const interestedList = participants.filter((p) => p.rsvp_status === "interested");
            const notGoingList = participants.filter(
              (p) => p.rsvp_status === "not_going" || p.rsvp_status === "declined"
            );
            const goingCount = goingList.length;
            const interestedCount = interestedList.length;
            const myRsvp = participants.find((p) => p.user_id === user?.id)?.rsvp_status;
            const myRsvpKey: "going" | "interested" | "not_going" | undefined =
              myRsvp === "going"
                ? "going"
                : myRsvp === "interested"
                ? "interested"
                : myRsvp === "not_going" || myRsvp === "declined"
                ? "not_going"
                : undefined;
            const creator = creatorMap[(plan as any).creator_id];
            const canManage = !!user && user.id === (plan as any).creator_id;
            const expanded = !!expandedParticipants[plan.id];
            const stackAvatars = [...goingList, ...interestedList].slice(0, 3);

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

                {/* Participants summary (tappable, expands) */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedParticipants((prev) => ({ ...prev, [plan.id]: !prev[plan.id] }))
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left transition-colors hover:bg-secondary/40"
                  style={{ fontSize: 12, color: "hsl(var(--color-text-secondary))" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {stackAvatars.length > 0 ? (
                      <div className="flex items-center">
                        {stackAvatars.map((p, i) => (
                          <Avatar
                            key={p.id}
                            className="h-6 w-6 border-2 border-card"
                            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: stackAvatars.length - i }}
                          >
                            {p.profile?.avatar_url && (
                              <AvatarImage src={p.profile.avatar_url} alt={p.profile?.nickname || ""} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                              {(p.profile?.nickname || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : null}
                    <span className="truncate">
                      {goingCount}명 참석 · {interestedCount}명 관심
                    </span>
                  </div>
                  {expanded ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>

                {expanded && (goingList.length + interestedList.length + notGoingList.length > 0) && (
                  <div
                    style={{
                      background: "hsl(var(--color-background-secondary))",
                      borderRadius: "var(--border-radius-md)",
                      padding: "8px 12px",
                      marginTop: 8,
                    }}
                  >
                    {[
                      { label: "✅ 참석", color: "hsl(var(--brand-forest))", bg: "hsl(var(--brand-lime))", list: goingList },
                      { label: "👀 관심", color: "#633806", bg: "#FAEEDA", list: interestedList },
                      { label: "❌ 불참", color: "#A32D2D", bg: "#FCEBEB", list: notGoingList },
                    ].map((section) =>
                      section.list.length === 0 ? null : (
                        <div key={section.label}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: section.color,
                              padding: "8px 0 4px",
                            }}
                          >
                            {section.label} ({section.list.length}명)
                          </div>
                          <div className="space-y-1.5">
                            {section.list.map((p) => (
                              <div key={p.id} className="flex items-center gap-2">
                                <Avatar className="h-7 w-7" style={{ background: section.bg }}>
                                  {p.profile?.avatar_url && (
                                    <AvatarImage
                                      src={p.profile.avatar_url}
                                      alt={p.profile?.nickname || ""}
                                    />
                                  )}
                                  <AvatarFallback
                                    style={{ background: section.bg, color: section.color, fontSize: 11 }}
                                  >
                                    {(p.profile?.nickname || "?").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span style={{ fontSize: 13 }} className="text-foreground">
                                  {p.profile?.nickname || "사용자"}
                                </span>
                                {p.user_id === user?.id && (
                                  <span style={{ fontSize: 11 }} className="text-muted-foreground">
                                    (나)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* RSVP buttons */}
                {isMember && (
                  <div className="flex gap-2">
                    {(["going", "interested", "not_going"] as const).map((s) => {
                      const active = myRsvpKey === s;
                      const baseStyle: React.CSSProperties = { fontSize: 11, height: 28, padding: "0 12px" };
                      let activeStyle: React.CSSProperties = {};
                      if (active) {
                        if (s === "going") {
                          activeStyle = { background: "hsl(var(--brand-lime))", color: "hsl(var(--brand-forest))", borderColor: "hsl(var(--brand-lime))" };
                        } else if (s === "interested") {
                          activeStyle = {
                            background: "#FAEEDA",
                            color: "#633806",
                            border: "0.5px solid hsl(var(--brand-coral))",
                          };
                        } else {
                          activeStyle = {
                            background: "#FCEBEB",
                            color: "#A32D2D",
                            border: "0.5px solid hsl(var(--brand-coral))",
                          };
                        }
                      }
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className="rounded-full"
                          style={{ ...baseStyle, ...activeStyle }}
                          onClick={() => handleRsvp(plan.id, s)}
                        >
                          {rsvpLabels[s]}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Plan Bottom Sheet */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => { setShowCreate(false); resetForm(); }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="relative w-full max-w-lg bg-white dark:bg-card flex flex-col overflow-hidden"
            style={{
              borderRadius: "20px 20px 0 0",
              maxHeight: "calc(100dvh - 120px)",
              marginBottom: "calc(92px + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (fixed) */}
            <div className="shrink-0 px-5 pt-5 pb-2 relative">
              <div className="flex justify-center mb-4">
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "hsl(var(--color-border-secondary))" }} />
              </div>

              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="absolute top-4 right-4 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 style={{ fontSize: 16, fontWeight: 500 }} className="text-foreground">
                {editingId ? "등산 계획 수정" : "등산 계획 만들기"}
              </h2>
            </div>

            {/* Scrollable body */}
            <div
              className="flex-1 overflow-y-auto"
              style={{
                padding: "8px 20px 0 20px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div className="space-y-3 pb-4">
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
              </div>
            </div>

            {/* Fixed bottom action footer */}
            <div
              className="shrink-0"
              style={{
                background: "hsl(var(--color-background-primary))",
                borderTop: "0.5px solid hsl(var(--color-border-tertiary))",
                padding: "16px 20px",
                paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <Button
                onClick={handleSubmit}
                disabled={creating || !plannedDate}
                className="w-full"
                style={{
                  background: "hsl(var(--brand-lime))",
                  color: "white",
                  height: 48,
                  borderRadius: "var(--border-radius-md, 12px)",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
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
