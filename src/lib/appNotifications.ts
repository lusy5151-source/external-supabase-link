import { Capacitor } from "@capacitor/core";

type NotificationData = Record<string, unknown> & {
  route?: string;
  url?: string;
};

export type AppNotificationOptions = NotificationOptions & {
  data?: NotificationData;
};

const makeNotificationId = () => {
  const timePart = Date.now() % 1_000_000_000;
  const randomPart = Math.floor(Math.random() * 1000);
  return timePart + randomPart;
};

export async function requestAppNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") {
      permission = await LocalNotifications.requestPermissions();
    }
    return permission.display === "granted";
  }

  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function getAppNotificationPermission(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display === "granted") return "granted";
    if (permission.display === "denied") return "denied";
    return "default";
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function sendAppNotification(
  title: string,
  body: string,
  options?: AppNotificationOptions,
): Notification | null {
  const data = options?.data || {};
  const route = typeof data.route === "string" ? data.route : typeof data.url === "string" ? data.url : undefined;

  if (Capacitor.isNativePlatform()) {
    import("@capacitor/local-notifications")
      .then(async ({ LocalNotifications }) => {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== "granted") return;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: makeNotificationId(),
              title,
              body,
              schedule: { at: new Date(Date.now() + 250), allowWhileIdle: true },
              sound: "default",
              extra: { ...data, route },
            },
          ],
        });
      })
      .catch((error) => console.warn("[notification] local send failed", error));
    return null;
  }

  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;

  const notification = new Notification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    requireInteraction: false,
    silent: false,
    ...options,
    data,
  });

  if (route) {
    notification.onclick = () => {
      window.focus();
      window.location.href = route;
    };
  }

  return notification;
}
