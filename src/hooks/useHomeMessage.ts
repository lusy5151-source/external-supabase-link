import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type HomeMessageRow = {
  id: string;
  season: string | null;
  time_of_day: string | null;
  condition: string | null;
  message: string;
  is_active: boolean | null;
};

const getSeason = (month: number) => {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};
const getTimeOfDay = (hour: number) => {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "noon";
  if (hour >= 14 && hour < 18) return "afternoon";
  return "night";
};

type UserCondition = "summit_today" | "long_inactive" | "streak" | "default";

const pickRandom = <T,>(arr: T[]): T | null => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);

export function useHomeMessage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HomeMessageRow[]>([]);
  const [userCondition, setUserCondition] = useState<UserCondition>("default");

  // Fetch messages once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("home_messages")
        .select("id, season, time_of_day, condition, message, is_active")
        .eq("is_active", true);
      if (cancelled) return;
      if (error) {
        console.error("[useHomeMessage] fetch error", error);
        return;
      }
      setRows((data || []) as HomeMessageRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Determine user condition from summit_claims
  useEffect(() => {
    let cancelled = false;
    if (!user) { setUserCondition("default"); return; }
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await (supabase as any)
        .from("summit_claims")
        .select("claimed_at")
        .eq("user_id", user.id)
        .gte("claimed_at", since.toISOString())
        .order("claimed_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[useHomeMessage] claims error", error);
        setUserCondition("default");
        return;
      }
      const claims: { claimed_at: string }[] = data || [];
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

      const todayCount = claims.filter(c => new Date(c.claimed_at).getTime() >= startOfToday).length;
      const weekCount = claims.filter(c => new Date(c.claimed_at).getTime() >= sevenDaysAgo).length;
      const latest = claims[0] ? new Date(claims[0].claimed_at).getTime() : 0;

      if (todayCount > 0) setUserCondition("summit_today");
      else if (weekCount >= 3) setUserCondition("streak");
      else if (!latest || latest < sevenDaysAgo) setUserCondition("long_inactive");
      else setUserCondition("default");
    })();
    return () => { cancelled = true; };
  }, [user]);

  const message = useMemo(() => {
    if (!rows.length) return "";
    const now = new Date();
    const season = getSeason(now.getMonth() + 1);
    const timeofday = getTimeOfDay(now.getHours());

    // Priority 1: condition match
    if (userCondition !== "default") {
      const matches = rows.filter(r => r.condition === userCondition);
      const picked = pickRandom(matches);
      if (picked) return picked.message;
    }

    // Priority 2: default + season + timeofday
    const defaults = rows.filter(r =>
      r.condition === "default" &&
      (r.season === season || r.season === "all") &&
      (r.time_of_day === timeofday || r.time_of_day === "all")
    );
    const picked = pickRandom(defaults);
    if (picked) return picked.message;

    // Fallback: any default
    return pickRandom(rows.filter(r => r.condition === "default"))?.message ?? "";
  }, [rows, userCondition]);

  return message;
}
