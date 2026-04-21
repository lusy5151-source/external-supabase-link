import { Link, useLocation } from "react-router-dom";
import { Home, Compass, ClipboardList, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationCenter from "@/components/NotificationCenter";
import MountainMascot from "@/components/MountainMascot";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { Trophy, LogIn } from "lucide-react";

const navItems = [
  { to: "/", label: "홈", icon: Home },
  { to: "/mountains", label: "탐색", icon: Compass },
  null, // FAB placeholder
  { to: "/records", label: "기록", icon: ClipboardList },
  { to: "/my", label: "마이", icon: User },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(205, 50%, 88%) 0%, hsl(var(--background)) 30%)" }}>
      {/* Top header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <MountainMascot size={32} />
            <span className="text-base font-bold text-foreground tracking-tight">완등</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {user && <NotificationCenter />}
            {!user && (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
              >
                <LogIn className="h-3.5 w-3.5" /> 로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-5 py-7">{children}</main>
      <OnboardingTutorial />

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: "hsl(var(--color-background-primary))",
          borderTop: "0.5px solid hsl(var(--color-border-tertiary))",
        }}
      >
        {/* FAB - center, lifted above bar */}
        <Link
          to="/summit-claim"
          className="absolute left-1/2 flex flex-col items-center"
          style={{ transform: "translateX(-50%)", top: -14 }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "#639922" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3L16 15H4L10 3Z" fill="white" />
              <circle cx="10" cy="5" r="1.5" fill="white" />
            </svg>
          </div>
          <span style={{ fontSize: 10, color: "#3B6D11", fontWeight: 500, marginTop: 2 }}>
            인증
          </span>
        </Link>

        <div className="container mx-auto flex items-center justify-around px-2 py-1">
          {navItems.map((item, idx) => {
            if (!item) {
              return <div key="fab-placeholder" className="flex-shrink-0" style={{ width: 44 }} />;
            }

            const { to, label, icon: Icon } = item;
            const active = to === "/"
              ? pathname === "/"
              : pathname.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-0.5 transition-colors"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <div
                  className="flex items-center justify-center rounded-full transition-colors"
                  style={{
                    width: 32,
                    height: 32,
                    background: active ? "hsl(var(--color-tab-active-bg))" : "transparent",
                  }}
                >
                  <Icon
                    className="transition-colors"
                    style={{
                      width: 20,
                      height: 20,
                      color: active
                        ? "hsl(var(--color-tab-active-label))"
                        : "hsl(var(--color-text-tertiary))",
                    }}
                  />
                </div>
                <span
                  className="font-semibold leading-none"
                  style={{
                    fontSize: 10,
                    color: active
                      ? "hsl(var(--color-tab-active-label))"
                      : "hsl(var(--color-text-tertiary))",
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;