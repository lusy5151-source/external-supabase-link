import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mountains } from "@/data/mountains";
import { getMockWeather } from "@/data/mockWeather";
import { useHikingPlans, type PlanParticipant, type HikingPlan, type PlanEditHistory } from "@/hooks/useHikingPlans";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Calendar, Clock, Mountain, Users, Copy, Check,
  Cloud, Sun, CloudRain, CloudSnow, CloudSun, Wind, Droplets,
  Share2, Edit3, History, Save, X, MessageCircle, Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PlanChat from "@/components/PlanChat";
import PlanApplicationManager from "@/components/PlanApplicationManager";

const conditionIcons: Record<string, any> = {
  "맑음": Sun, "구름": CloudSun, "흐림": Cloud, "비": CloudRain, "눈": CloudSnow,
};

const rsvpLabels: Record<string, { label: string; color: string }> = {
  going: { label: "참석", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  interested: { label: "관심", color: "bg-primary/20 text-primary" },
  declined: { label: "불참", color: "bg-destructive/20 text-destructive" },
  pending: { label: "대기", color: "bg-secondary text-muted-foreground" },
};

const fieldLabels: Record<string, string> = {
  notes: "메모",
  start_time: "출발 시간",
  trail_name: "등산 코스",
};

const PlanDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    plans, fetchParticipants, updateRsvp,
    deletePlan, updatePlanWithHistory, fetchEditHistory,
  } = useHikingPlans();
  const { toast } = useToast();

  const [plan, setPlan] = useState<HikingPlan | null>(null);
  const [participants, setParticipants] = useState<PlanParticipant[]>([]);
  const [editHistory, setEditHistory] = useState<PlanEditHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{ nickname: string | null; avatar_url: string | null } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionDone, setCompletionDone] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [saving, setSaving] = useState(false);

  const [canChat, setCanChat] = useState(false);

  useEffect(() => {
    if (!id) return;
    const found = plans.find((p) => p.id === id);
    if (found) {
      setPlan(found);
    } else {
      supabase
        .from("hiking_plans")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => { if (data) setPlan(data as any); });
    }
  }, [plans, id]);

  useEffect(() => {
    if (!id) return;
    fetchParticipants(id).then(setParticipants);
    fetchEditHistory(id).then(setEditHistory);
  }, [id]);

  useEffect(() => {
    if (!plan) return;
    supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("user_id", plan.creator_id)
      .single()
      .then(({ data }) => { if (data) setCreatorProfile(data); });
  }, [plan?.creator_id]);

  useEffect(() => {
    if (!user || !id) return;
    const checkAccess = async () => {
      const { data } = await supabase.rpc("can_access_plan_chat", {
        _user_id: user.id,
        _plan_id: id,
      });
      setCanChat(!!data);
    };
    checkAccess();
  }, [user, id, participants]);

  const mountain = useMemo(
    () => (plan ? mountains.find((m) => m.id === plan.mountain_id) : null),
    [plan]
  );

  const weather = mountain ? getMockWeather(mountain.id) : null;
  const CondIcon = weather ? conditionIcons[weather.condition] || Cloud : Cloud;
  const trail = mountain?.trails?.find((t) => t.name === plan?.trail_name);

  const isCreator = user?.id === plan?.creator_id;
  const myParticipation = participants.find((p) => p.user_id === user?.id);
  const canEdit = isCreator || myParticipation?.rsvp_status === "going";
  const isPastDate = plan ? new Date(plan.planned_date) < new Date() : false;

  const handleRsvp = async (status: string) => {
    if (!id) return;
    const { error } = await updateRsvp(id, status);
    if (!error) {
      toast({ title: `"${rsvpLabels[status]?.label}"(으)로 응답했습니다` });
      fetchParticipants(id).then(setParticipants);
    }
  };

  const handleCopyCode = () => {
    if (!plan) return;
    navigator.clipboard.writeText(plan.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "초대 코드가 복사되었습니다" });
  };

  const handleDelete = async () => {
    if (!id) return;
    await deletePlan(id);
    toast({ title: "계획이 삭제되었습니다" });
    navigate("/plans");
  };

  const startEditing = () => {
    if (!plan) return;
    setEditNotes(plan.notes || "");
    setEditStartTime(plan.start_time?.slice(0, 5) || "");
    setEditing(true);
  };

  const cancelEditing = () => { setEditing(false); };

  const saveEdits = async () => {
    if (!plan || !id) return;
    setSaving(true);
    const updates: Partial<HikingPlan> = {};
    if (editNotes !== (plan.notes || "")) updates.notes = editNotes || null;
    if (editStartTime !== (plan.start_time?.slice(0, 5) || "")) updates.start_time = editStartTime || null;

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    const { error } = await updatePlanWithHistory(id, updates, plan, fieldLabels);
    setSaving(false);
    if (error) {
      toast({ title: "수정 실패", variant: "destructive" });
    } else {
      toast({ title: "계획이 수정되었습니다" });
      setEditing(false);
      fetchEditHistory(id).then(setEditHistory);
    }
  };

  const handleSharedCompletion = async () => {
    if (!plan || !id || !user) return;
    setCompleting(true);

    const { data: acceptedApps } = await supabase
      .from("plan_applications")
      .select("user_id")
      .eq("plan_id", id)
      .eq("status", "accepted");
    const goingParticipants = participants.filter((p) => p.rsvp_status === "going");
    const allUserIds = new Set<string>([
      plan.creator_id,
      ...goingParticipants.map((p) => p.user_id),
      ...(acceptedApps as any[] || []).map((a) => a.user_id),
    ]);

    const { data: completion, error } = await supabase
      .from("shared_completions")
      .insert({
        mountain_id: plan.mountain_id,
        created_by: user.id,
        plan_id: id,
        group_id: plan.group_id,
      } as any)
      .select()
      .single();

    if (error || !completion) {
      toast({ title: "기록 실패", variant: "destructive" });
      setCompleting(false);
      return;
    }

    const participantInserts = [...allUserIds].map((uid) => ({
      shared_completion_id: (completion as any).id,
      user_id: uid,
      verified: true,
      verified_at: new Date().toISOString(),
    }));
    await supabase.from("shared_completion_participants").insert(participantInserts as any);

    setCompleting(false);
    setCompletionDone(true);
    setShowCompletionModal(true);
  };

  if (!plan || !mountain) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Mountain className="h-8 w-8 mb-2" />
        <p className="text-sm">계획을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/plans")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">{mountain.nameKo}</h1>
        <div className="flex gap-1">
          {canEdit && !editing && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          {isCreator && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
              삭제
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className={cn("w-full", canChat ? "grid grid-cols-3" : "grid grid-cols-2")}>
          <TabsTrigger value="info">계획 정보</TabsTrigger>
          <TabsTrigger value="participants">
            <Users className="h-3.5 w-3.5 mr-1" /> 참가자
          </TabsTrigger>
          {canChat && (
            <TabsTrigger value="chat">
              <MessageCircle className="h-3.5 w-3.5 mr-1" /> 채팅
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-primary" />
              <div>
                <p className="font-bold text-foreground">{mountain.nameKo}</p>
                <p className="text-xs text-muted-foreground">{mountain.region} · {mountain.height}m · {mountain.difficulty}</p>
              </div>
            </div>

            {trail && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <p className="font-medium text-foreground">🥾 {trail.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {trail.distance} · ⏱ {trail.duration} · 📍 {trail.startingPoint}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{format(new Date(plan.planned_date), "PPP", { locale: ko })}</span>
              </div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="h-8 text-sm border-primary/30"
                  />
                </div>
              ) : plan.start_time ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{plan.start_time.slice(0, 5)}</span>
                </div>
              ) : null}
            </div>
          </div>

          {weather && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">🌤 예상 날씨</p>
              <div className="flex items-center gap-3">
                <CondIcon className="h-8 w-8 text-sky-500" />
                <div>
                  <p className="text-lg font-bold text-foreground">{weather.temp}°C</p>
                  <p className="text-xs text-muted-foreground">{weather.condition}</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-1"><Wind className="h-3 w-3" /> {weather.windSpeed}km/h</p>
                  <p className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {weather.precipChance}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">📝 메모</p>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="모임 장소, 준비물, 주의사항 등..."
                  className="min-h-[80px] border-primary/30"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                    <X className="h-3 w-3 mr-1" /> 취소
                  </Button>
                  <Button size="sm" onClick={saveEdits} disabled={saving}>
                    <Save className="h-3 w-3 mr-1" /> {saving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {plan.notes || "메모가 없습니다"}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              <Share2 className="inline h-3 w-3 mr-1" />초대 코드
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-mono text-foreground tracking-widest">
                {plan.invite_code}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">👤 만든 사람</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={creatorProfile?.avatar_url || ""} />
                <AvatarFallback className="text-xs">{creatorProfile?.nickname?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{creatorProfile?.nickname || "알 수 없음"}</span>
              {isCreator && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">나</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <button onClick={() => setShowHistory(!showHistory)} className="flex w-full items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <History className="h-3 w-3" /> 수정 기록
              </p>
              <span className="text-xs text-muted-foreground">{editHistory.length}건</span>
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {editHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">수정 기록이 없습니다</p>
                ) : (
                  editHistory.map((h) => (
                    <div key={h.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{h.profile?.nickname || "사용자"}</span>
                        <span className="text-muted-foreground">님이</span>
                        <span className="font-medium text-primary">{h.field_name}</span>
                        <span className="text-muted-foreground">수정</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-1">
                        {format(new Date(h.created_at), "M/d HH:mm", { locale: ko })}
                        {h.old_value && <span className="ml-2 line-through">{h.old_value.slice(0, 30)}</span>}
                        {h.new_value && <span className="ml-1">→ {h.new_value.slice(0, 30)}</span>}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {isPastDate && isCreator && !completionDone && (
            <Button
              onClick={handleSharedCompletion}
              disabled={completing}
              className="w-full gap-2"
              size="lg"
            >
              <Trophy className="h-5 w-5" />
              {completing ? "기록 중..." : "공동 완등 기록하기 🏔"}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="participants" className="space-y-4 mt-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              <Users className="inline h-3 w-3 mr-1" />참가자 ({participants.length})
            </p>

            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">아직 참가자가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => {
                  const rsvp = rsvpLabels[p.rsvp_status] || rsvpLabels.pending;
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.profile?.avatar_url || ""} />
                        <AvatarFallback className="text-[10px]">{p.profile?.nickname?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm text-foreground">{p.profile?.nickname || "사용자"}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", rsvp.color)}>
                        {rsvp.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {myParticipation && !isCreator && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">내 응답</p>
              <div className="flex gap-2">
                {(["going", "interested", "declined"] as const).map((status) => {
                  const info = rsvpLabels[status];
                  return (
                    <Button
                      key={status}
                      variant={myParticipation.rsvp_status === status ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRsvp(status)}
                    >
                      {info.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {(plan as any).is_public && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                📋 참가 신청 관리
              </p>
              <PlanApplicationManager
                planId={plan.id}
                mountainId={plan.mountain_id}
                isCreator={isCreator}
              />
            </div>
          )}
        </TabsContent>

        {canChat && (
          <TabsContent value="chat" className="mt-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <PlanChat planId={plan.id} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="rounded-2xl text-center">
          <DialogHeader>
            <DialogTitle className="text-xl">🎉 함께 완등을 기록했어요!</DialogTitle>
            <DialogDescription className="mt-2">
              참가자 모두의 완등 기록에 추가되었습니다
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Trophy className="h-16 w-16 text-primary mx-auto mb-3" />
            <p className="text-lg font-bold text-foreground">{mountain.nameKo}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(plan.planned_date), "PPP", { locale: ko })}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCompletionModal(false)} className="w-full">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanDetailPage;
