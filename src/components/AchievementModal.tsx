import { BadgeDefinition } from "@/data/badges";
import { useEffect, useState } from "react";

interface Props {
  badge: BadgeDefinition | null;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ["hsl(var(--brand-forest))", "hsl(var(--brand-lime))", "hsl(var(--brand-coral))", "hsl(var(--brand-coral))"];

const AchievementModal = ({ badge, onDismiss }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      const t = setTimeout(() => setVisible(true), 50);
      const autoDismiss = setTimeout(onDismiss, 4000);
      return () => { clearTimeout(t); clearTimeout(autoDismiss); };
    } else {
      setVisible(false);
    }
  }, [badge, onDismiss]);

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.5)", opacity: visible ? 1 : 0 }}
        onClick={onDismiss}
      />

      {/* Confetti */}
      {visible && Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full z-10"
          style={{
            width: 6,
            height: 6,
            background: CONFETTI_COLORS[i % 4],
            left: `${15 + (i * 6.5) % 70}%`,
            top: "30%",
            animation: `confettiFall 1.2s ease-out ${(i * 0.05).toFixed(2)}s forwards`,
            opacity: 0,
          }}
        />
      ))}

      {/* Card */}
      <div
        className="relative z-20 w-full bg-card text-center transition-all duration-500"
        style={{
          maxWidth: 280,
          padding: "28px 24px",
          borderRadius: "var(--border-radius-xl, 20px)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.85) translateY(20px)",
        }}
      >
        {/* Icon circle */}
        <div
          className="mx-auto flex items-center justify-center rounded-full"
          style={{ width: 60, height: 60, background: "hsl(var(--brand-lime))" }}
        >
          <span style={{ fontSize: 28, lineHeight: 1, color: "hsl(var(--brand-forest))" }}>{badge.icon}</span>
        </div>

        <p className="text-foreground" style={{ fontSize: 18, fontWeight: 500, marginTop: 12 }}>
          업적 달성!
        </p>
        <p className="text-muted-foreground" style={{ fontSize: 14, marginTop: 4 }}>
          {badge.name}
        </p>

        <button
          onClick={onDismiss}
          className="w-full text-white font-medium"
          style={{
            background: "hsl(var(--brand-forest))",
            borderRadius: "var(--border-radius-md, 12px)",
            height: 44,
            marginTop: 20,
            fontSize: 14,
          }}
        >
          확인
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(120px) scale(0.5); }
        }
      `}</style>
    </div>
  );
};

export default AchievementModal;
