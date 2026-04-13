import React from "react";

interface MountainMascotProps {
  size?: number;
  className?: string;
  mood?: "default" | "celebrating" | "loading" | "success" | "sad" | "waving";
}

const MountainMascot: React.FC<MountainMascotProps> = ({ size = 120, className = "", mood = "default" }) => {
  const animationClass = mood === "celebrating"
    ? "animate-mascot-celebrate"
    : mood === "loading"
    ? "animate-mascot-bounce"
    : mood === "waving"
    ? "animate-mascot-wave"
    : mood === "success"
    ? "animate-mascot-pop"
    : "";

  return (
    <svg width={size} height={size} viewBox="0 0 602 676" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${animationClass}`} aria-label="WANDEUNG mountain mascot">
      {mood === "celebrating" && (
        <>
          <circle cx="80" cy="60" r="8" fill="hsl(40, 100%, 60%)" className="animate-mascot-sparkle" />
          <circle cx="520" cy="50" r="7" fill="#FF696C" className="animate-mascot-sparkle" style={{ animationDelay: "0.2s" }} />
          <circle cx="60" cy="180" r="6" fill="hsl(270, 60%, 70%)" className="animate-mascot-sparkle" style={{ animationDelay: "0.4s" }} />
          <circle cx="540" cy="170" r="7" fill="#C7D66D" className="animate-mascot-sparkle" style={{ animationDelay: "0.6s" }} />
          <path d="M120 40 L126 24 L132 40 L116 32 L138 32 Z" fill="hsl(40, 100%, 60%)" className="animate-mascot-sparkle" style={{ animationDelay: "0.3s" }} />
          <path d="M480 30 L486 14 L492 30 L476 22 L498 22 Z" fill="#FF696C" className="animate-mascot-sparkle" style={{ animationDelay: "0.5s" }} />
        </>
      )}
      {mood === "success" && (
        <>
          <rect x="80" y="60" width="12" height="12" rx="2" fill="#C7D66D" className="animate-mascot-confetti" />
          <rect x="500" y="45" width="10" height="14" rx="2" fill="#FF696C" className="animate-mascot-confetti" style={{ animationDelay: "0.15s" }} />
          <rect x="160" y="25" width="10" height="10" rx="2" fill="hsl(40, 100%, 60%)" className="animate-mascot-confetti" style={{ animationDelay: "0.3s" }} />
          <rect x="440" y="35" width="12" height="10" rx="2" fill="hsl(270, 60%, 70%)" className="animate-mascot-confetti" style={{ animationDelay: "0.45s" }} />
        </>
      )}
      <path d="M257.437 153.933C269.369 133.266 299.199 133.266 311.13 153.933L503.634 487.358C515.566 508.025 500.651 533.858 476.787 533.858H91.7804C67.9166 533.858 53.0017 508.025 64.9336 487.358L257.437 153.933Z" fill="#C7D66D" />
      <path d="M370.722 244.108C382.232 221.58 414.424 221.58 425.934 244.108L551.344 489.581C561.882 510.207 546.901 534.685 523.738 534.685H272.918C249.755 534.685 234.774 510.207 245.312 489.581L370.722 244.108Z" fill="#C7D66D" />
      <line x1="286.896" y1="166.24" x2="286.896" y2="10.6113" stroke="white" strokeWidth="8" strokeLinecap="round" className={mood === "celebrating" || mood === "success" ? "animate-mascot-flag" : ""} />
      <path d="M389.089 46.0937C390.704 46.7869 390.704 49.0761 389.089 49.7693L299.47 88.2441C298.15 88.8108 296.681 87.8427 296.681 86.4063L296.681 9.45675C296.681 8.02038 298.15 7.05231 299.47 7.61895L389.089 46.0937Z" fill="#FF696C" className={mood === "celebrating" || mood === "success" ? "animate-mascot-flag" : ""} />
      <text transform="translate(304.117 42.6545) rotate(-6.73346)" fill="white" xmlSpace="preserve" fontFamily="sans-serif" fontSize="10" fontWeight="500" letterSpacing="0em"><tspan x="0" y="9.415">WANDEUNG</tspan></text>
      <ellipse cx="235.525" cy="314.861" rx="30.577" ry="42.1467" fill="white" />
      <ellipse cx="321.472" cy="314.861" rx="30.577" ry="42.1467" fill="white" />
      <ellipse cx="233.047" cy="299.159" rx="19.8337" ry="26.445" fill="#666666" />
      <ellipse cx="318.993" cy="299.159" rx="19.8337" ry="26.445" fill="#666666" />
      <ellipse cx="277.51" cy="356.27" rx="20.5191" ry="31.0896" transform="rotate(90.425 277.51 356.27)" fill="#FF696C" />
    </svg>
  );
};

export default MountainMascot;