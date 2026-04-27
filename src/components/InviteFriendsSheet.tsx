import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface FriendProfile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface InviteFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  /** Called when user taps the bottom "완료" button. Receives count of invited friends. */
  onDone?: (invitedCount: number) => void;
}

const InviteFriendsSheet = ({ open, onOpenChange, planId, onDone }: InviteFriendsSheetProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<number | null>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setInvitedIds(new Set());
    }
  }, [open]);

  // Load already-invited list when opened
  useEffect(() => {
    if (!open || !planId) return;
    (async () => {
      const { data } = await supabase
        .from("plan_invitations")
        .select("invitee_id")
        .eq("plan_id", planId);
      if (data) {
        setInvitedIds(new Set((data as any[]).map((r) => r.invitee_id)));
      }
    })();
  }, [open, planId]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, nickname, avatar_url")
        .ilike("nickname", `%${query.trim()}%`)
        .neq("user_id", user.id)
        .limit(10);
      setResults((data as any) || []);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  const invitedCount = useMemo(
    () => Array.from(invitedIds).length,
    [invitedIds]
  );

  const handleInvite = async (friend: FriendProfile) => {
    if (!user) return;
    const { error } = await supabase
      .from("plan_invitations")
      .insert({
        plan_id: planId,
        inviter_id: user.id,
        invitee_id: friend.user_id,
        status: "pending",
      } as any);

    if (!error) {
      setInvitedIds((prev) => new Set(prev).add(friend.user_id));
      toast.success(`${friend.nickname || "친구"}님에게 초대를 보냈어요!`);
    } else if ((error as any).code === "23505") {
      setInvitedIds((prev) => new Set(prev).add(friend.user_id));
      toast.error("이미 초대한 친구예요");
    } else {
      toast.error("초대 실패: " + error.message);
    }
  };

  const handleDone = () => {
    onOpenChange(false);
    onDone?.(invitedCount);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 border-0 rounded-t-[20px]"
        style={{
          background: "hsl(var(--background))",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center mb-3">
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "hsl(var(--border))",
              }}
            />
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <h2 style={{ fontSize: 16, fontWeight: 500, color: "hsl(var(--foreground))" }}>
              친구 초대하기
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}
            >
              나중에
            </button>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "hsl(var(--muted-foreground))",
              marginBottom: 16,
            }}
          >
            함께 등산할 친구를 초대해보세요
          </p>

          {/* Search input */}
          <div
            className="flex items-center gap-2"
            style={{
              border: "0.5px solid hsl(var(--border))",
              borderRadius: "var(--radius, 12px)",
              padding: "10px 12px",
            }}
          >
            <Search size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="닉네임으로 검색"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: 14, color: "hsl(var(--foreground))" }}
            />
          </div>

          {/* Results */}
          <div className="mt-2 mb-4">
            {searching && query.trim() && (
              <p className="text-xs text-muted-foreground py-3 text-center">검색 중...</p>
            )}
            {!searching && query.trim() && results.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center">
                검색 결과가 없습니다
              </p>
            )}
            {results.map((f) => {
              const isInvited = invitedIds.has(f.user_id);
              return (
                <div
                  key={f.user_id}
                  className="flex items-center"
                  style={{
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "0.5px solid hsl(var(--border))",
                  }}
                >
                  {/* Avatar */}
                  {f.avatar_url ? (
                    <img
                      src={f.avatar_url}
                      alt={f.nickname || ""}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "hsl(var(--secondary))",
                        color: "hsl(var(--foreground))",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {f.nickname?.[0] || "?"}
                    </div>
                  )}
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "hsl(var(--foreground))",
                      }}
                      className="truncate"
                    >
                      {f.nickname || "사용자"}
                    </p>
                  </div>
                  {/* Status button */}
                  {isInvited ? (
                    <button
                      disabled
                      style={{
                        background: "hsl(var(--secondary))",
                        color: "hsl(var(--muted-foreground))",
                        borderRadius: 20,
                        fontSize: 12,
                        padding: "5px 12px",
                        border: "none",
                      }}
                    >
                      초대됨 ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInvite(f)}
                      style={{
                        background: "#639922",
                        color: "#fff",
                        borderRadius: 20,
                        fontSize: 12,
                        padding: "5px 12px",
                        border: "none",
                        fontWeight: 500,
                      }}
                    >
                      초대
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Done button */}
          <button
            onClick={handleDone}
            style={{
              width: "100%",
              height: 48,
              background: "#639922",
              color: "#fff",
              borderRadius: "var(--radius, 12px)",
              fontSize: 15,
              fontWeight: 500,
              border: "none",
            }}
          >
            {invitedCount > 0 ? `완료 (${invitedCount}명 초대)` : "초대 완료"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InviteFriendsSheet;
