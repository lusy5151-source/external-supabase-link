import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { getAppNotificationPermission, sendAppNotification } from "@/lib/appNotifications";

const SETTINGS_KEY = "notification_settings";
const SCHEDULED_KEY = "plan_alerts_scheduled_v2";
const MAX_WEB_TIMEOUT_MS = 24 * 24 * 60 * 60 * 1000;

type ScheduledAlert = {
  id: number;
  planId: string;
  offset: number;
};

type PlanAlert = {
  id: number;
  title: string;
  body: string;
  at: Date;
  planId: string;
  offset: number;
  route: string;
};

function isEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).planDday !== false;
  } catch {}
  return true;
}

function hashNotificationId(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return 100_000 + (hash % 1_900_000_000);
}

function readScheduled(): ScheduledAlert[] {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULED_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeScheduled(entries: ScheduledAlert[]) {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(entries));
}

function buildAlert(plan: any, mountainName: string, offset: number): PlanAlert | null {
  const planDate = new Date(`${plan.planned_date}T00:00:00`);
  if (Number.isNaN(planDate.getTime())) return null;

  const at = new Date(planDate);
  at.setDate(at.getDate() - offset);
  at.setHours(offset === 0 ? 7 : 20, 0, 0, 0);

  const title =
    offset === 7
      ? `일주일 뒤 ${mountainName} 등산이에요`
      : offset === 3
        ? `3일 뒤 ${mountainName} 등산이에요`
        : offset === 1
          ? `내일 ${mountainName} 등산이에요`
          : `오늘 ${mountainName} 등산 날이에요`;

  const body =
    offset === 7
      ? "일정과 코스를 미리 확인해보세요."
      : offset === 3
        ? "날씨와 준비물을 슬슬 챙겨볼 시간이에요."
        : offset === 1
          ? "준비물을 미리 챙겨두세요."
          : "즐거운 등산 되세요. 정상 인증도 잊지 마세요.";

  return {
    id: hashNotificationId(`${plan.id}:${offset}`),
    title,
    body,
    at,
    planId: plan.id,
    offset,
    route: `/plans/${plan.id}`,
  };
}

async function fetchPlans(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [{ data: createdPlans }, { data: parts }] = await Promise.all([
    supabase
      .from("hiking_plans")
      .select("id, planned_date, mountain_id")
      .eq("creator_id", userId)
      .gte("planned_date", today),
    supabase
      .from("plan_participants")
      .select("plan_id")
      .eq("user_id", userId),
  ]);

  const partIds = (parts || []).map((p: any) => p.plan_id);
  let joined: any[] = [];
  if (partIds.length > 0) {
    const { data } = await supabase
      .from("hiking_plans")
      .select("id, planned_date, mountain_id")
      .in("id", partIds)
      .gte("planned_date", today);
    joined = data || [];
  }

  const plans = Array.from(new Map([...(createdPlans || []), ...joined].map((p: any) => [p.id, p])).values());
  const mountainIds = Array.from(new Set(plans.map((p: any) => p.mountain_id).filter(Boolean)));
  const nameMap = new Map<number, string>();

  if (mountainIds.length > 0) {
    const { data: mts } = await supabase
      .from("mountains")
      .select("id, name_ko")
      .in("id", mountainIds as number[]);
    (mts || []).forEach((m: any) => nameMap.set(m.id, m.name_ko));
  }

  return plans.map((plan: any) => ({
    ...plan,
    mountainName: nameMap.get(plan.mountain_id) || "등산",
  }));
}

async function scheduleNative(alerts: PlanAlert[]) {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const previous = readScheduled();
  if (previous.length > 0) {
    await LocalNotifications.cancel({
      notifications: previous.map((entry) => ({ id: entry.id })),
    });
  }

  if (alerts.length === 0) {
    writeScheduled([]);
    return;
  }

  await LocalNotifications.schedule({
    notifications: alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      body: alert.body,
      schedule: { at: alert.at, allowWhileIdle: true },
      sound: "default",
      extra: { route: alert.route, planId: alert.planId, offset: alert.offset },
    })),
  });

  writeScheduled(alerts.map(({ id, planId, offset }) => ({ id, planId, offset })));
}

function scheduleWeb(alerts: PlanAlert[]) {
  alerts.forEach((alert) => {
    const delay = alert.at.getTime() - Date.now();
    if (delay <= 0 || delay > MAX_WEB_TIMEOUT_MS) return;
    window.setTimeout(() => {
      sendAppNotification(alert.title, alert.body, { data: { route: alert.route } });
    }, delay);
  });
}

const scheduleFor = async (userId: string) => {
  if (!isEnabled()) return;
  const permission = await getAppNotificationPermission();
  if (permission !== "granted") return;

  const plans = await fetchPlans(userId);
  const now = Date.now();
  const alerts = plans.flatMap((plan: any) =>
    [7, 3, 1, 0]
      .map((offset) => buildAlert(plan, plan.mountainName, offset))
      .filter((alert): alert is PlanAlert => !!alert && alert.at.getTime() > now),
  );

  if (Capacitor.isNativePlatform()) await scheduleNative(alerts);
  else scheduleWeb(alerts);
};

export function useSchedulePlanAlerts(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      scheduleFor(userId).catch((error) => console.error("[plan-alerts]", error));
    };

    const w = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const handle = w.requestIdleCallback
      ? w.requestIdleCallback(run, { timeout: 5000 })
      : window.setTimeout(run, 3000);

    return () => {
      cancelled = true;
      if (w.cancelIdleCallback && typeof handle === "number") w.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [userId]);
}
