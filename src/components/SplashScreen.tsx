import React, { useEffect, useState } from "react";
import MountainMascot from "./MountainMascot";

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 1800);
    const timer2 = setTimeout(() => onFinish(), 2300);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "hsl(205, 50%, 88%)" }}
    >
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 400 140" className="w-full" preserveAspectRatio="none">
          <path d="M0 140 L0 90 Q60 30 120 70 Q180 110 240 50 Q300 10 360 60 Q380 80 400 55 L400 140 Z" fill="hsl(78, 52%, 56%)" opacity="0.2" />
          <path d="M0 140 L0 110 Q80 60 160 85 Q240 110 320 75 Q360 55 400 80 L400 140 Z" fill="hsl(78, 52%, 56%)" opacity="0.15" />
        </svg>
      </div>
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        <MountainMascot size={140} className="drop-shadow-lg" />
        <h1 className="mt-4 text-4xl font-bold" style={{ color: "hsl(200, 25%, 20%)" }}>완등</h1>
        <p className="mt-2 text-sm font-medium" style={{ color: "hsl(200, 10%, 50%)" }}>산을 정복하는 즐거움</p>
      </div>
    </div>
  );
};

export default SplashScreen;