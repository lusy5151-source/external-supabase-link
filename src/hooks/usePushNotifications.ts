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

        // 리스너 먼저 등록 (register() 전에!)
        await PushNotifications.addListener("registration", async ({ value: token }) => {
          console.log("Push token:", token);
          await supabase.from("push_tokens").upsert(
            { user_id: user.id, token, platform: "ios" },
            { onConflict: "user_id,token" }
          );
        });

        await PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration error:", error);
        });

        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push received:", notification);
        });

        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("Push action:", action);
        });

        // 권한 요청
        const permission = await PushNotifications.requestPermissions();
        console.log("Push permission:", permission.receive);
        if (permission.receive !== "granted") return;

        // 등록 (리스너 이후에!)
        await PushNotifications.register();

      } catch (err) {
        console.error("Push notification error:", err);
      }
    };

    registerPush();
  }, [user]);
};
