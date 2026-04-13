import { BadgeDefinition } from "@/data/badges";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import MountainMascot from "@/components/MountainMascot";

interface Props {
  badge: BadgeDefinition | null;
  onDismiss: () => void;
}

const AchievementModal = ({ badge, onDismiss }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [badge]);

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onDismiss}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-xs rounded-2xl border border-border bg-card p-8 text-center shadow-xl transition-all duration-500"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
        }}
      >
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Mascot celebrating */}
        <div className="mx-auto mb-2">
          <MountainMascot size={80} mood="celebrating" />
        </div>

        {/* Badge icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="text-5xl"
            style={{
              animation: visible ? "badgeBounce 0.6s ease-out" : "none",
            }}
          >
            {badge.icon}
          </span>
        </div>

        <p className="text-xs font-medium uppercase tracking-wider text-primary">업적 달성!</p>
        <h3 className="mt-1 text-lg font-bold text-foreground">{badge.name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{badge.description}</p>

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          확인
        </button>
      </div>

      <style>{`
        @keyframes badgeBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AchievementModal;
