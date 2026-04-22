import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

const PERMISSION_KEY = "push_permission";
const PROMPT_DISMISSED_KEY = "push_prompt_dismissed";

type PermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function usePushNotification() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return (localStorage.getItem(PERMISSION_KEY) as PermissionStatus) || Notification.permission;
  });

  const [promptDismissed, setPromptDismissed] = useState(() =>
    localStorage.getItem(PROMPT_DISMISSED_KEY) === "true"
  );

  // Sync with actual browser state on mount
  useEffect(() => {
    if ("Notification" in window) {
      const actual = Notification.permission;
      setPermissionStatus(actual);
      localStorage.setItem(PERMISSION_KEY, actual);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("이 브라우저는 알림을 지원하지 않아요");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      localStorage.setItem(PERMISSION_KEY, result);
      setPermissionStatus(result);

      if (result === "granted") {
        toast.success("알림이 활성화되었어요 🔔");
        return true;
      } else {
        toast("브라우저 설정에서 알림을 허용해주세요", {
          description: "브라우저 주소창 왼쪽 🔒 아이콘 → 알림 → 허용",
        });
        return false;
      }
    } catch {
      toast.error("알림 권한 요청 중 오류가 발생했어요");
      return false;
    }
  }, []);

  const sendLocalNotification = useCallback(
    (title: string, body: string, options?: NotificationOptions) => {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return null;
      }

      const notification = new Notification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-72.png",
        requireInteraction: false,
        silent: false,
        ...options,
      });

      return notification;
    },
    []
  );

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setPromptDismissed(true);
  }, []);

  const isGranted = permissionStatus === "granted";
  const isDenied = permissionStatus === "denied";
  const shouldShowPrompt =
    !promptDismissed && permissionStatus !== "granted" && permissionStatus !== "unsupported";

  return {
    permissionStatus,
    isGranted,
    isDenied,
    shouldShowPrompt,
    promptDismissed,
    requestPermission,
    sendLocalNotification,
    dismissPrompt,
  };
}
