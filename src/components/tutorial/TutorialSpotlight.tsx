import { useEffect, useState, useRef, useCallback } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialSpotlightProps {
  targetSelector: string;
  isCircle: boolean;
  visible: boolean;
  onRectChange: (rect: Rect | null) => void;
  glowRing?: boolean;
}

const SPOTLIGHT_STYLES = `
@keyframes tutorial-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.08); }
}
@keyframes tutorial-glow {
  0% { width: 80px; height: 80px; opacity: 0.6; }
  100% { width: 110px; height: 110px; opacity: 0; }
}
`;

const TutorialSpotlight = ({ targetSelector, isCircle, visible, onRectChange, glowRing }: TutorialSpotlightProps) => {
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef(0);
  const attemptsRef = useRef(0);

  const measure = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) {
      setRect(null);
      onRectChange(null);
      return;
    }
    const r = el.getBoundingClientRect();
    let measured: Rect;
    if (isCircle) {
      const size = Math.max(r.width, r.height) + 20;
      measured = {
        top: r.top + r.height / 2 - size / 2,
        left: r.left + r.width / 2 - size / 2,
        width: size,
        height: size,
      };
    } else {
      const pad = 8;
      measured = {
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      };
    }
    setRect(measured);
    onRectChange(measured);
  }, [targetSelector, isCircle, onRectChange]);

  useEffect(() => {
    if (!visible) {
      setRect(null);
      onRectChange(null);
      return;
    }

    attemptsRef.current = 0;
    let cancelled = false;

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (!cancelled) measure();
        }, 300);
      } else if (attemptsRef.current < 25) {
        attemptsRef.current++;
        setTimeout(tryFind, 150);
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
  }, [visible, targetSelector, measure]);

  if (!visible || !rect) return null;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  return (
    <>
      <style>{SPOTLIGHT_STYLES}</style>
      {/* Dark backdrop with cutout via box-shadow */}
      <div
        style={{
          zIndex: 9998,
          pointerEvents: "none",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          borderRadius: isCircle ? "50%" : 12,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          position: "fixed",
        }}
      />
      {/* Pulse ring */}
      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          left: cx,
          top: cy,
          width: rect.width + 4,
          height: rect.height + 4,
          transform: "translate(-50%, -50%)",
          borderRadius: isCircle ? "50%" : 14,
          border: "2px solid rgba(255,255,255,0.5)",
          pointerEvents: "none",
          animation: "tutorial-pulse 1.5s ease-in-out infinite",
        }}
      />
      {/* Extra glow ring for FAB step */}
      {glowRing && isCircle && (
        <div
          style={{
            position: "fixed",
            zIndex: 9999,
            left: cx,
            top: cy,
            width: 80,
            height: 80,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "rgba(99,153,34,0.4)",
            pointerEvents: "none",
            animation: "tutorial-glow 1.5s ease-out infinite",
          }}
        />
      )}
    </>
  );
};

export default TutorialSpotlight;
