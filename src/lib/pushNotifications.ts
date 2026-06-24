import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;
let listenersAttached = false;
let currentUserId: string | null = null;

async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[push] no user, skip token save");
    return;
  }

  const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
  currentUserId = user.id;
  const { error } = await (supabase as any)
    .from("push_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );

  if (error) console.error("[push] save token failed:", error);
  else console.log("[push] token saved");
}

async function ensureAndroidNotificationChannel() {
  if (Capacitor.getPlatform() !== "android") return;

  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.createChannel({
    id: "wandeung_default",
    name: "완등 알림",
    description: "완등의 주요 소식과 일정 알림",
    importance: 4,
    visibility: 1,
    vibration: true,
  });
}

/**
 * 앱 시작 시 푸시 알림 권한을 요청하고 FCM 토큰을 Supabase에 저장합니다.
 * 네이티브 환경(iOS/Android)에서만 동작합니다.
 */
export async function initPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (initialized && currentUserId === user.id) return;
  initialized = true;
  currentUserId = user.id;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await ensureAndroidNotificationChannel();

    if (!listenersAttached) {
      // 토큰 이벤트는 register 직후 바로 올 수 있으므로 리스너를 먼저 붙인다.
      await PushNotifications.addListener("registration", async ({ value: token }) => {
        try {
          await savePushToken(token);
        } catch (e) {
          console.error("[push] registration handler failed:", e);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[push] registration error:", err);
        initialized = false;
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[push] received (foreground):", notification);
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data as Record<string, any> | undefined;
        const url = data?.url || data?.route;
        if (url && typeof url === "string") {
          window.location.href = url;
        }
      });

      listenersAttached = true;
    }

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("[push] permission not granted:", perm.receive);
      initialized = false;
      return;
    }

    await PushNotifications.register();
  } catch (e) {
    console.error("[push] init failed:", e);
    initialized = false;
  }
}
