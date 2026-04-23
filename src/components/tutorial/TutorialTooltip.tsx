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
  interactive?: boolean;
  taskHint?: string;
  interactionComplete?: boolean;
  customContent?: string;
  noSpotlight?: boolean;
}

const TOOLTIP_STYLES = `
@keyframes tutorial-card-enter {
  0% { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
  100% { opacity: 1; transform: translate(-50%, -50%); }
}
@keyframes tutorial-border-flash {
  0%, 100% { border-color: transparent; }
  50% { border-color: #639922; }
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
        width: 120, height: 70, borderRadius: 10,
        background: "linear-gradient(135deg, #D4EDDA, #A8D5B5)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 12, color: "white", fontWeight: 500 }}>북한산</span>
      <span style={{ fontSize: 10, color: "white" }}>2026.04.22</span>
    </div>
    <span style={{ fontSize: 10, color: "hsl(var(--color-text-tertiary, var(--muted-foreground)))", marginTop: 4 }}>
      공유 카드 미리보기
    </span>
  </div>
);

const PlanChecklist = () => (
  <div style={{ marginTop: 8, fontSize: 12, color: "#3B6D11", lineHeight: 1.8 }}>
    <p>✓ 산 선택 &amp; 날짜 설정</p>
    <p>✓ 친구 초대 코드 생성</p>
    <p>✓ 공개 설정으로 새 동료 모집</p>
  </div>
);

const ClubChips = () => (
  <div className="flex gap-2 mt-3">
    <span style={{ background: "#EAF3DE", color: "#27500A", borderRadius: 20, fontSize: 12, padding: "5px 12px" }}>
      👥 산악회 만들기
    </span>
    <span style={{
      background: "hsl(var(--color-background-secondary, var(--secondary)))",
      color: "hsl(var(--color-text-secondary, var(--muted-foreground)))",
      borderRadius: 20, fontSize: 12, padding: "5px 12px",
    }}>
      🔍 산악회 찾기
    </span>
  </div>
);

const MiniLeaderboard = () => (
  <div style={{ marginTop: 10 }}>
    {[
      { medal: "🥇", name: "산바람", count: "47회" },
      { medal: "🥈", name: "숲속여행자", count: "32회" },
      { medal: "🥉", name: "초보동산리", count: "8회" },
    ].map((r, i) => (
      <div
        key={i}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11, color: "hsl(var(--color-text-secondary, var(--muted-foreground)))",
          padding: "3px 0",
          borderBottom: i < 2 ? "0.5px solid hsl(var(--color-border-tertiary, var(--border)))" : "none",
        }}
      >
        <span>{r.medal} {r.name}</span>
        <span>{r.count}</span>
      </div>
    ))}
  </div>
);

const FinalCelebration = () => (
  <div className="mt-3 flex flex-col items-center" style={{ minHeight: 90 }}>
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: "#EAF3DE",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>⛰️</div>
        <span style={{ fontSize: 10, marginTop: 4, color: "hsl(var(--foreground))" }}>첫 발자국</span>
      </div>
      <div className="flex flex-col items-center">
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "hsl(var(--color-background-secondary, var(--secondary)))",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: 0.4,
        }}>🔒</div>
        <span style={{ fontSize: 10, marginTop: 4, color: "hsl(var(--color-text-tertiary, var(--muted-foreground)))" }}>???</span>
      </div>
    </div>
    <span style={{
      fontSize: 11, marginTop: 6,
      color: "hsl(var(--color-text-tertiary, var(--muted-foreground)))", textAlign: "center",
    }}>
      등산 기록을 쌓으면 잠긴 업적이 열려요
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
    style.top = "50%";
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
    if (noSpotlight) {
      if (currentStep === 0) {
        style.animation = "tutorial-card-enter 0.25s ease-out forwards";
      }
      if (customContent === "final-celebration") {
        style.maxWidth = 320;
      }
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

      {/* Tooltip card */}
      <div style={style}>
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
          {/* Progress bar */}
          <div
            className="mb-4 overflow-hidden rounded-full"
            style={{
              height: 4,
              background: "hsl(var(--color-border-tertiary, var(--border)))",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
                background: "#639922",
                transition: "width 0.2s ease",
              }}
            />
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
          {customContent === "plan-checklist" && !interactionComplete && <PlanChecklist />}
          {customContent === "club-chips" && <ClubChips />}
          {customContent === "mini-leaderboard" && <MiniLeaderboard />}
          {customContent === "final-celebration" && <FinalCelebration />}

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
                height: customContent === "final-celebration" ? 48 : 44,
                background: "#639922",
                borderRadius: 10,
                fontSize: customContent === "final-celebration" ? 15 : 14,
                fontWeight: customContent === "final-celebration" ? 500 : undefined,
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
