import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;

/**
 * 앱 시작 시 푸시 알림 권한을 요청하고 FCM 토큰을 Supabase에 저장합니다.
 * 네이티브 환경(iOS/Android)에서만 동작합니다.
 */
export async function initPushNotifications(): Promise<void> {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return;
  initialized = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // 1. 권한 요청
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("[push] permission not granted:", perm.receive);
      return;
    }

    // 2. APNs/FCM 등록
    await PushNotifications.register();

    // 3. 토큰 발급 → Supabase 저장
    await PushNotifications.addListener("registration", async ({ value: token }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn("[push] no user, skip token save");
          return;
        }
        const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
        // 발송 측 Edge Function이 push_tokens 테이블의 token 컬럼을 조회하므로 여기 통일.
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
      } catch (e) {
        console.error("[push] registration handler failed:", e);
      }
    });

    // 4. 등록 에러
    await PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error:", err);
    });

    // 5. 포그라운드 수신
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[push] received (foreground):", notification);
    });

    // 6. 알림 탭
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification?.data as Record<string, any> | undefined;
      const url = data?.url || data?.route;
      if (url && typeof url === "string") {
        window.location.href = url;
      }
    });
  } catch (e) {
    console.error("[push] init failed:", e);
    initialized = false;
  }
}
