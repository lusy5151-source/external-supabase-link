import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHikingPlans, type PlanNotification } from "@/hooks/useHikingPlans";
import { useGroupNotifications, type GroupNotification } from "@/hooks/useGroupNotifications";
import { Bell, Calendar, UserCheck, AlertTriangle, Cloud, X, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useUnreadChat } from "@/contexts/UnreadChatContext";
import { supabase } from "@/integrations/supabase/client";

const typeConfig: Record<string, { icon: any; color: string }> = {
  invitation: { icon: Calendar, color: "text-primary" },
  rsvp_change: { icon: UserCheck, color: "text-green-600" },
  plan_update: { icon: AlertTriangle, color: "text-amber-500" },
  weather_alert: { icon: Cloud, color: "text-sky-500" },
  reminder: { icon: Bell, color: "text-orange-500" },
  group_invitation: { icon: Users, color: "text-primary" },
};

const formatRelativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
};

const NotificationCenter = () => {
  const { notifications, markNotificationRead, deleteNotification } = useHikingPlans();
  const {
    notifications: groupNotifs,
    invitations,
    unreadCount: groupUnread,
    accept,
    reject,
    markRead,
    markAllRead,
  } = useGroupNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadChatCount } = useUnreadChat();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const planUnread = notifications.filter((n) => !n.is_read).length;
  const totalBadge = planUnread + groupUnread + unreadChatCount;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePlanClick = (n: PlanNotification) => {
    if (!n.is_read) markNotificationRead(n.id);
    setOpen(false);
    navigate(`/plans/${n.plan_id}`);
  };

  const handleDelete = (e: React.MouseEvent, n: PlanNotification) => {
    e.stopPropagation();
    deleteNotification(n.id);
    toast({ title: "알림이 삭제되었습니다" });
  };

  const handleAccept = async (invitationId: string, notificationId: string) => {
    const { error } = await accept(invitationId, notificationId);
    if (error) {
      toast({ title: "수락 실패", description: (error as any).message, variant: "destructive" });
    } else {
      toast({ title: "산악회에 참여했어요! 🏔" });
    }
  };

  const handleReject = async (invitationId: string, notificationId: string) => {
    const { error } = await reject(invitationId, notificationId);
    if (error) {
      toast({ title: "거절 실패", description: (error as any).message, variant: "destructive" });
    } else {
      toast({ title: "초대를 거절했어요" });
    }
  };

  const groupInvitationNotifs = groupNotifs.filter(
    (n) => n.type === "group_invitation" && !n.is_read,
  );
  const otherGroupNotifs = groupNotifs.filter(
    (n) => n.type !== "group_invitation",
  );

  const isEmpty =
    notifications.length === 0 &&
    groupInvitationNotifs.length === 0 &&
    otherGroupNotifs.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-primary"
      >
        <Bell className="h-4 w-4" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: "#E24B4A" }}>
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">알림</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {isEmpty ? (
            <div className="px-4 py-8 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">새 알림이 없습니다</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* Group invitation notifications with action buttons */}
              {groupInvitationNotifs.map((n) => {
                const matchingInv = invitations.find((i) => i.id === n.related_id);
                return (
                  <div
                    key={n.id}
                    className="border-b border-border/50 last:border-0 bg-primary/5 px-4 py-3 flex items-center gap-2"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary"
                      style={{ background: "#EAF3DE" }}
                    >
                      {matchingInv?.hiking_group?.avatar_url ? (
                        <img src={matchingInv.hiking_group.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        (matchingInv?.hiking_group?.name || "산").charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                    {matchingInv ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleAccept(matchingInv.id, n.id)}
                          className="rounded-full px-2.5 py-1 text-[12px] font-medium text-white"
                          style={{ background: "#639922" }}
                        >
                          수락
                        </button>
                        <button
                          onClick={() => handleReject(matchingInv.id, n.id)}
                          className="rounded-full border px-2.5 py-1 text-[12px] text-muted-foreground border-border"
                        >
                          거절
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
                      >
                        읽음
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Plan notifications */}
              {notifications.map((n) => {
                const config = typeConfig[n.type] || typeConfig.invitation;
                const Icon = config.icon;
                const isUnread = !n.is_read;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0 group relative",
                      isUnread
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <button
                      onClick={() => handlePlanClick(n)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className={cn("mt-0.5 shrink-0", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-snug",
                          isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(n.created_at), "M월 d일 HH:mm", { locale: ko })}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, n)}
                      className="shrink-0 mt-1 p-1 rounded-md text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                      title="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
