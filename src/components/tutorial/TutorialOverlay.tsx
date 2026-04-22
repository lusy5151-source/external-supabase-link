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
  const navigate = useNavigate();
  const location = useLocation();

  const current = currentStep < steps.length ? steps[currentStep] : null;
  const isCircle = current?.spotlightShape === "circle";

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

  // Wait for route change to complete
  useEffect(() => {
    if (!visible || !current) return;
    if (location.pathname === current.route && !ready) {
      const t = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(t);
    }
  }, [location.pathname, visible, currentStep, ready]);

  const handleNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      nextStep();
      setReady(false);
      setFading(false);
    }, 200);
  }, [nextStep]);

  const handleSkip = useCallback(() => {
    setVisible(false);
    skipTutorial();
    if (location.pathname !== "/") navigate("/");
  }, [skipTutorial, navigate, location.pathname]);

  const handleRectChange = useCallback((rect: Rect | null) => {
    setTargetRect(rect);
  }, []);

  if (!visible || !current) return null;

  return (
    <>
      <TutorialSpotlight
        targetSelector={current.targetSelector}
        isCircle={!!isCircle}
        visible={ready}
        onRectChange={handleRectChange}
      />

      {/* Clickable backdrop to prevent interaction */}
      {!targetRect && ready && (
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
        targetRect={targetRect}
        onNext={handleNext}
        onSkip={handleSkip}
        fading={fading}
      />
    </>
  );
};

export default TutorialOverlay;
