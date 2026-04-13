import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Flag, Ban } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { useUserBlocks } from "@/hooks/useUserBlocks";
import { useAuth } from "@/contexts/AuthContext";

interface ContentMenuProps {
  targetType: "post" | "comment" | "journal";
  targetId: string;
  authorId: string;
  authorName?: string;
}

export function ContentMenu({ targetType, targetId, authorId, authorName }: ContentMenuProps) {
  const { user } = useAuth();
  const { isBlocked, blockUser } = useUserBlocks();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

  // Don't show menu for own content or when not logged in
  if (!user || user.id === authorId) return null;

  const alreadyBlocked = isBlocked(authorId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-sm gap-2">
            <Flag className="h-3.5 w-3.5" />
            신고하기
          </DropdownMenuItem>
          {!alreadyBlocked && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setBlockConfirmOpen(true)}
                className="text-sm gap-2 text-destructive focus:text-destructive"
              >
                <Ban className="h-3.5 w-3.5" />
                사용자 차단
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType={targetType}
        targetId={targetId}
      />

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자를 차단하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {authorName ? `${authorName}님을` : "이 사용자를"} 차단하면 해당 사용자의 게시물과 댓글이 표시되지 않습니다. 설정에서 차단을 해제할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockUser.mutate(authorId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              차단하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
