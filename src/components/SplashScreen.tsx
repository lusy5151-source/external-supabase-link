import React, { useEffect, useState } from "react";
import splashImage from "@/assets/splash-wandeung.png";

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 1800);
    const timer2 = setTimeout(() => onFinish(), 2300);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#E8EEF2",
        backgroundImage: `url(${splashImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
      aria-label="완등"
      role="img"
    />
  );
};

export default SplashScreen;
