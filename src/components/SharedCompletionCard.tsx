import { mountains } from "@/data/mountains";
import { StackedAvatars } from "./StackedAvatars";
import { Users, Mountain, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SharedCompletion } from "@/hooks/useSharedCompletions";

interface SharedCompletionCardProps {
  completion: SharedCompletion;
  onTap?: () => void;
}

export function SharedCompletionCard({ completion, onTap }: SharedCompletionCardProps) {
  const mt = mountains.find((m) => m.id === completion.mountain_id);
  const profiles = (completion.participants || [])
    .map((p) => p.profile)
    .filter(Boolean) as { nickname: string | null; avatar_url: string | null }[];

  const verifiedCount = (completion.participants || []).filter((p) => p.verified).length;
  const totalCount = (completion.participants || []).length;

  return (
    <div
      onClick={onTap}
      className="rounded-2xl bg-card border border-border p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-light">
            <Mountain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{mt?.nameKo || "산"}</h3>
            <p className="text-[10px] text-muted-foreground">{mt?.region}</p>
          </div>
        </div>
        <Badge className="bg-sky-hero text-primary border-0 gap-1">
          <Users className="h-3 w-3" />
          함께 완등
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StackedAvatars profiles={profiles} max={5} />
          <span className="text-[10px] text-muted-foreground">{totalCount}명 참여</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(completion.completed_at).toLocaleDateString("ko-KR")}
        </div>
      </div>

      {verifiedCount < totalCount && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-primary" />
          {verifiedCount}/{totalCount}명 확인 완료
        </div>
      )}
    </div>
  );
}
