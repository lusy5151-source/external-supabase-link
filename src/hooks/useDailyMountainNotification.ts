import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import type { Mountain } from "@/data/mountains";
import { useMountains } from "@/contexts/MountainsContext";
import { usePushNotification } from "@/hooks/usePushNotification";
import type { LocalNotificationSchema } from "@capacitor/local-notifications";

const SETTINGS_KEY = "notification_settings";
const LAST_SENT_KEY = "daily_mountain_notification_last_sent";
const DAILY_MOUNTAIN_NOTIFICATION_BASE_ID = 880100;
const DAYS_TO_SCHEDULE = 30;
const NOTIFICATION_HOUR = 8;
const NOTIFICATION_MINUTE = 0;

type NotificationSettings = {
  dailyMountain?: boolean;
};

const readSettings = (): NotificationSettings => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

const writeSettings = (settings: NotificationSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...settings }));
};

export const isDailyMountainNotificationEnabled = () => {
  const settings = readSettings();
  return settings.dailyMountain !== false;
};

export const setDailyMountainNotificationEnabled = (enabled: boolean) => {
  writeSettings({ dailyMountain: enabled });
  window.dispatchEvent(
    new CustomEvent("wandeung:daily-mountain-notification-setting", {
      detail: { enabled },
    })
  );
};

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const getTodayMountain = (mountains: Mountain[], date: Date) => {
  if (mountains.length === 0) return null;
  return mountains[date.getDate() % mountains.length];
};

const getNotificationCopy = (mountain: Mountain) => ({
  title: "오늘의 산이 도착했어요",
  body: `${mountain.nameKo} 어때요? 오늘은 가볍게 산 하나 구경해볼까요?`,
});

const getNextNotificationDate = (from = new Date()) => {
  const next = new Date(from);
  next.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next;
};

const getScheduledIds = () =>
  Array.from({ length: DAYS_TO_SCHEDULE }, (_, index) => ({
    id: DAILY_MOUNTAIN_NOTIFICATION_BASE_ID + index,
  }));

const scheduleNativeDailyMountainNotifications = async (mountains: Mountain[]) => {
  if (!Capacitor.isNativePlatform() || mountains.length === 0) return false;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let permissions = await LocalNotifications.checkPermissions();

  if (permissions.display === "prompt" || permissions.display === "prompt-with-rationale") {
    permissions = await LocalNotifications.requestPermissions();
  }

  if (permissions.display !== "granted") return false;

  await LocalNotifications.cancel({ notifications: getScheduledIds() });

  const firstDate = getNextNotificationDate();
  const notifications = Array.from({ length: DAYS_TO_SCHEDULE }, (_, index) => {
    const scheduledAt = new Date(firstDate);
    scheduledAt.setDate(firstDate.getDate() + index);
    const mountain = getTodayMountain(mountains, scheduledAt);
    if (!mountain) return null;
    const copy = getNotificationCopy(mountain);

    return {
      id: DAILY_MOUNTAIN_NOTIFICATION_BASE_ID + index,
      title: copy.title,
      body: copy.body,
      schedule: {
        at: scheduledAt,
        allowWhileIdle: Capacitor.getPlatform() === "android",
      },
      sound: "default",
      extra: {
        route: `/mountains/${mountain.id}`,
        mountainId: mountain.id,
        type: "daily_mountain",
      },
    } satisfies LocalNotificationSchema;
  }).filter((notification): notification is LocalNotificationSchema => Boolean(notification));

  if (notifications.length === 0) return false;
  await LocalNotifications.schedule({ notifications });
  return true;
};

interface UseDailyMountainNotificationOptions {
  autoSchedule?: boolean;
}

export function useDailyMountainNotification({
  autoSchedule = true,
}: UseDailyMountainNotificationOptions = {}) {
  const { mountains } = useMountains();
  const { sendLocalNotification } = usePushNotification();
  const [enabled, setEnabled] = useState(isDailyMountainNotificationEnabled);
  const webTimerRef = useRef<number | null>(null);

  const mountainSignature = useMemo(
    () => mountains.map((mountain) => mountain.id).join(","),
    [mountains]
  );

  const clearWebTimer = useCallback(() => {
    if (webTimerRef.current !== null) {
      window.clearTimeout(webTimerRef.current);
      webTimerRef.current = null;
    }
  }, []);

  const scheduleWebNotification = useCallback(() => {
    clearWebTimer();
    if (Capacitor.isNativePlatform() || !enabled || mountains.length === 0) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const nextDate = getNextNotificationDate();
    const delay = Math.max(0, nextDate.getTime() - Date.now());

    webTimerRef.current = window.setTimeout(() => {
      const today = new Date();
      const todayKey = getDateKey(today);
      if (localStorage.getItem(LAST_SENT_KEY) !== todayKey) {
        const mountain = getTodayMountain(mountains, today);
        if (mountain) {
          const copy = getNotificationCopy(mountain);
          sendLocalNotification(copy.title, copy.body, {
            tag: "daily-mountain",
            data: { route: `/mountains/${mountain.id}`, mountainId: mountain.id },
          });
          localStorage.setItem(LAST_SENT_KEY, todayKey);
        }
      }
      scheduleWebNotification();
    }, delay);
  }, [clearWebTimer, enabled, mountains, sendLocalNotification]);

  useEffect(() => {
    const onSettingChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      setEnabled(customEvent.detail?.enabled ?? isDailyMountainNotificationEnabled());
    };
    window.addEventListener("wandeung:daily-mountain-notification-setting", onSettingChange);
    return () => {
      window.removeEventListener("wandeung:daily-mountain-notification-setting", onSettingChange);
    };
  }, []);

  useEffect(() => {
    if (!autoSchedule || !enabled || mountains.length === 0) {
      clearWebTimer();
      return;
    }

    if (Capacitor.isNativePlatform()) {
      scheduleNativeDailyMountainNotifications(mountains).catch((error) => {
        console.warn("[daily-mountain] scheduling failed", error);
      });
      return;
    }

    scheduleWebNotification();

    return clearWebTimer;
  }, [autoSchedule, clearWebTimer, enabled, mountainSignature, mountains, scheduleWebNotification]);

  const toggleDailyMountainNotification = useCallback(
    async (nextEnabled: boolean) => {
      setDailyMountainNotificationEnabled(nextEnabled);
      setEnabled(nextEnabled);

      if (!nextEnabled) {
        clearWebTimer();
        if (Capacitor.isNativePlatform()) {
          try {
            const { LocalNotifications } = await import("@capacitor/local-notifications");
            await LocalNotifications.cancel({ notifications: getScheduledIds() });
          } catch (error) {
            console.warn("[daily-mountain] cancel failed", error);
          }
        }
        toast("오늘의 산 알림을 껐어요");
        return;
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const scheduled = await scheduleNativeDailyMountainNotifications(mountains);
          if (scheduled) {
            toast.success("매일 오전 8시에 오늘의 산을 알려드릴게요");
          } else {
            toast("알림 권한을 허용하면 매일 8시에 알려드릴게요");
          }
        } catch (error) {
          console.warn("[daily-mountain] scheduling failed", error);
          toast.error("오늘의 산 알림 설정에 실패했어요");
        }
        return;
      }

      scheduleWebNotification();
      toast.success("매일 오전 8시에 오늘의 산을 알려드릴게요");
    },
    [clearWebTimer, mountains, scheduleWebNotification]
  );

  return {
    isDailyMountainEnabled: enabled,
    setDailyMountainEnabled: toggleDailyMountainNotification,
  };
}
