import { Link, useLocation } from "react-router-dom";
import { Mountain, BookOpen, Users, Home, Trophy, User, LogIn, Flag, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationCenter from "@/components/NotificationCenter";
import MountainMascot from "@/components/MountainMascot";
import OnboardingTutorial from "@/components/OnboardingTutorial";

const navItems = [
  { to: "/", label: "홈", icon: Home },
  { to: "/mountains", label: "산", icon: Mountain },
  { to: "/records", label: "등산일지", icon: FileText },
  { to: "/leaderboard", label: "순위", icon: Flag },
  { to: "/plans", label: "계획", icon: BookOpen },
  { to: "/social", label: "친구", icon: Users },
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
            <Link
              to="/achievements"
              className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-nature-50 hover:text-nature-600"
            >
              <Trophy className="h-4 w-4" />
            </Link>
            {user ? (
              <Link
                to="/profile"
                className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-nature-50 hover:text-nature-600"
              >
                <User className="h-4 w-4" />
              </Link>
            ) : (
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card" style={{ borderTop: '0.5px solid hsl(210, 58%, 86%)' }}>
        <div className="container mx-auto flex items-center justify-around px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/"
              ? pathname === "/"
              : pathname.startsWith(to) && !(to === "/mountains" && pathname === "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${
                  active
                    ? "text-primary"
                    : "text-foreground/40"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
                <span className={`text-[10px] font-semibold`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;