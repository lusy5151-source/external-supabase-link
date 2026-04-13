import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StackedAvatarsProps {
  profiles: { nickname: string | null; avatar_url: string | null }[];
  max?: number;
  size?: "sm" | "md";
}

export function StackedAvatars({ profiles, max = 4, size = "sm" }: StackedAvatarsProps) {
  const shown = profiles.slice(0, max);
  const remaining = profiles.length - max;
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const textSize = size === "sm" ? "text-[9px]" : "text-xs";

  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={i} className={`${i > 0 ? "-ml-2" : ""} relative`} style={{ zIndex: shown.length - i }}>
          <Avatar className={`${sizeClass} border-2 border-card`}>
            <AvatarImage src={p.avatar_url || undefined} />
            <AvatarFallback className={`${textSize} bg-mint-light text-primary font-semibold`}>
              {(p.nickname || "?")[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
      {remaining > 0 && (
        <div className="-ml-2 relative" style={{ zIndex: 0 }}>
          <div className={`${sizeClass} rounded-full border-2 border-card bg-secondary flex items-center justify-center`}>
            <span className={`${textSize} font-semibold text-muted-foreground`}>+{remaining}</span>
          </div>
        </div>
      )}
    </div>
  );
}