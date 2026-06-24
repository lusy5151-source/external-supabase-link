import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PasswordSetupBanner = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Show banner for OAuth users (Google, Kakao) who don't have a password set
  const provider = user?.app_metadata?.provider;
  const isOAuthUser = provider && provider !== "email";

  // Keep hidden after the user either starts setup or dismisses it.
  const dismissKey = `password_banner_dismissed_${user?.id}`;
  const wasDismissed = localStorage.getItem(dismissKey) === "true";

  if (!user || !isOAuthUser || dismissed || wasDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  const handleSetup = () => {
    localStorage.setItem(dismissKey, "true");
    setDismissed(true);
    navigate("/forgot-password");
  };

  return (
    <div className="mx-auto mb-4 flex items-center justify-between gap-3 rounded-xl bg-[hsl(72,60%,63%)] px-4 py-3 text-sm text-[hsl(72,40%,15%)]">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 shrink-0" />
        <span className="font-medium">안전한 사용을 위해 비밀번호를 설정해주세요 🔐</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSetup}
          className="rounded-lg bg-[hsl(72,40%,15%)] px-3 py-1.5 text-xs font-semibold text-[hsl(72,60%,90%)] transition-colors hover:bg-[hsl(72,40%,20%)]"
        >
          설정하기
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 transition-colors hover:bg-[hsl(72,60%,55%)]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PasswordSetupBanner;
