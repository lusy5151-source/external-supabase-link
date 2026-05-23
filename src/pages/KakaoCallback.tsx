import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mountain, Loader2 } from "lucide-react";

const KakaoCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleKakaoLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      const isNativeFlow = params.get("native") === "1";

      const redirectToNative = (extra: Record<string, string> = {}) => {
        const qs = new URLSearchParams(extra).toString();
        window.location.href = `com.wandeung.app://oauth${qs ? `?${qs}` : ""}`;
      };

      // Native flow: hand the auth code back to the app via deep link.
      // The app exchanges the code with kakao-auth in its own context so the
      // session is persisted in the app (not in the in-app browser).
      if (isNativeFlow) {
        if (errorParam) {
          redirectToNative({ error: errorParam });
          return;
        }
        if (!code) {
          redirectToNative({ error: "missing_code" });
          return;
        }
        redirectToNative({ code });
        return;
      }

      if (errorParam) {
        setError("카카오 로그인이 취소되었습니다.");
        setTimeout(() => navigate("/auth", { replace: true }), 1500);
        return;
      }

      if (!code) {
        setError("인증 코드가 없습니다.");
        setTimeout(() => navigate("/auth", { replace: true }), 1500);
        return;
      }

      try {
        const callbackUri = isNativeFlow
          ? "https://wandeung.com/kakao/callback?native=1"
          : `${window.location.origin}/kakao/callback`;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-auth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              code,
              redirect_uri: callbackUri,
              is_native: isNativeFlow,
            }),
          }
        );

        const payload = await response.json().catch(() => null);
        const session = payload?.session;
        const responseError = payload?.error;
        const details = payload?.details;

        if (
          !payload ||
          !response.ok ||
          responseError ||
          !session?.access_token ||
          !session?.refresh_token
        ) {
          console.error("Kakao auth error:", responseError, details);
          setError(responseError || "카카오 로그인 처리 중 오류가 발생했습니다.");
          setTimeout(() => (isNativeFlow ? redirectToNative() : navigate("/auth", { replace: true })), 1500);
          return;
        }

        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (isNativeFlow) {
          redirectToNative();
        } else {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Kakao callback error:", err);
        setError("카카오 로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => (isNativeFlow ? redirectToNative() : navigate("/auth", { replace: true })), 1500);
      }
    };

    handleKakaoLogin();
  }, [navigate]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(50,100%,50%)]/20">
        <Mountain className="h-7 w-7 text-[hsl(50,100%,35%)]" />
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">카카오 로그인 처리중...</p>
        </>
      )}
    </div>
  );
};

export default KakaoCallback;
