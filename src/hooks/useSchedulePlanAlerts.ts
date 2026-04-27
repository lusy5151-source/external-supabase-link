import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SENT_KEY = "plan_alerts_sent_v1";

const getSent = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
};

const markSent = (key: string) => {
  const s = getSent();
  s[key] = true;
  localStorage.setItem(SENT_KEY, JSON.stringify(s));
};

const fire = (key: string, title: string, body: string) => {
  if (Notification.permission !== "granted") return;
  if (getSent()[key]) return;
  try {
    new Notification(title, { body, icon: "/icon-192.png" });
    markSent(key);
  } catch (e) {
    console.error("plan alert error:", JSON.stringify(e));
  }
};

const scheduleFor = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];

  // Plans I'm involved in (creator or participant)
  const { data: createdPlans } = await supabase
    .from("hiking_plans")
    .select("id, planned_date, mountain_id, mountains:mountain_id (name_ko)")
    .eq("creator_id", user.id)
    .gte("planned_date", today);

  const { data: parts } = await supabase
    .from("plan_participants")
    .select("plan_id")
    .eq("user_id", user.id);

  const partIds = (parts || []).map((p: any) => p.plan_id);
  let joined: any[] = [];
  if (partIds.length) {
    const { data } = await supabase
      .from("hiking_plans")
      .select("id, planned_date, mountain_id, mountains:mountain_id (name_ko)")
      .in("id", partIds)
      .gte("planned_date", today);
    joined = data || [];
  }

  const all = [...(createdPlans || []), ...joined];
  const unique = Array.from(new Map(all.map((p: any) => [p.id, p])).values());

  const now = Date.now();

  unique.forEach((p: any) => {
    const mountainName = p.mountains?.name_ko || "등산";
    const planDate = new Date(p.planned_date);

    // D-1 at 20:00 the night before
    const dMinus1 = new Date(planDate);
    dMinus1.setDate(dMinus1.getDate() - 1);
    dMinus1.setHours(20, 0, 0, 0);

    // D-day at 07:00
    const dDay = new Date(planDate);
    dDay.setHours(7, 0, 0, 0);

    const dMinus1Key = `${p.id}_d-1`;
    const dDayKey = `${p.id}_d-day`;

    const dMinus1Delay = dMinus1.getTime() - now;
    const dDayDelay = dDay.getTime() - now;

    // If we're past D-1 time but still on D-1 day (or close), fire immediately
    if (dMinus1Delay <= 0 && dMinus1Delay > -12 * 3600_000) {
      fire(
        dMinus1Key,
        `내일 ${mountainName} 등산이에요! 🏔`,
        "준비물을 미리 챙겨두세요!"
      );
    } else if (dMinus1Delay > 0 && dMinus1Delay < 24 * 3600_000) {
      setTimeout(() => {
        fire(
          dMinus1Key,
          `내일 ${mountainName} 등산이에요! 🏔`,
          "준비물을 미리 챙겨두세요!"
        );
      }, dMinus1Delay);
    }

    if (dDayDelay <= 0 && dDayDelay > -12 * 3600_000) {
      fire(
        dDayKey,
        `오늘 ${mountainName} 등산 날이에요! 🚩`,
        "즐거운 등산 되세요 💪 정상 인증 잊지 마세요!"
      );
    } else if (dDayDelay > 0 && dDayDelay < 24 * 3600_000) {
      setTimeout(() => {
        fire(
          dDayKey,
          `오늘 ${mountainName} 등산 날이에요! 🚩`,
          "즐거운 등산 되세요 💪 정상 인증 잊지 마세요!"
        );
      }, dDayDelay);
    }
  });
};

export function useSchedulePlanAlerts() {
  useEffect(() => {
    scheduleFor().catch((e) => console.error(JSON.stringify(e)));
  }, []);
}
