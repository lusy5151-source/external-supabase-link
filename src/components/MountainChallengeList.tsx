import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, MapPin, Mountain as MountainIcon, Trophy } from "lucide-react";
import {
  ChallengeListType,
  useChallengeMountains,
  useUserMountainChallenges,
  useToggleChallengeCompletion,
} from "@/hooks/useMountainChallenges";
import { useToast } from "@/hooks/use-toast";

interface Props {
  type: ChallengeListType;
  title: string;
  subtitle: string;
}

export default function MountainChallengeList({ type, title, subtitle }: Props) {
  const { data: mountains = [], isLoading } = useChallengeMountains(type);
  const { data: userRows = [] } = useUserMountainChallenges(type);
  const toggle = useToggleChallengeCompletion(type);
  const { toast } = useToast();

  const userMap = new Map<string, { id: string; completed: boolean }>();
  userRows.forEach((r) => {
    const key = type === "forestry_100" ? `m:${r.mountain_id}` : `b:${r.bac100_id}`;
    userMap.set(key, { id: r.id, completed: r.is_completed });
  });

  const completedCount = userRows.filter((r) => r.is_completed).length;
  const total = 100;
  const pct = Math.min(100, Math.round((completedCount / total) * 100));

  const handleToggle = async (item: typeof mountains[number]) => {
    const key = type === "forestry_100" ? `m:${item.mountainId}` : `b:${item.rowId}`;
    const existing = userMap.get(key);
    try {
      await toggle.mutateAsync({
        mountainId: type === "forestry_100" ? item.mountainId : item.mountainId,
        bac100Id: type === "bac_100" ? item.rowId : null,
        isCompleted: existing?.completed ?? false,
        existingId: existing?.id,
      });
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-emerald-100/50 dark:from-primary/5 dark:to-emerald-900/20 p-5 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary leading-none">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {total}</p>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground text-right">{pct}% 달성</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : mountains.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          데이터가 없습니다
        </p>
      ) : (
        <div className="space-y-2">
          {mountains.map((m) => {
            const key = type === "forestry_100" ? `m:${m.mountainId}` : `b:${m.rowId}`;
            const completed = userMap.get(key)?.completed ?? false;
            const inner = (
              <div
                className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors ${
                  completed ? "border-primary/30 bg-primary/5" : "border-border"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle(m);
                  }}
                  className="shrink-0"
                  aria-label={completed ? "완등 취소" : "완등 표시"}
                >
                  {completed ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </button>
                {m.rank != null && (
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground px-1.5">
                    {m.rank}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{m.name_ko}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {m.height != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <MountainIcon className="h-3 w-3" />
                        {m.height}m
                      </span>
                    )}
                    {m.region && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {m.region}
                      </span>
                    )}
                  </div>
                </div>
                {m.mountainId != null && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
              </div>
            );
            return m.mountainId != null ? (
              <Link key={`${type}-${m.rowId}`} to={`/mountains/${m.mountainId}`} className="block">
                {inner}
              </Link>
            ) : (
              <div key={`${type}-${m.rowId}`}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
