import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationCenter = () => {
  const { unreadCount } = useNotifications();

  const display = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <Link
      to="/notifications"
      aria-label="알림"
      className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-primary"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span
          className="absolute flex items-center justify-center font-medium text-white"
          style={{
            top: 0,
            right: 0,
            transform: "translate(-2px, 2px)",
            background: "hsl(var(--brand-coral))",
            minWidth: 16,
            height: 16,
            borderRadius: 9999,
            fontSize: 10,
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          {display}
        </span>
      )}
    </Link>
  );
};

export default NotificationCenter;
