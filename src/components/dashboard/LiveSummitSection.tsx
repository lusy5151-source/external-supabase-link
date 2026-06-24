import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Crown, MapPin, MoreVertical, Mountain, Trash2 } from "lucide-react";
import type { LiveSummitClaim, MountainKingOfDay } from "@/hooks/useLiveSummitFeed";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LiveSummitSectionProps {
  claims: Array<LiveSummitClaim & { isDemo?: boolean }>;
  kingOfDay: MountainKingOfDay | null;
  loading?: boolean;
  mountains: Array<{ id: number; nameKo?: string; region?: string }>;
  currentUserId?: string | null;
  onDeleteClaim?: (claim: LiveSummitClaim) => Promise<void> | void;
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function LiveSummitSection({ claims, kingOfDay, loading, mountains, currentUserId, onDeleteClaim }: LiveSummitSectionProps) {
  const mountainMap = new Map(mountains.map((mountain) => [mountain.id, mountain]));
  const [deleteTarget, setDeleteTarget] = useState<LiveSummitClaim | null>(null);
  const [deleting, setDeleting] = useState(false);

  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#F8FAED" }}>
            <Camera className="h-4 w-4" style={{ color: "#2F403A" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">실시간 정상 인증</h2>
            <p className="text-[11px] text-muted-foreground">방금 올라온 완등 순간</p>
          </div>
        </div>
        {kingOfDay && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: "#C7D66D", color: "#2F403A" }}>
            <Crown className="h-3 w-3" />
            오늘 {kingOfDay.claim_count}회
          </div>
        )}
      </div>

      {loading && claims.length === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : claims.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {claims.slice(0, 5).map((claim) => {
            const mountain = mountainMap.get(claim.mountain_id);
            return (
              <article key={claim.id} className="min-w-[136px] overflow-hidden rounded-xl border border-border bg-background">
                <div className="relative aspect-[4/3] bg-secondary">
                  {claim.photo_url ? (
                    <img src={claim.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ background: "#C6DBF0" }}>
                      <Mountain className="h-7 w-7" style={{ color: "#2F403A" }} />
                    </div>
                  )}
                  {claim.user_id === currentUserId && !claim.isDemo && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(claim)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                      aria-label="정상인증 삭제 메뉴"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-1 p-2">
                  <p className="truncate text-xs font-bold text-foreground">{claim.summit_name || `${mountain?.nameKo || "정상"} 인증`}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {claim.isDemo ? (
                      <span className="font-semibold text-foreground">{claim.nickname || "완등러"}</span>
                    ) : (
                      <Link
                        to={`/profile/${claim.user_id}`}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {claim.nickname || "완등러"}
                      </Link>
                    )}
                    {" · "}
                    {formatTime(claim.claimed_at)}
                  </p>
                  {mountain?.nameKo && (
                    <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {mountain.nameKo}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl px-3 py-4 text-center text-xs text-muted-foreground" style={{ background: "#F8FAED" }}>
          아직 올라온 정상 인증이 없어요.
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정상인증을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 정상인증과 사진은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (event) => {
                event.preventDefault();
                if (!deleteTarget || !onDeleteClaim) return;
                setDeleting(true);
                try {
                  await onDeleteClaim(deleteTarget);
                  setDeleteTarget(null);
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
