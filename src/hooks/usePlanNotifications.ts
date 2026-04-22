import { useEffect, useCallback, useRef } from "react";
import { usePushNotification } from "./usePushNotification";
import { toast } from "sonner";

const SCHEDULED_KEY = "scheduled_plan_notifications";
const SETTINGS_KEY = "notification_settings";
const MAX_TIMEOUT_MS = 24 * 24 * 60 * 60 * 1000; // ~24 days (safe setTimeout limit)

interface ScheduledEntry {
  planId: string;
  dMinusOneId?: number;
  dDayId?: number;
}

function getSettings(): { planDday: boolean } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { planDday: true }; // enabled by default
}

function saveSettings(s: { planDday: boolean }) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
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
const activeTimers = new Map<string, { dMinusOne?: ReturnType<typeof setTimeout>; dDay?: ReturnType<typeof setTimeout> }>();

function clearPlanTimers(planId: string) {
  const timers = activeTimers.get(planId);
  if (timers) {
    if (timers.dMinusOne) clearTimeout(timers.dMinusOne);
    if (timers.dDay) clearTimeout(timers.dDay);
    activeTimers.delete(planId);
  }
  const entries = getScheduled().filter((e) => e.planId !== planId);
  saveScheduled(entries);
}

function clearAllTimers() {
  activeTimers.forEach((timers) => {
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

      // D-1: 8:00 PM the evening before
      const dMinusOneDate = new Date(planDate);
      dMinusOneDate.setDate(dMinusOneDate.getDate() - 1);
      dMinusOneDate.setHours(20, 0, 0, 0);
      const dMinusOneMs = dMinusOneDate.getTime() - now;

      // D-day: 7:00 AM on the day
      const dDayDate = new Date(planDate);
      dDayDate.setHours(7, 0, 0, 0);
      const dDayMs = dDayDate.getTime() - now;

      // Skip if plan date has passed
      if (dDayMs < 0 && dMinusOneMs < 0) return;

      const timers: { dMinusOne?: ReturnType<typeof setTimeout>; dDay?: ReturnType<typeof setTimeout> } = {};

      // Schedule D-1 notification
      if (dMinusOneMs > 0 && dMinusOneMs <= MAX_TIMEOUT_MS) {
        timers.dMinusOne = setTimeout(() => {
          sendRef.current(
            "내일 등산이에요! 🏔",
            `${plan.mountainName} 등산이 내일이에요.\n준비물을 미리 챙겨두세요!`
          );
        }, dMinusOneMs);
      }

      // Schedule D-day notification
      if (dDayMs > 0 && dDayMs <= MAX_TIMEOUT_MS) {
        timers.dDay = setTimeout(() => {
          sendRef.current(
            `오늘 ${plan.mountainName} 등산 날이에요! 🚩`,
            "즐거운 등산 되세요 💪\n정상에서 인증 잊지 마세요!"
          );
        }, dDayMs);
      }

      if (timers.dMinusOne || timers.dDay) {
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

  return {
    schedulePlan,
    unschedulePlan,
    scheduleAll,
    isDdayEnabled,
    setDdayEnabled,
    isPlanScheduled,
  };
}
