import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTutorial } from "@/contexts/TutorialContext";
import TutorialSpotlight from "./TutorialSpotlight";
import TutorialTooltip from "./TutorialTooltip";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TutorialOverlay = () => {
  const { isTutorialActive, currentStep, steps, totalSteps, nextStep, skipTutorial } = useTutorial();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [interactionComplete, setInteractionComplete] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const interceptRef = useRef(false);

  const current = currentStep < steps.length ? steps[currentStep] : null;
  const isCircle = current?.spotlightShape === "circle";
  const noSpotlight = current?.spotlightShape === "none";

  // Delay visibility on activation
  useEffect(() => {
    if (isTutorialActive) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      setReady(false);
    }
  }, [isTutorialActive]);

  // Reset interaction state on step change
  useEffect(() => {
    setInteractionComplete(false);
    interceptRef.current = false;
  }, [currentStep]);

  // Route navigation for current step
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
  }, [visible, currentStep, current?.route]);

  // Wait for route change to complete (lazy pages need more time)
  useEffect(() => {
    if (!visible || !current) return;
    if (location.pathname === current.route && !ready) {
      const t = setTimeout(() => setReady(true), 800);
      return () => clearTimeout(t);
    }
  }, [location.pathname, visible, currentStep, ready]);

  // Interactive step: listen for user taps on target
  useEffect(() => {
    if (!visible || !ready || !current?.interactive || !current.interactiveSelector) return;
    if (interactionComplete) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(current.interactiveSelector!)) {
        // Intercept navigation for FAB and plan-create steps
        if (current.customContent === "fab-methods" || current.customContent === "plan-checklist") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        setInteractionComplete(true);
      }
    };

    // Use capture to intercept before normal handlers
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [visible, ready, currentStep, current?.interactive, current?.interactiveSelector, interactionComplete]);

  // Auto-advance after interaction complete
  useEffect(() => {
    if (!interactionComplete) return;
    const delay = current?.customContent === "fab-methods" ? 1000 : 1200;
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        nextStep();
        setReady(false);
        setFading(false);
      }, 200);
    }, delay);
    return () => clearTimeout(t);
  }, [interactionComplete, nextStep, current?.customContent]);

  const handleNext = useCallback(() => {
    const isLastStep = currentStep >= steps.length - 1;
    setFading(true);
    setTimeout(() => {
      nextStep();
      setReady(false);
      setFading(false);
      if (isLastStep && location.pathname !== "/") {
        navigate("/");
      }
    }, 200);
  }, [nextStep, currentStep, steps.length, navigate, location.pathname]);

  const handleSkip = useCallback(() => {
    setVisible(false);
    skipTutorial();
    if (location.pathname !== "/") navigate("/");
  }, [skipTutorial, navigate, location.pathname]);

  const handleRectChange = useCallback((rect: Rect | null) => {
    setTargetRect(rect);
  }, []);

  if (!visible || !current) return null;

  const showSpotlight = !noSpotlight && current.targetSelector;

  return (
    <>
      {showSpotlight && (
        <TutorialSpotlight
          targetSelector={current.targetSelector}
          isCircle={!!isCircle}
          visible={ready}
          onRectChange={handleRectChange}
          glowRing={current.glowRing}
        />
      )}

      {/* Dark backdrop for no-spotlight steps */}
      {(noSpotlight || (!targetRect && !noSpotlight)) && ready && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998, background: "rgba(0,0,0,0.65)" }}
        />
      )}

      <TutorialTooltip
        title={current.title}
        description={current.description}
        buttonLabel={current.buttonLabel}
        currentStep={currentStep}
        totalSteps={totalSteps}
        targetRect={noSpotlight ? null : targetRect}
        onNext={handleNext}
        onSkip={handleSkip}
        fading={fading}
        interactive={current.interactive}
        taskHint={current.taskHint}
        interactionComplete={interactionComplete}
        customContent={current.customContent}
        noSpotlight={noSpotlight}
      />
    </>
  );
};

export default TutorialOverlay;
