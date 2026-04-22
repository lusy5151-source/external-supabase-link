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
}

const ARROW_STYLE = `
@keyframes tutorial-arrow-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

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
}: TutorialTooltipProps) => {
  const tooltipW = 300;

  // Position: above or below target
  let style: React.CSSProperties = {
    width: tooltipW,
    position: "fixed",
    zIndex: 10001,
  };
  let arrowDirection: "up" | "down" = "down";

  if (targetRect) {
    const centerX = targetRect.left + targetRect.width / 2;
    style.left = Math.max(12, Math.min(centerX - tooltipW / 2, window.innerWidth - tooltipW - 12));

    const spaceBelow = window.innerHeight - targetRect.top - targetRect.height;
    if (currentStep === 0 || spaceBelow > 220) {
      // Below
      style.top = targetRect.top + targetRect.height + 20;
      arrowDirection = "up";
    } else {
      // Above
      style.bottom = window.innerHeight - targetRect.top + 20;
      arrowDirection = "down";
    }
  } else {
    style.top = "50%";
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
  }

  return (
    <>
      <style>{ARROW_STYLE}</style>

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
      {targetRect && (
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
            }}
          >
            {description}
          </p>

          {/* Action button */}
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
        </div>
      </div>
    </>
  );
};

export default TutorialTooltip;
