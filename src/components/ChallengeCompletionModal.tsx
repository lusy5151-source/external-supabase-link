import { X, Share2, Download } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import MountainMascot from "@/components/MountainMascot";

interface Props {
  challenge: {
    title: string;
    description?: string | null;
    badge?: { name: string; image_url: string | null } | null;
  } | null;
  onDismiss: () => void;
}

const ChallengeCompletionModal = ({ challenge, onDismiss }: Props) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (challenge) { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }
    else setVisible(false);
  }, [challenge]);
  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" style={{ opacity: visible ? 1 : 0 }} onClick={onDismiss} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-xl transition-all duration-500"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.7) translateY(40px)" }}>
        <button onClick={onDismiss} className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
        <MountainMascot size={80} mood="success" />
        <div className="mx-auto mb-4 mt-2 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <span className="text-6xl">{challenge.badge?.image_url || "🏆"}</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">챌린지 달성!</p>
        <h3 className="mt-1 text-xl font-bold text-foreground">{challenge.title}</h3>
        {challenge.description && <p className="mt-2 text-sm text-muted-foreground">{challenge.description}</p>}
        {challenge.badge && <p className="mt-2 text-sm font-medium text-emerald-600">🏅 {challenge.badge.name} 배지 획득!</p>}
        <div className="mt-5 flex gap-2">
          <Button onClick={onDismiss} className="flex-1">닫기</Button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCompletionModal;
