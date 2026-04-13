import { useState, useMemo } from "react";
import { mountains } from "@/data/mountains";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserMountains } from "@/hooks/useUserMountains";

interface Props {
  reportedMountainId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DuplicateReportModal({ reportedMountainId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { userMountainsAsMountains } = useUserMountains();
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allSearchable = useMemo(() => {
    return [...mountains, ...userMountainsAsMountains.filter((m) => m.id !== reportedMountainId)];
  }, [userMountainsAsMountains, reportedMountainId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allSearchable.slice(0, 20);
    const q = search.toLowerCase();
    return allSearchable.filter((m) => m.nameKo.includes(search) || m.name.toLowerCase().includes(q)).slice(0, 20);
  }, [search, allSearchable]);

  const handleSelect = async (existingMountainId: number) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("mountain_duplicate_reports" as any)
        .insert({
          reported_mountain_id: reportedMountainId,
          existing_mountain_id: existingMountainId,
          reported_by: user.id,
        } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("이미 이 산에 대해 신고하셨습니다");
        } else {
          throw error;
        }
      } else {
        toast.success("신고가 접수되었어요. 검토 후 처리됩니다.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error("신고 실패", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            어느 산과 중복인가요?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="산 이름으로 검색..."
              className="pl-10"
            />
          </div>

          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">검색 결과가 없습니다</p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  disabled={submitting}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.nameKo}</p>
                    <p className="text-xs text-muted-foreground">{m.region} · {m.height}m</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7" disabled={submitting}>
                    선택
                  </Button>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
