import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { useMountains } from "@/contexts/MountainsContext";
import { useHikingPlans } from "@/hooks/useHikingPlans";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Mountain, Calendar, Clock, Bell, ChevronRight, Globe, MapPin,
} from "lucide-react";
import PublicPlansList from "@/components/PublicPlansList";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MyPlan {
  id: string;
  creator_id: string;
  mountain_id: number;
  trail_name: string | null;
  planned_date: string;
  start_time: string | null;
  status: string | null;
  is_public: boolean | null;
  meeting_location: string | null;
  group_id: string | null;
  mountain_name: string | null;
  group_name: string | null;
  is_joined: boolean;
}

const PlansPage = () => {
  const { mountains } = useMountains();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTutorialActive, currentStep, steps } = useTutorial();
  const { notifications, markNotificationRead } = useHikingPlans();
  const { toast } = useToast();
  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);

  const handlePlanCreate = () => {
    if (isTutorialActive && steps[currentStep]?.customContent === "plan-checklist") return;
    navigate("/plans/create");
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    const { data, error } = await joinByCode(inviteCode.trim());
    setJoining(false);
    if (error) {
      toast({ title: error.message || "참여 실패", variant: "destructive" });
    } else if (data) {
      toast({ title: "계획에 참여했습니다!" });
      navigate(`/plans/${data.id}`);
    }
  };

  const { isOnboarding } = useOnboarding();

  // Fetch user's own + joined-via-rsvp plans (must be before any early return)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: created, error: e1 } = await (supabase as any)
          .from("hiking_plans")
          .select(
            "id, creator_id, mountain_id, trail_name, planned_date, start_time, status, is_public, meeting_location, group_id, mountains:mountain_id (name_ko), hiking_group:group_id (name)"
          )
          .eq("creator_id", user.id);
        if (e1) console.error("createdPlans error:", JSON.stringify(e1));

        const { data: parts, error: e2 } = await (supabase as any)
          .from("plan_participants")
          .select("plan_id")
          .eq("user_id", user.id)
          .eq("rsvp_status", "going");
        if (e2) console.error("participants error:", JSON.stringify(e2));

        const partIds = (parts || []).map((p: any) => p.plan_id);
        let joined: any[] = [];
        if (partIds.length) {
          const { data: jd, error: e3 } = await (supabase as any)
            .from("hiking_plans")
            .select(
              "id, creator_id, mountain_id, trail_name, planned_date, start_time, status, is_public, meeting_location, group_id, mountains:mountain_id (name_ko), hiking_group:group_id (name)"
            )
            .in("id", partIds)
            .neq("creator_id", user.id);
          if (e3) console.error("joinedPlans error:", JSON.stringify(e3));
          joined = jd || [];
        }

        const merge = (rows: any[], isJoined: boolean): MyPlan[] =>
          rows.map((r) => ({
            id: r.id,
            creator_id: r.creator_id,
            mountain_id: r.mountain_id,
            trail_name: r.trail_name,
            planned_date: r.planned_date,
            start_time: r.start_time,
            status: r.status,
            is_public: r.is_public,
            meeting_location: r.meeting_location,
            group_id: r.group_id,
            mountain_name: r.mountains?.name_ko || null,
            group_name: r.hiking_group?.name || null,
            is_joined: isJoined,
          }));

        const all = [
          ...merge(created || [], false),
          ...merge(joined, true),
        ];
        const unique = Array.from(new Map(all.map((p) => [p.id, p])).values()).sort(
          (a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
        );
        if (!cancelled) setMyPlans(unique);
      } catch (err) {
        console.error("PlansPage fetch error:", JSON.stringify(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || isOnboarding) {
    return <DemoPlansView />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = myPlans.filter(
    (p) => p.status !== "cancelled" && new Date(p.planned_date) >= today
  );
  const past = myPlans.filter(
    (p) => p.status === "cancelled" || new Date(p.planned_date) < today
  );

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-foreground text-base">등산 계획</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowJoin(!showJoin)}>
            <Link2 className="h-4 w-4 mr-1" /> 코드 참여
          </Button>
          <Button data-onboarding="plan-create" size="sm" onClick={handlePlanCreate}>
            <Plus className="h-4 w-4 mr-1" /> 새 계획
          </Button>
        </div>
      </div>

      {/* Join by code */}
      {showJoin && (
        <div className="rounded-xl border border-border bg-card p-4 flex gap-2">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="초대 코드 입력..."
            className="font-mono tracking-widest"
          />
          <Button onClick={handleJoinByCode} disabled={joining}>
            {joining ? "참여 중..." : "참여"}
          </Button>
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-1">
            <Bell className="h-4 w-4 text-primary" /> 알림
          </p>
          {notifications.slice(0, 3).map((n) => (
            <div
              key={n.id}
              className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 cursor-pointer"
              onClick={() => {
                markNotificationRead(n.id);
                navigate(`/plans/${n.plan_id}`);
              }}
            >
              <Bell className="h-4 w-4 text-primary shrink-0" />
              <p className="flex-1 text-sm text-foreground">{n.message}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {/* Tabs: 내 계획 / 공개 일정 */}
      <Tabs defaultValue="my" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="my">내 계획</TabsTrigger>
          <TabsTrigger value="public">공개 일정</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-5 mt-4">
          {/* Upcoming Plans */}
          <section>
            <p className="text-sm font-medium text-muted-foreground mb-2">다가오는 계획 ({upcoming.length})</p>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Mountain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">아직 계획이 없습니다</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/plans/create")}>
                  첫 계획 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((plan) => {
                  const mountainName =
                    plan.mountain_name ||
                    mountains.find((m) => m.id === plan.mountain_id)?.nameKo ||
                    "산";
                  return (
                    <Link
                      key={plan.id}
                      to={`/plans/${plan.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Mountain className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-foreground">{mountainName}</p>
                          {plan.is_joined && (
                            <span
                              style={{
                                background: "#EAF3DE",
                                color: "#27500A",
                                fontSize: 10,
                                borderRadius: 10,
                                padding: "1px 6px",
                                fontWeight: 500,
                                lineHeight: 1.4,
                              }}
                            >
                              산악회 참여
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(plan.planned_date), "M/d (EEE)", { locale: ko })}
                          </span>
                          {plan.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {plan.start_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        {plan.trail_name && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">🥾 {plan.trail_name}</p>
                        )}
                        {plan.meeting_location && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {plan.meeting_location}
                          </p>
                        )}
                        {plan.is_public && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-primary mt-0.5">
                            <Globe className="h-2.5 w-2.5" /> 공개
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Past Plans */}
          {past.length > 0 && (
            <section>
              <p className="text-sm font-medium text-muted-foreground mb-2">지난 계획 ({past.length})</p>
              <div className="space-y-2 opacity-60">
                {past.map((plan) => {
                  const mountainName =
                    plan.mountain_name ||
                    mountains.find((m) => m.id === plan.mountain_id)?.nameKo ||
                    "산";
                  return (
                    <Link
                      key={plan.id}
                      to={`/plans/${plan.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-secondary/50 transition-colors"
                    >
                      <Mountain className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground flex-1">{mountainName}</span>
                      {plan.is_joined && (
                        <span
                          style={{
                            background: "#EAF3DE",
                            color: "#27500A",
                            fontSize: 10,
                            borderRadius: 10,
                            padding: "1px 6px",
                            fontWeight: 500,
                          }}
                        >
                          산악회 참여
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(plan.planned_date), "M/d", { locale: ko })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          <PublicPlansList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

function DemoPlansView() {
  const { isTutorialActive, currentStep, steps } = useTutorial();
  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };

  const demoPlans = [
    { id: "demo-1", mountainName: "북한산", date: daysFromNow(3), time: "08:00", trail: "백운대 코스" },
    { id: "demo-2", mountainName: "관악산", date: daysFromNow(7), time: "09:30", trail: "관악문 코스" },
    { id: "demo-3", mountainName: "도봉산", date: daysFromNow(14), time: "07:00", trail: "신선대 코스" },
  ];

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-foreground text-base">등산 계획</h1>
        <div className="flex gap-2">
          <Link to="/auth" onClick={(e) => {
            if (isTutorialActive && steps[currentStep]?.customContent === "plan-checklist") e.preventDefault();
          }}>
            <Button data-onboarding="plan-create" size="sm">
              <Plus className="h-4 w-4 mr-1" /> 새 계획
            </Button>
          </Link>
        </div>
      </div>

      <section>
        <p className="text-sm font-medium text-muted-foreground mb-2">다가오는 계획 ({demoPlans.length})</p>
        <div className="space-y-2.5">
          {demoPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Mountain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{plan.mountainName}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(plan.date, "M/d (EEE)", { locale: ko })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {plan.time}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">🥾 {plan.trail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default PlansPage;
