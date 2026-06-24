import { useEffect, useCallback, useRef } from "react";
import { usePushNotification } from "./usePushNotification";
import { toast } from "sonner";

const SCHEDULED_KEY = "scheduled_plan_notifications";
const SETTINGS_KEY = "notification_settings";
const MAX_TIMEOUT_MS = 24 * 24 * 60 * 60 * 1000; // ~24 days (safe setTimeout limit)

interface ScheduledEntry {
  planId: string;
  dMinusSevenId?: number;
  dMinusThreeId?: number;
  dMinusOneId?: number;
  dDayId?: number;
}

function getSettings(): { planDday: boolean } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { planDday: JSON.parse(raw).planDday !== false };
  } catch {}
  return { planDday: true }; // enabled by default
}

function saveSettings(s: { planDday: boolean }) {
  let current: Record<string, any> = {};
  try {
    current = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {}
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...s }));
}

function getScheduled(): ScheduledEntry[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveScheduled(entries: ScheduledEntry[]) {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(entries));
}

// Active timer IDs (runtime only — localStorage stores plan IDs for re-scheduling)
const activeTimers = new Map<
  string,
  {
    dMinusSeven?: ReturnType<typeof setTimeout>;
    dMinusThree?: ReturnType<typeof setTimeout>;
    dMinusOne?: ReturnType<typeof setTimeout>;
    dDay?: ReturnType<typeof setTimeout>;
  }
>();

function clearPlanTimers(planId: string) {
  const timers = activeTimers.get(planId);
  if (timers) {
    if (timers.dMinusSeven) clearTimeout(timers.dMinusSeven);
    if (timers.dMinusThree) clearTimeout(timers.dMinusThree);
    if (timers.dMinusOne) clearTimeout(timers.dMinusOne);
    if (timers.dDay) clearTimeout(timers.dDay);
    activeTimers.delete(planId);
  }
  const entries = getScheduled().filter((e) => e.planId !== planId);
  saveScheduled(entries);
}

function clearAllTimers() {
  activeTimers.forEach((timers) => {
    if (timers.dMinusSeven) clearTimeout(timers.dMinusSeven);
    if (timers.dMinusThree) clearTimeout(timers.dMinusThree);
    if (timers.dMinusOne) clearTimeout(timers.dMinusOne);
    if (timers.dDay) clearTimeout(timers.dDay);
  });
  activeTimers.clear();
  saveScheduled([]);
}

export interface PlanForNotification {
  id: string;
  planned_date: string;
  mountainName: string;
}

export function usePlanNotifications() {
  const { isGranted, sendLocalNotification } = usePushNotification();
  const sendRef = useRef(sendLocalNotification);
  sendRef.current = sendLocalNotification;

  const schedulePlan = useCallback(
    (plan: PlanForNotification) => {
      const settings = getSettings();
      if (!settings.planDday) return;
      if (!isGranted) return;

      // Clear existing timers for this plan
      clearPlanTimers(plan.id);

      const now = Date.now();
      const planDate = new Date(plan.planned_date);

      const entries = [
        {
          key: "dMinusSeven" as const,
          offset: 7,
          hour: 20,
          title: `일주일 뒤 ${plan.mountainName} 등산이에요`,
          body: "일정과 코스를 미리 확인해보세요.",
        },
        {
          key: "dMinusThree" as const,
          offset: 3,
          hour: 20,
          title: `3일 뒤 ${plan.mountainName} 등산이에요`,
          body: "날씨와 준비물을 슬슬 챙겨볼 시간이에요.",
        },
        {
          key: "dMinusOne" as const,
          offset: 1,
          hour: 20,
          title: "내일 등산이에요!",
          body: `${plan.mountainName} 등산이 내일이에요.\n준비물을 미리 챙겨두세요!`,
        },
        {
          key: "dDay" as const,
          offset: 0,
          hour: 7,
          title: `오늘 ${plan.mountainName} 등산 날이에요!`,
          body: "즐거운 등산 되세요.\n정상에서 인증 잊지 마세요!",
        },
      ];

      const timers: NonNullable<ReturnType<typeof activeTimers.get>> = {};

      entries.forEach((entry) => {
        const at = new Date(planDate);
        at.setDate(at.getDate() - entry.offset);
        at.setHours(entry.hour, 0, 0, 0);
        const ms = at.getTime() - now;
        if (ms <= 0 || ms > MAX_TIMEOUT_MS) return;
        timers[entry.key] = setTimeout(() => {
          sendRef.current(entry.title, entry.body, { data: { route: `/plans/${plan.id}` } });
        }, ms);
      });

      if (timers.dMinusSeven || timers.dMinusThree || timers.dMinusOne || timers.dDay) {
        activeTimers.set(plan.id, timers);
        const entries = getScheduled().filter((e) => e.planId !== plan.id);
        entries.push({ planId: plan.id });
        saveScheduled(entries);
      }
    },
    [isGranted]
  );

  const unschedulePlan = useCallback((planId: string) => {
    clearPlanTimers(planId);
  }, []);

  const scheduleAll = useCallback(
    (plans: PlanForNotification[]) => {
      clearAllTimers();
      const settings = getSettings();
      if (!settings.planDday || !isGranted) return;

      const now = new Date();
      plans
        .filter((p) => new Date(p.planned_date) >= now)
        .forEach((p) => schedulePlan(p));
    },
    [isGranted, schedulePlan]
  );

  const isDdayEnabled = getSettings().planDday;

  const setDdayEnabled = useCallback(
    (enabled: boolean, plans?: PlanForNotification[]) => {
      saveSettings({ planDday: enabled });
      if (!enabled) {
        clearAllTimers();
      } else if (plans) {
        if (!isGranted) {
          toast("알림을 받으려면 알림 설정에서 허용해주세요");
          return;
        }
        scheduleAll(plans);
      }
    },
    [isGranted, scheduleAll]
  );

  const isPlanScheduled = useCallback((planId: string) => {
    return activeTimers.has(planId) || getScheduled().some((e) => e.planId === planId);
  }, []);

  const testNotification = useCallback(
    (mountainName: string) => {
      if (!("Notification" in window)) {
        toast.error("이 기기에서 알림을 사용할 수 없어요");
        return;
      }
      if (Notification.permission !== "granted") {
        toast.error("알림 권한이 없어요. 마이 → 알림 설정에서 허용해주세요");
        return;
      }
      toast("10초 후 알림이 울립니다 ⏰");
      setTimeout(() => {
        try {
          const n = sendRef.current(
            `오늘 ${mountainName} 등산 날이에요! 🚩`,
            "즐거운 등산 되세요 💪\n정상에서 인증 잊지 마세요!"
          );
          if (n) {
            n.onshow = () => toast.success("알림이 성공적으로 전송됐어요! ✅");
            n.onerror = () => toast.error("알림 전송에 실패했어요. 브라우저 설정을 확인해주세요");
          } else {
            toast.error("알림 생성 실패 — 권한이 해제되었을 수 있어요");
          }
        } catch (err) {
          toast.error(`알림 오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
        }
      }, 10_000);
    },
    []
  );

  const sendNow = useCallback(
    (title: string, body: string, icon?: string) => {
      if (!isGranted) {
        toast.error("알림 권한이 없어요. 마이 → 알림 설정에서 허용해주세요");
        return Promise.resolve(false);
      }
      return Promise.resolve(
        sendLocalNotification(title, body, icon ? { icon } : undefined)
      ).then((n) => {
        if (n) {
          toast.success("알림이 성공적으로 전송됐어요! ✅");
          return true;
        } else {
          toast.error("알림 전송에 실패했어요");
          return false;
        }
      });
    },
    [isGranted, sendLocalNotification]
  );

  return {
    schedulePlan,
    unschedulePlan,
    scheduleAll,
    isDdayEnabled,
    setDdayEnabled,
    isPlanScheduled,
    testNotification,
    sendNow,
  };
}
