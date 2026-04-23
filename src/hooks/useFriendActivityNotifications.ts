import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotification } from "./usePushNotification";

const SETTINGS_KEY = "notification_settings";
const RATE_LIMIT_KEY = "friend_notification_last_seen";
const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

// --- Settings helpers (shared localStorage key with other notification settings) ---
function getEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).friendActivity !== false;
  } catch {}
  return true;
}

function saveEnabled(enabled: boolean) {
  let s: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) s = JSON.parse(raw);
  } catch {}
  s.friendActivity = enabled;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// --- Rate limiting helpers ---
function getRateLimitMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function isRateLimited(userId: string): boolean {
  const map = getRateLimitMap();
  const last = map[userId];
  return !!last && Date.now() - last < RATE_LIMIT_MS;
}

function markNotified(userId: string) {
  const map = getRateLimitMap();
  map[userId] = Date.now();
  // Clean up old entries
  const cutoff = Date.now() - RATE_LIMIT_MS * 2;
  Object.keys(map).forEach((k) => { if (map[k] < cutoff) delete map[k]; });
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(map));
}

interface UseFriendActivityNotificationsOptions {
  onUnread?: () => void;
}

export function useFriendActivityNotifications({ onUnread }: UseFriendActivityNotificationsOptions = {}) {
  const { user } = useAuth();
  const { isGranted, sendLocalNotification } = usePushNotification();

  const onUnreadRef = useRef(onUnread);
  onUnreadRef.current = onUnread;
  const isGrantedRef = useRef(isGranted);
  isGrantedRef.current = isGranted;
  const sendRef = useRef(sendLocalNotification);
  sendRef.current = sendLocalNotification;

  const friendIdsRef = useRef<string[]>([]);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const [enabled, setEnabledState] = useState(getEnabled);

  // Fetch friend IDs (accepted friendships only)
  const fetchFriendIds = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted");

    if (!data || data.length === 0) { friendIdsRef.current = []; return; }
    friendIdsRef.current = data.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );
  }, []);

  // Helper: fetch nickname
  const fetchNickname = useCallback(async (userId: string): Promise<string> => {
    const { data } = await supabase.from("public_profiles" as any).select("nickname").eq("user_id", userId).single();
    return data?.nickname || "친구";
  }, []);

  // Helper: fetch mountain name
  const fetchMountainName = useCallback(async (mountainId: number): Promise<string> => {
    const { data } = await supabase.from("mountains").select("name_ko").eq("id", mountainId).single();
    return data?.name_ko || "산";
  }, []);

  const subscribe = useCallback(() => {
    if (!user || friendIdsRef.current.length === 0) return;

    // Clean existing
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    // Channel A: summit_claims
    const certChannel = supabase
      .channel("friend_certification_notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "summit_claims" }, async (payload) => {
        const row = payload.new as any;
        if (row.user_id === user.id) return;
        if (!friendIdsRef.current.includes(row.user_id)) return;

        // Always update badge
        onUnreadRef.current?.();

        if (!getEnabled()) return;
        if (isRateLimited(row.user_id)) return;
        markNotified(row.user_id);

        if (!isGrantedRef.current) return;

        const [nickname, mountainName] = await Promise.all([
          fetchNickname(row.user_id),
          fetchMountainName(row.mountain_id),
        ]);

        sendRef.current(
          "친구가 정상을 정복했어요! 🚩",
          `${nickname}님이 ${mountainName} 정상을 인증했어요.`,
          { data: { url: "/records?tab=feed" } }
        );
      })
      .subscribe();

    // Channel B: hiking_journals
    const diaryChannel = supabase
      .channel("friend_diary_notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hiking_journals" }, async (payload) => {
        const row = payload.new as any;
        if (row.user_id === user.id) return;
        if (!friendIdsRef.current.includes(row.user_id)) return;

        onUnreadRef.current?.();

        if (!getEnabled()) return;
        if (isRateLimited(row.user_id)) return;
        markNotified(row.user_id);

        if (!isGrantedRef.current) return;

        const [nickname, mountainName] = await Promise.all([
          fetchNickname(row.user_id),
          row.mountain_id ? fetchMountainName(row.mountain_id) : Promise.resolve(""),
        ]);

        const body = mountainName
          ? `${nickname}님이 ${mountainName} 등산일지를 작성했어요.`
          : `${nickname}님이 등산일지를 작성했어요.`;

        sendRef.current("친구가 등산일지를 올렸어요 📔", body, { data: { url: "/records?tab=feed" } });
      })
      .subscribe();

    channelsRef.current = [certChannel, diaryChannel];
  }, [user, fetchNickname, fetchMountainName]);

  const unsubscribe = useCallback(() => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  }, []);

  // Main lifecycle
  useEffect(() => {
    if (!user) { unsubscribe(); return; }
    if (!enabled) { unsubscribe(); return; }

    let cancelled = false;
    (async () => {
      await fetchFriendIds(user.id);
      if (cancelled) return;
      subscribe();
    })();

    return () => { cancelled = true; unsubscribe(); };
  }, [user, enabled, fetchFriendIds, subscribe, unsubscribe]);

  const setFriendActivityEnabled = useCallback((v: boolean) => {
    saveEnabled(v);
    setEnabledState(v);
  }, []);

  return {
    isFriendActivityEnabled: enabled,
    setFriendActivityEnabled,
  };
}
