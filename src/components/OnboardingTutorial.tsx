import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface OnboardingStep {
  targetSelector: string;
  route: string;
  title: string;
  description: string;
  buttonLabel: string;
  spotlightShape: "rect" | "circle";
}

const steps: OnboardingStep[] = [
  {
    route: "/auth",
    targetSelector: '[data-onboarding="guest-browse"]',
    title: "먼저 둘러봐도 괜찮아요",
    description:
      "로그인 없이 산 탐색과 홈을 자유롭게 둘러볼 수 있어요. 정상 인증과 기록은 로그인 후 이용 가능해요.",
    buttonLabel: "다음 →",
    spotlightShape: "rect",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="fab-summit"]',
    title: "올랐으면 인증까지!",
    description:
      "언제 어디서든 이 버튼 하나로 정상 인증을 바로 시작할 수 있어요. GPS 또는 정상석 사진으로 인증 가능해요.",
    buttonLabel: "다음 →",
    spotlightShape: "circle",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="tab-records"]',
    title: "등산 기록을 남겨보세요",
    description:
      "산 이름과 날짜만 입력하면 빠르게 일지를 저장할 수 있어요. 완성된 기록은 예쁜 공유 카드로 SNS에 자랑해보세요!",
    buttonLabel: "다음 →",
    spotlightShape: "circle",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="tab-records"]',
    title: "도전하고 업적을 모아보세요",
    description:
      "100대 명산 완등, 거리 챌린지 등 다양한 목표에 도전해보세요. 달성할 때마다 특별한 업적 배지를 받을 수 있어요.",
    buttonLabel: "시작하기",
    spotlightShape: "circle",
  },
];

const TOTAL = steps.length;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const OnboardingTutorial = () => {
  const { isOnboarding, finishOnboarding } = useOnboarding();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [fading, setFading] = useState(false);
  const [ready, setReady] = useState(false);
  const rafRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isOnboarding) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOnboarding]);

  const dismiss = useCallback(() => {
    setVisible(false);
    finishOnboarding();
    if (location.pathname !== "/") navigate("/");
  }, [finishOnboarding, navigate, location.pathname]);

  const current = step < TOTAL ? steps[step] : null;
  const isCircle = current?.spotlightShape === "circle";

  const measure = useCallback(() => {
    if (!current || !visible) return;
    const el = document.querySelector(current.targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (isCircle) {
      const size = Math.max(r.width, r.height) + 16;
      setRect({
        top: r.top + r.height / 2 - size / 2,
        left: r.left + r.width / 2 - size / 2,
        width: size,
        height: size,
      });
    } else {
      const pad = 6;
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
    }
  }, [current, visible, isCircle]);

  // Route navigation
  useEffect(() => {
    if (!visible || !current) return;
    if (location.pathname !== current.route) {
      setReady(false);
      navigate(current.route);
    } else {
      setReady(false);
      const t = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [visible, step, current?.route]);

  // Wait for route change
  useEffect(() => {
    if (!visible || !current) return;
    if (location.pathname === current.route && !ready) {
      const t = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(t);
    }
  }, [location.pathname, visible, step, ready]);

  // Measure when ready
  useEffect(() => {
    if (!ready || !visible || !current) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(current.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (!cancelled) measure();
        }, 350);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryFind, 200);
      }
    };
    tryFind();
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, visible, step, measure]);

  const goNext = useCallback(() => {
    if (step >= TOTAL - 1) {
      dismiss();
      return;
    }
    setFading(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setReady(false);
      setFading(false);
    }, 200);
  }, [step, dismiss]);

  if (!visible || !current) return null;

  // Tooltip position: above or below the target
  const tooltipW = 280;
  let tooltipStyle: React.CSSProperties = {
    width: tooltipW,
    left: Math.max(16, Math.min((rect ? rect.left + rect.width / 2 : window.innerWidth / 2) - tooltipW / 2, window.innerWidth - tooltipW - 16)),
  };
  if (rect) {
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.top - rect.height;
    if (step === 0) {
      // below the button
      tooltipStyle.top = rect.top + rect.height + 14;
    } else {
      // above the element
      tooltipStyle.bottom = window.innerHeight - rect.top + 14;
    }
  } else {
    tooltipStyle.top = "50%";
  }

  // SVG mask for spotlight
  const renderOverlay = () => {
    if (!rect) {
      return (
        <div
          className="fixed inset-0 z-[9998]"
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
      );
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return (
      <svg className="fixed inset-0 z-[9998]" width={vw} height={vh} style={{ display: "block" }}>
        <defs>
          <mask id="onboarding-mask">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            {isCircle ? (
              <circle
                cx={rect.left + rect.width / 2}
                cy={rect.top + rect.height / 2}
                r={rect.width / 2}
                fill="black"
              />
            ) : (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width={vw} height={vh}
          fill="rgba(0,0,0,0.6)"
          mask="url(#onboarding-mask)"
        />
      </svg>
    );
  };

  return (
    <>
      {renderOverlay()}

      {/* Skip button */}
      <button
        onClick={dismiss}
        className="fixed z-[10003]"
        style={{ top: 16, right: 16, fontSize: 12, color: "rgba(255,255,255,0.8)" }}
      >
        건너뛰기
      </button>

      {/* Tooltip */}
      <div
        className={`fixed z-[10001] transition-all duration-200 ${fading ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
        style={tooltipStyle}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "var(--border-radius-lg, 16px)",
            padding: "16px 18px",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "hsl(var(--foreground))" }}>
            {current.title}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "hsl(var(--color-text-secondary, var(--muted-foreground)))",
              lineHeight: 1.6,
              marginTop: 6,
            }}
          >
            {current.description}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: 6,
                  height: 6,
                  background:
                    i === step
                      ? "#639922"
                      : "hsl(var(--color-border-tertiary, var(--border)))",
                }}
              />
            ))}
          </div>

          {/* Action button */}
          <button
            onClick={goNext}
            className="w-full font-medium text-white mt-3"
            style={{
              height: 44,
              background: "#639922",
              borderRadius: "var(--border-radius-md, 12px)",
              fontSize: 14,
            }}
          >
            {current.buttonLabel}
          </button>
        </div>
      </div>
    </>
  );
};

export default OnboardingTutorial;
