import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    const registerPush = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // 권한 요청
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") return;

        // 등록
        await PushNotifications.register();

        // 토큰 수신 → DB 저장
        await PushNotifications.addListener("registration", async ({ value: token }) => {
          await supabase.from("push_tokens").upsert(
            { user_id: user.id, token, platform: "ios" },
            { onConflict: "user_id,token" }
          );
        });

        // 알림 수신 (앱 실행 중)
        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push received:", notification);
        });

        // 알림 탭했을 때
        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("Push action:", action);
        });

      } catch (err) {
        console.error("Push notification error:", err);
      }
    };

    registerPush();
  }, [user]);
};
