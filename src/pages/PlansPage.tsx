import { useState, useEffect, useMemo } from "react";
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
  Plus, Mountain, Calendar, Clock, Bell, ChevronRight, Globe, MapPin, Users,
} from "lucide-react";
import PublicPlansList from "@/components/PublicPlansList";
import { MyPlansCalendar } from "@/components/MyPlansCalendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type PlanRole = "creator" | "going" | "interested";

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
  role: PlanRole;
  participant_count: number;
  journal_id: string | null;
}

const RoleBadge = ({ role, compact = false }: { role: PlanRole; compact?: boolean }) => {
  if (role === "creator") return null;
  const styles =
    role === "interested"
      ? { background: "#FAEEDA", color: "#633806", label: "관심" }
      : { background: "#EAF3DE", color: "#27500A", label: "참석" };
  return (
    <span
      style={{
        background: styles.background,
        color: styles.color,
        fontSize: 10,
        borderRadius: 10,
        padding: "1px 6px",
        fontWeight: 500,
        lineHeight: compact ? undefined : 1.4,
      }}
    >
      {styles.label}
    </span>
  );
};

const PlansPage = () => {
  const { mountains } = useMountains();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTutorialActive, currentStep, steps } = useTutorial();
  const { notifications, markNotificationRead } = useHikingPlans();
  const { toast } = useToast();
  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handlePlanCreate = () => {
    if (isTutorialActive && steps[currentStep]?.customContent === "plan-checklist") return;
    navigate("/plans/create");
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
          .select("plan_id, rsvp_status")
          .eq("user_id", user.id)
          .in("rsvp_status", ["going", "interested"]);
        if (e2) console.error("participants error:", JSON.stringify(e2));

        const createdIds = new Set((created || []).map((r: any) => r.id));
        const partFiltered = (parts || []).filter(
          (p: any) => !createdIds.has(p.plan_id)
        );
        const partIds = partFiltered.map((p: any) => p.plan_id);
        let joined: any[] = [];
        if (partIds.length) {
          const { data: jd, error: e3 } = await (supabase as any)
            .from("hiking_plans")
            .select(
              "id, creator_id, mountain_id, trail_name, planned_date, start_time, status, is_public, meeting_location, group_id, mountains:mountain_id (name_ko), hiking_group:group_id (name)"
            )
            .in("id", partIds);
          if (e3) console.error("joinedPlans error:", JSON.stringify(e3));
          joined = jd || [];
        }

        const mapRow = (r: any, role: PlanRole): MyPlan => ({
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
          role,
          participant_count: 0,
          journal_id: null,
        });

        const all: MyPlan[] = [
          ...(created || []).map((r: any) => mapRow(r, "creator")),
          ...joined.map((r: any) => {
            const rsvp = partFiltered.find((p: any) => p.plan_id === r.id)?.rsvp_status;
            const role: PlanRole = rsvp === "interested" ? "interested" : "going";
            return mapRow(r, role);
          }),
        ];
        const unique = Array.from(new Map(all.map((p) => [p.id, p])).values()).sort(
          (a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime()
        );

        // Fetch participant counts (going only) and journals for these plans
        const allIds = unique.map((p) => p.id);
        if (allIds.length) {
          const [{ data: allParts }, { data: journals }] = await Promise.all([
            (supabase as any)
              .from("plan_participants")
              .select("plan_id, rsvp_status")
              .in("plan_id", allIds)
              .eq("rsvp_status", "going"),
            (supabase as any)
              .from("hiking_journals")
              .select("id, plan_id")
              .in("plan_id", allIds)
              .eq("user_id", user.id),
          ]);
          const countMap = new Map<string, number>();
          (allParts || []).forEach((p: any) => {
            countMap.set(p.plan_id, (countMap.get(p.plan_id) || 0) + 1);
          });
          const journalMap = new Map<string, string>();
          (journals || []).forEach((j: any) => {
            if (j.plan_id) journalMap.set(j.plan_id, j.id);
          });
          unique.forEach((p) => {
            p.participant_count = countMap.get(p.id) || 0;
            p.journal_id = journalMap.get(p.id) || null;
          });
        }

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

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-foreground text-base">등산 계획</h1>
        <div className="flex gap-2">
          <Button data-onboarding="plan-create" size="sm" onClick={handlePlanCreate}>
            <Plus className="h-4 w-4 mr-1" /> 새 계획
          </Button>
        </div>
      </div>


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

        <TabsContent value="my" className="space-y-4 mt-4">
          {/* Calendar */}
          <MyPlansCalendar
            plans={myPlans.map((p) => ({ id: p.id, planned_date: p.planned_date }))}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {(() => {
            const filteredAll = selectedDate
              ? myPlans.filter((p) => p.planned_date === selectedDate)
              : myPlans;
            const filteredUpcoming = filteredAll.filter(
              (p) => p.status !== "cancelled" && new Date(p.planned_date) >= today
            );
            const filteredPast = filteredAll.filter(
              (p) => p.status === "cancelled" || new Date(p.planned_date) < today
            );

            if (selectedDate && filteredAll.length === 0) {
              return (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-[13px] text-muted-foreground mb-3">
                    이 날은 등산 계획이 없어요
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/plans/create?date=${selectedDate}`)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> 계획 만들기
                  </Button>
                </div>
              );
            }

            return (
              <>
                {/* Upcoming */}
                {filteredUpcoming.length > 0 && (
                  <section>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "hsl(var(--muted-foreground))",
                        padding: "12px 0 8px",
                      }}
                    >
                      다가오는 일정 ({filteredUpcoming.length})
                    </p>
                    <div>
                      {filteredUpcoming.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          mountainNameFallback={
                            mountains.find((m) => m.id === plan.mountain_id)?.nameKo || "산"
                          }
                          isPast={false}
                          onJournalCreate={() => {
                            navigate("/records", {
                              state: {
                                openJournalForm: true,
                                prefillMountainId: plan.mountain_id,
                                prefillDate: plan.planned_date,
                              },
                            });
                          }}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Past */}
                {filteredPast.length > 0 && (
                  <section>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "hsl(var(--muted-foreground))",
                        padding: "12px 0 8px",
                      }}
                    >
                      지난 일정 ({filteredPast.length})
                    </p>
                    <div>
                      {filteredPast.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          mountainNameFallback={
                            mountains.find((m) => m.id === plan.mountain_id)?.nameKo || "산"
                          }
                          isPast
                          onJournalCreate={() => {
                            navigate("/records", {
                              state: {
                                openJournalForm: true,
                                prefillMountainId: plan.mountain_id,
                                prefillDate: plan.planned_date,
                              },
                            });
                          }}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {!selectedDate &&
                  filteredUpcoming.length === 0 &&
                  filteredPast.length === 0 && (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <Mountain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">아직 계획이 없습니다</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => navigate("/plans/create")}
                      >
                        첫 계획 만들기
                      </Button>
                    </div>
                  )}
              </>
            );
          })()}
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
