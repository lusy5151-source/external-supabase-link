import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, X } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const formatRelativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  return `${day}일 전`;
};

const typeStyle: Record<string, { emoji: string; bg: string }> = {
  group_invitation: { emoji: "👥", bg: "#EAF3DE" },
  invitation_accepted: { emoji: "🎉", bg: "#EAF3DE" },
  new_member_joined: { emoji: "🙋", bg: "#EAF3DE" },
  club_chat: { emoji: "💬", bg: "#EEF2FF" },
  plan_created: { emoji: "📅", bg: "#FAEEDA" },
  plan_joined: { emoji: "✅", bg: "#EAF3DE" },
  plan_declined: { emoji: "😔", bg: "#FCEBEB" },
  plan_updated: { emoji: "📝", bg: "#FAEEDA" },
  plan_deleted: { emoji: "🗑", bg: "#FCEBEB" },
  plan_cancelled: { emoji: "❌", bg: "#FCEBEB" },
  plan_status_changed: { emoji: "🏔", bg: "#EAF3DE" },
};

const getStyle = (type: string) =>
  typeStyle[type] || { emoji: "🔔", bg: "hsl(var(--color-background-secondary))" };

const groupByDate = (list: AppNotification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekStart = today - 6 * 86400000;
  const groups: Record<string, AppNotification[]> = {
    오늘: [],
    어제: [],
    "이번 주": [],
    이전: [],
  };
  list.forEach((n) => {
    const t = new Date(n.created_at).getTime();
    if (t >= today) groups["오늘"].push(n);
    else if (t >= yesterday) groups["어제"].push(n);
    else if (t >= weekStart) groups["이번 주"].push(n);
    else groups["이전"].push(n);
  });
  return groups;
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    notifications,
    fetchNotifications,
    markAllRead,
    deleteAll,
    deleteOne,
  } = useNotifications();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  const handleAccept = async (n: AppNotification) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !n.related_id) return;
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", n.related_id)
      .eq("invitee_id", user.id);
    if (error) {
      console.error(JSON.stringify(error));
      toast({ title: "수락 실패", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    toast({ title: "산악회에 참여했어요! 🏔" });
    fetchNotifications();
  };

  const handleReject = async (n: AppNotification) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !n.related_id) return;
    const { error } = await (supabase as any)
      .from("group_invitations")
      .update({ status: "rejected" })
      .eq("id", n.related_id)
      .eq("invitee_id", user.id);
    if (error) {
      console.error(JSON.stringify(error));
      toast({ title: "거절 실패", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("notifications").delete().eq("id", n.id);
    toast({ title: "초대를 거절했어요" });
    fetchNotifications();
  };

  const handleCardClick = async (n: AppNotification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.type === "group_invitation") {
      navigate("/my?tab=invitations");
      return;
    }
    if (!n.related_id) {
      fetchNotifications();
      return;
    }
    if (n.type === "club_chat") {
      const { data } = await (supabase as any)
        .from("club_messages")
        .select("club_id")
        .eq("id", n.related_id)
        .maybeSingle();
      if (data?.club_id) navigate(`/groups/${data.club_id}`);
      else navigate("/social");
      return;
    }
    if (n.type === "invitation_accepted" || n.type === "new_member_joined") {
      navigate(`/groups/${n.related_id}`);
      return;
    }
    if (n.type === "plan_deleted" || n.type === "plan_cancelled") {
      // No navigation — plan is gone
      fetchNotifications();
      return;
    }
    if (
      n.type === "plan_created" ||
      n.type === "plan_joined" ||
      n.type === "plan_declined" ||
      n.type === "plan_updated" ||
      n.type === "plan_status_changed"
    ) {
      navigate(`/plans/${n.related_id}`);
      return;
    }
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast({ title: "모두 읽음 처리했어요" });
  };

  const handleConfirmDeleteAll = async () => {
    setConfirmDeleteAll(false);
    await deleteAll();
    toast({ title: "모든 알림을 삭제했어요" });
  };

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteOne(id);
  };

  const isEmpty = notifications.length === 0;

  return (
    <div className="-mx-5 -my-7">
      {/* Header */}
      <div
        className="sticky top-14 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: "hsl(var(--color-background-primary))",
          borderBottom: "0.5px solid hsl(var(--color-border-tertiary))",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="뒤로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 500 }}>알림</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            style={{ fontSize: 13, color: "#3B6D11", fontWeight: 500 }}
            disabled={isEmpty}
            className="disabled:opacity-40"
          >
            모두 읽음
          </button>
          <button
            onClick={() => setConfirmDeleteAll(true)}
            style={{ fontSize: 13, color: "#E24B4A", fontWeight: 500 }}
            disabled={isEmpty}
            className="disabled:opacity-40"
          >
            전체 삭제
          </button>
        </div>
      </div>

      {/* List */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-6 text-center" style={{ marginTop: 80 }}>
          <Bell
            style={{
              width: 48,
              height: 48,
              color: "hsl(var(--color-text-tertiary))",
              marginBottom: 16,
            }}
          />
          <p style={{ fontSize: 14, color: "hsl(var(--color-text-secondary))" }}>
            아직 알림이 없어요
          </p>
          <p
            style={{
              fontSize: 12,
              color: "hsl(var(--color-text-tertiary))",
              marginTop: 6,
            }}
          >
            산악회 활동을 시작하면 알림이 와요
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label}>
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--color-text-tertiary))",
                    background: "hsl(var(--color-background-secondary))",
                    padding: "8px 16px",
                  }}
                >
                  {label}
                </div>
                {items.map((n) => {
                  const s = getStyle(n.type);
                  const isUnread = !n.is_read;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleCardClick(n)}
                      className="w-full text-left transition-colors"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "14px 16px",
                        background: isUnread
                          ? "#F0FBE8"
                          : "hsl(var(--color-background-primary))",
                        borderBottom: "0.5px solid hsl(var(--color-border-tertiary))",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: s.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        <span>{s.emoji}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: isUnread ? 500 : 400,
                            color: "hsl(var(--color-text-primary))",
                            lineHeight: 1.5,
                          }}
                        >
                          {n.message}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "hsl(var(--color-text-tertiary))",
                            marginTop: 4,
                          }}
                        >
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                      {n.type === "group_invitation" ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexShrink: 0,
                            alignItems: "center",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(n);
                            }}
                            style={{
                              background: "#639922",
                              color: "white",
                              borderRadius: 20,
                              fontSize: 12,
                              padding: "4px 10px",
                              fontWeight: 500,
                            }}
                          >
                            수락
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(n);
                            }}
                            style={{
                              border: "0.5px solid hsl(var(--color-border-secondary))",
                              color: "hsl(var(--color-text-secondary))",
                              borderRadius: 20,
                              fontSize: 12,
                              padding: "4px 10px",
                              background: "transparent",
                            }}
                          >
                            거절
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleDeleteOne(e, n.id)}
                          style={{
                            flexShrink: 0,
                            padding: 4,
                            color: "hsl(var(--color-text-tertiary))",
                          }}
                          aria-label="삭제"
                        >
                          <X style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            ),
          )}
        </div>
      )}

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>모든 알림을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 알림은 복구할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              style={{ background: "#E24B4A", color: "white" }}
            >
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationsPage;
