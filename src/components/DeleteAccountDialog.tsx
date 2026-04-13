import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { Trash2 } from "lucide-react";

export function DeleteAccountDialog() {
  const [reason, setReason] = useState("");
  const { pendingRequest, requestDeletion, cancelDeletion } = useAccountDeletion();
  const navigate = useNavigate();

  if (pendingRequest) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
        <p className="text-sm font-medium text-destructive">⚠️ 계정 삭제 요청이 진행 중입니다</p>
        <p className="text-xs text-muted-foreground">
          삭제가 진행 중입니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelDeletion.mutate()}
          disabled={cancelDeletion.isPending}
        >
          {cancelDeletion.isPending ? "취소 중..." : "삭제 요청 철회"}
        </Button>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-2xl border border-destructive/20 bg-card p-4 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/5">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            계정 삭제
          </div>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 계정을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">이 작업은 되돌릴 수 없습니다. 다음 데이터가 모두 삭제됩니다:</span>
            <span className="block text-xs">• 프로필 정보, 등산 일지, 정상 인증 기록</span>
            <span className="block text-xs">• 친구 목록, 모임 정보, 채팅 내역</span>
            <span className="block text-xs">• 챌린지, 업적, 좋아요, 댓글</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="삭제 사유를 입력해주세요 (선택)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-sm"
          rows={2}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              requestDeletion.mutate(reason || undefined, {
                onSuccess: () => navigate("/delete-account"),
              });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={requestDeletion.isPending}
          >
            {requestDeletion.isPending ? "처리 중..." : "계정 삭제 요청"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
