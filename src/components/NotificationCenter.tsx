import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHikingPlans, type PlanNotification } from "@/hooks/useHikingPlans";
import { Bell, Calendar, UserCheck, UserX, AlertTriangle, Cloud, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const typeConfig: Record<string, { icon: any; color: string }> = {
  invitation: { icon: Calendar, color: "text-primary" },
  rsvp_change: { icon: UserCheck, color: "text-green-600" },
  plan_update: { icon: AlertTriangle, color: "text-amber-500" },
  weather_alert: { icon: Cloud, color: "text-sky-500" },
  reminder: { icon: Bell, color: "text-orange-500" },
};

const NotificationCenter = () => {
  const { notifications, markNotificationRead } = useHikingPlans();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n: PlanNotification) => {
    markNotificationRead(n.id);
    setOpen(false);
    navigate(`/plans/${n.plan_id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-primary"
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {notifications.length > 9 ? "9+" : notifications.length}
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

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">새 알림이 없습니다</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const config = typeConfig[n.type] || typeConfig.invitation;
                const Icon = config.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className={cn("mt-0.5 shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "M월 d일 HH:mm", { locale: ko })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                  </button>
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
