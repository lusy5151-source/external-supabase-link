import { useState, useEffect } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";
import { useTutorial } from "@/contexts/TutorialContext";
import { Bell } from "lucide-react";

const PushPermissionPrompt = () => {
  const { shouldShowPrompt, requestPermission, dismissPrompt } = usePushNotification();
  const { tutorialCompleted, isTutorialActive } = useTutorial();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Show after tutorial completes and a short delay
  useEffect(() => {
    if (!tutorialCompleted || isTutorialActive || !shouldShowPrompt) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [tutorialCompleted, isTutorialActive, shouldShowPrompt]);

  const handleAllow = async () => {
    await requestPermission();
    handleClose();
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      dismissPrompt();
    }, 250);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 9990,
          background: "rgba(0,0,0,0.4)",
          opacity: closing ? 0 : 1,
          transition: "opacity 0.25s ease",
        }}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed left-0 right-0 bottom-0"
        style={{
          zIndex: 9991,
          transform: closing ? "translateY(100%)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <div
          className="mx-auto rounded-t-2xl bg-card"
          style={{
            maxWidth: 480,
            padding: "24px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)",
            borderTop: "1px solid hsl(var(--border))",
          }}
        >
          {/* Handle */}
          <div
            className="mx-auto rounded-full bg-muted-foreground/20"
            style={{ width: 36, height: 4, marginBottom: 20 }}
          />

          {/* Icon */}
          <div
            className="mx-auto flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              background: "hsl(87, 60%, 92%)",
              marginBottom: 14,
            }}
          >
            <Bell style={{ width: 24, height: 24, color: "hsl(var(--brand-forest))" }} />
          </div>

          {/* Title */}
          <p
            className="text-center text-foreground"
            style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}
          >
            등산 알림을 받아보세요
          </p>

          {/* Body */}
          <p
            className="text-center text-muted-foreground"
            style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 20, whiteSpace: "pre-line" }}
          >
            {"계획 D-day, 채팅 메시지, 친구 활동을\n놓치지 않도록 알림을 보내드려요."}
          </p>

          {/* Allow button */}
          <button
            onClick={handleAllow}
            className="w-full flex items-center justify-center rounded-xl text-white font-medium"
            style={{
              height: 44,
              background: "hsl(var(--brand-forest))",
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            알림 허용하기
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleClose}
            className="w-full flex items-center justify-center"
            style={{
              height: 40,
              fontSize: 13,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            나중에
          </button>
        </div>
      </div>
    </>
  );
};

export default PushPermissionPrompt;
