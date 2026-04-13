import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReports } from "@/hooks/useReports";
import { AlertTriangle } from "lucide-react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "post" | "comment" | "journal";
  targetId: string;
}

const REASONS = [
  { value: "spam" as const, label: "스팸", emoji: "🚫" },
  { value: "inappropriate" as const, label: "부적절한 콘텐츠", emoji: "⚠️" },
  { value: "harassment" as const, label: "괴롭힘/폭언", emoji: "🛑" },
  { value: "other" as const, label: "기타", emoji: "📝" },
];

export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const [reason, setReason] = useState<"spam" | "inappropriate" | "harassment" | "other" | null>(null);
  const [description, setDescription] = useState("");
  const { submitReport } = useReports();

  const handleSubmit = () => {
    if (!reason) return;
    submitReport.mutate(
      { targetType, targetId, reason, description: description || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason(null);
          setDescription("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            신고하기
          </DialogTitle>
          <DialogDescription className="text-xs">
            부적절한 콘텐츠를 신고해주세요. 검토 후 조치하겠습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`w-full flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all ${
                  reason === r.value
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span>{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>

          {reason === "other" && (
            <Textarea
              placeholder="구체적인 사유를 입력해주세요..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
              rows={3}
            />
          )}

          <Button
            onClick={handleSubmit}
            disabled={!reason || submitReport.isPending}
            className="w-full"
            variant="destructive"
          >
            {submitReport.isPending ? "신고 중..." : "신고 접수"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
