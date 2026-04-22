import { useState, useEffect } from "react";
import type React from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialTooltipProps {
  title: string;
  description: string;
  buttonLabel: string;
  currentStep: number;
  totalSteps: number;
  targetRect: Rect | null;
  onNext: () => void;
  onSkip: () => void;
  fading: boolean;
  interactive?: boolean;
  taskHint?: string;
  interactionComplete?: boolean;
  customContent?: string;
  noSpotlight?: boolean;
}

const TOOLTIP_STYLES = `
@keyframes tutorial-arrow-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes tutorial-slide-up {
  0% { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
  100% { opacity: 1; transform: translate(-50%, -50%); }
}
@keyframes tutorial-border-flash {
  0%, 100% { border-color: transparent; }
  50% { border-color: #639922; }
}
@keyframes tutorial-bounce-in {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  70% { transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes tutorial-confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
}
`;

const WelcomeChips = () => (
  <div className="flex gap-2 mt-3">
    <span
      style={{
        background: "#EAF3DE",
        color: "#27500A",
        borderRadius: 20,
        fontSize: 12,
        padding: "4px 10px",
      }}
    >
      👀 탐색 가능
    </span>
    <span
      style={{
        background: "#FCEBEB",
        color: "#A32D2D",
        borderRadius: 20,
        fontSize: 12,
        padding: "4px 10px",
      }}
    >
      🔒 인증·기록
    </span>
  </div>
);

const FabMethods = () => (
  <div style={{ marginTop: 8 }}>
    <p style={{ fontSize: 12, color: "hsl(var(--color-text-secondary, var(--muted-foreground)))", padding: "3px 0" }}>
      📍 GPS 인증 — 현장에서 바로 위치 확인
    </p>
    <p style={{ fontSize: 12, color: "hsl(var(--color-text-secondary, var(--muted-foreground)))", padding: "3px 0" }}>
      📸 AI 사진 인증 — 정상석 사진으로 어디서든 인증
    </p>
  </div>
);

const ShareCardPreview = () => (
  <div className="flex flex-col items-center mt-3">
    <div
      style={{
        width: 120,
        height: 70,
        borderRadius: 10,
        background: "linear-gradient(135deg, #D4EDDA, #A8D5B5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 12, color: "white", fontWeight: 500 }}>북한산</span>
      <span style={{ fontSize: 10, color: "white" }}>2026.04.22</span>
    </div>
    <span
      style={{
        fontSize: 10,
        color: "hsl(var(--color-text-tertiary, var(--muted-foreground)))",
        marginTop: 4,
      }}
    >
      공유 카드 미리보기
    </span>
  </div>
);

const TutorialTooltip = ({
  title,
  description,
  buttonLabel,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onSkip,
  fading,
  interactive,
  taskHint,
  interactionComplete,
  customContent,
  noSpotlight,
}: TutorialTooltipProps) => {
  const [borderFlash, setBorderFlash] = useState(false);
  const tooltipW = 300;

  // Flash border on interaction complete for filter step
  useEffect(() => {
    if (interactionComplete && customContent === "filter-interactive") {
      setBorderFlash(true);
      const t = setTimeout(() => setBorderFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [interactionComplete, customContent]);

  // Position
  let style: React.CSSProperties = {
    width: tooltipW,
    position: "fixed",
    zIndex: 10001,
  };
  let arrowDirection: "up" | "down" = "down";

  if (noSpotlight || !targetRect) {
    // Centered card with slide-up animation
    style.top = "50%";
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
    if (noSpotlight) {
      style.animation = "tutorial-slide-up 0.3s ease-out forwards";
    }
  } else {
    const centerX = targetRect.left + targetRect.width / 2;
    style.left = Math.max(12, Math.min(centerX - tooltipW / 2, window.innerWidth - tooltipW - 12));

    const spaceBelow = window.innerHeight - targetRect.top - targetRect.height;
    if (spaceBelow > 280) {
      style.top = targetRect.top + targetRect.height + 20;
      arrowDirection = "up";
    } else {
      style.bottom = window.innerHeight - targetRect.top + 20;
      arrowDirection = "down";
    }
  }

  const showArrow = targetRect && !noSpotlight;

  return (
    <>
      <style>{TOOLTIP_STYLES}</style>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="fixed"
        style={{
          zIndex: 10003,
          top: 16,
          right: 16,
          fontSize: 11,
          color: "hsl(var(--color-text-tertiary, var(--muted-foreground)))",
          background: "rgba(255,255,255,0.15)",
          padding: "4px 10px",
          borderRadius: 20,
          backdropFilter: "blur(4px)",
        }}
      >
        건너뛰기
      </button>

      {/* Arrow pointer */}
      {showArrow && (
        <div
          style={{
            position: "fixed",
            zIndex: 10002,
            left: targetRect.left + targetRect.width / 2 - 8,
            ...(arrowDirection === "up"
              ? { top: targetRect.top + targetRect.height + 8 }
              : { top: targetRect.top - 20 }),
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            ...(arrowDirection === "up"
              ? { borderBottom: "8px solid white" }
              : { borderTop: "8px solid white" }),
            animation: "tutorial-arrow-bounce 0.8s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={`transition-all duration-200 ${fading ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
        style={style}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            border: borderFlash ? "2px solid #639922" : "2px solid transparent",
            transition: "border-color 0.3s",
          }}
        >
          {/* Progress bar segments */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: 3,
                  background:
                    i <= currentStep
                      ? "#639922"
                      : "hsl(var(--color-border-tertiary, var(--border)))",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 500, color: "hsl(var(--foreground))" }}>
            {title}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "hsl(var(--color-text-secondary, var(--muted-foreground)))",
              lineHeight: 1.7,
              marginTop: 6,
              whiteSpace: "pre-line",
            }}
          >
            {interactionComplete && customContent === "filter-interactive"
              ? "완료! 이렇게 원하는 산을 골라요 ✓"
              : description}
          </p>

          {/* Custom content */}
          {customContent === "welcome-chips" && <WelcomeChips />}
          {customContent === "fab-methods" && !interactionComplete && <FabMethods />}
          {customContent === "share-card" && <ShareCardPreview />}

          {/* Action button or task hint */}
          {interactive && !interactionComplete ? (
            <p
              className="text-center"
              style={{
                fontSize: 13,
                color: "#3B6D11",
                marginTop: 14,
                fontWeight: 500,
              }}
            >
              {taskHint}
            </p>
          ) : interactive && interactionComplete ? (
            <p
              className="text-center"
              style={{
                fontSize: 13,
                color: "#639922",
                marginTop: 14,
                fontWeight: 500,
              }}
            >
              ✅ 완료!
            </p>
          ) : (
            <button
              onClick={onNext}
              className="w-full font-medium text-white"
              style={{
                height: 44,
                background: "#639922",
                borderRadius: 10,
                fontSize: 14,
                marginTop: 14,
              }}
            >
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TutorialTooltip;
