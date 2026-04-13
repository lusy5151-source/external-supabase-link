import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface OnboardingStep {
  targetSelector: string;
  route: string;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  // 🏠 홈 탭 (Steps 1-4)
  {
    route: "/",
    targetSelector: '[data-onboarding="upcoming-schedule"]',
    title: "등산 계획을 확인하세요 📅",
    description: "예정된 등산 일정이 홈 화면에 바로 표시돼요",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="summit-claim"]',
    title: "정상을 인증하세요 🏔",
    description: "산 정상에서 인증하면 리더보드에 이름이 올라가요!",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="progress-ring"]',
    title: "100대 명산 완등에 도전하세요 🎯",
    description: "완등한 산을 기록하고 목표를 향해 나아가세요",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="badge-gallery"]',
    title: "업적을 모아보세요 🏆",
    description: "등산하면서 다양한 챌린지와 업적을 달성해보세요",
  },
  // 🏔 산 탭 (Steps 5-6)
  {
    route: "/mountains",
    targetSelector: '[data-onboarding="mountain-map"]',
    title: "산을 지도에서 찾아보세요 🗺",
    description: "140개의 산을 지도에서 한눈에 확인할 수 있어요",
  },
  {
    route: "/mountains",
    targetSelector: '[data-onboarding="mountain-filter"]',
    title: "완등한 산을 관리하세요 ✅",
    description: "완등, 미등으로 나눠서 나만의 등산 기록을 관리해요",
  },
  // 📔 등산일지 탭 (Steps 7-8)
  {
    route: "/records",
    targetSelector: '[data-onboarding="journal-feed"]',
    title: "등산 일지를 작성하세요 📔",
    description: "등산 후 사진과 함께 소중한 기록을 남겨보세요",
  },
  {
    route: "/records",
    targetSelector: '[data-onboarding="journal-create"]',
    title: "나만의 등산 기록 작성 ✍️",
    description: "코스, 날씨, 사진, 메모를 함께 기록할 수 있어요",
  },
  // 🚩 순위 탭 (Step 9)
  {
    route: "/leaderboard",
    targetSelector: '[data-onboarding="leaderboard"]',
    title: "정상 정복 순위를 확인하세요 🥇",
    description: "가장 많은 정상을 정복한 등산왕은 누구일까요?",
  },
  // 📅 계획 탭 (Step 10)
  {
    route: "/plans",
    targetSelector: '[data-onboarding="plan-create"]',
    title: "등산 계획을 세워보세요 📅",
    description: "친구들과 함께 등산 일정을 만들고 공유할 수 있어요",
  },
  // 👥 친구 탭 (Step 11)
  {
    route: "/social",
    targetSelector: '[data-onboarding="social-tabs"]',
    title: "친구와 함께 걸어요 👥",
    description: "친구를 추가하고 산악회를 만들어 함께 등산해요",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOTAL_STEPS = steps.length;

const OnboardingTutorial = () => {
  const { isOnboarding, finishOnboarding } = useOnboarding();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    arrowDir: "up" | "down";
  }>({ top: 0, left: 0, arrowLeft: 50, arrowDir: "up" });
  const [fading, setFading] = useState(false);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number>(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isOnboarding) {
      const t = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(t);
    }
  }, [isOnboarding]);

  const dismiss = useCallback(() => {
    setVisible(false);
    finishOnboarding();
    navigate("/");
  }, [navigate, finishOnboarding]);

  const isFinal = currentStep >= TOTAL_STEPS;

  const measure = useCallback(() => {
    if (isFinal || !visible) return;
    const el = document.querySelector(steps[currentStep].targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 6;
    const sr: Rect = {
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
    setRect(sr);

    const tw = Math.min(300, window.innerWidth - 32);
    const th = 148;
    const bannerHeight = 52;
    const topSafe = bannerHeight + 12;
    const bottomSafe = 16;
    const gap = 14;
    const spaceBelow = window.innerHeight - r.bottom - bottomSafe;
    const spaceAbove = r.top - topSafe;

    let tTop = spaceBelow >= th + gap
      ? sr.top + sr.height + gap
      : sr.top - th - gap;

    const arrowDir: "up" | "down" =
      spaceBelow >= th + gap || spaceBelow >= spaceAbove ? "up" : "down";

    tTop = Math.max(topSafe, Math.min(tTop, window.innerHeight - th - bottomSafe));

    const cx = sr.left + sr.width / 2;
    let tLeft = Math.max(16, Math.min(cx - tw / 2, window.innerWidth - tw - 16));
    const arrowLeft = Math.max(20, Math.min(cx - tLeft, tw - 20));

    setTooltipPos({ top: tTop, left: tLeft, arrowLeft, arrowDir });
  }, [currentStep, isFinal, visible]);

  // Navigate to correct route
  useEffect(() => {
    if (!visible || isFinal) return;
    const step = steps[currentStep];
    if (location.pathname !== step.route) {
      setReady(false);
      navigate(step.route);
    } else {
      setReady(false);
      const t = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [visible, currentStep, isFinal]);

  // After route change, wait for elements
  useEffect(() => {
    if (!visible || isFinal) return;
    const step = steps[currentStep];
    if (location.pathname === step.route && !ready) {
      const t = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(t);
    }
  }, [location.pathname, visible, currentStep, isFinal, ready]);

  // Measure when ready — poll until element appears (handles lazy routes)
  useEffect(() => {
    if (!ready || !visible || isFinal) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // up to ~4 seconds

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(steps[currentStep].targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => { if (!cancelled) measure(); }, 450);
      } else if (attempts < maxAttempts) {
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
  }, [ready, visible, currentStep, isFinal, measure]);

  const goNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrentStep((s) => s + 1);
      setReady(false);
      setFading(false);
    }, 200);
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Dark overlay — only when no spotlight or final */}
      {(!rect || isFinal) && (
        <div
          className="fixed inset-0 z-[9998]"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        />
      )}

      {/* Spotlight */}
      {rect && !isFinal && (
        <div
          className="fixed z-[9999] transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 12,
            border: "2px solid #C7D66D",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
            backgroundColor: "transparent",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Top banner */}
      {!isFinal && (
        <div
          className="fixed top-0 left-0 right-0 z-[10002] flex items-center justify-center py-3 px-4"
          style={{ backgroundColor: "#2F403A" }}
        >
          <p className="text-sm text-white font-medium text-center">
            완등 사용법을 알아볼까요? 👆 화면을 탭해서 둘러보세요
          </p>
        </div>
      )}

      {/* Skip + counter */}
      {!isFinal && (
        <div className="fixed z-[10003] flex items-center gap-3" style={{ top: 52, right: 16 }}>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            {currentStep + 1}/{TOTAL_STEPS}
          </span>
          <button
            onClick={dismiss}
            className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors backdrop-blur-sm"
            style={{
              color: "rgba(255,255,255,0.9)",
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          >
            건너뛰기 <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tooltip */}
      {!isFinal && rect && (
        <div
          className={`fixed z-[10001] transition-all duration-200 ${
            fading ? "opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
          style={{
            top:
              tooltipPos.arrowDir === "up" ? tooltipPos.top : undefined,
            bottom:
              tooltipPos.arrowDir === "down"
                ? window.innerHeight - tooltipPos.top
                : undefined,
            left: tooltipPos.left,
            width: Math.min(300, window.innerWidth - 32),
          }}
        >
          {tooltipPos.arrowDir === "up" && (
            <div
              className="absolute -top-2 w-4 h-4 rotate-45"
              style={{
                left: tooltipPos.arrowLeft - 8,
                borderRadius: 2,
                backgroundColor: "#FFFFFF",
              }}
            />
          )}
          <div
            className="p-5 shadow-2xl"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
            }}
          >
            <h3
              className="text-[15px] mb-1"
              style={{ fontWeight: 500, color: "#2F403A" }}
            >
              {steps[currentStep].title}
            </h3>
            <p
              className="leading-relaxed"
              style={{ fontSize: 13, color: "#666666" }}
            >
              {steps[currentStep].description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor:
                        i === currentStep ? "#C7D66D" : "#E5E7EB",
                      transform:
                        i === currentStep ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={goNext}
                className="rounded-full px-5 py-2 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#C7D66D", color: "#2F403A" }}
              >
                다음
              </button>
            </div>
          </div>
          {tooltipPos.arrowDir === "down" && (
            <div
              className="absolute -bottom-2 w-4 h-4 rotate-45"
              style={{
                left: tooltipPos.arrowLeft - 8,
                borderRadius: 2,
                backgroundColor: "#FFFFFF",
              }}
            />
          )}
        </div>
      )}

      {/* Final screen */}
      {isFinal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-8">
          <div
            className={`max-w-sm w-full text-center shadow-2xl transition-all duration-300 ${
              fading ? "opacity-0 scale-90" : "opacity-100 scale-100"
            }`}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 32,
            }}
          >
            <div className="text-5xl mb-4">🏔</div>
            <h2
              className="text-xl mb-2"
              style={{ fontWeight: 500, color: "#2F403A" }}
            >
              이제 시작할 준비가 됐어요! 🏔
            </h2>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              완등과 함께 나만의 등산 기록을 시작해볼까요?
            </p>
            <button
              onClick={dismiss}
              className="w-full rounded-2xl px-6 py-3.5 text-base font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#C7D66D", color: "#2F403A" }}
            >
              시작하기
            </button>
            <div className="flex justify-center gap-1.5 mt-5">
              {Array.from({ length: TOTAL_STEPS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      i === TOTAL_STEPS ? "#C7D66D" : "#E5E7EB",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OnboardingTutorial;
