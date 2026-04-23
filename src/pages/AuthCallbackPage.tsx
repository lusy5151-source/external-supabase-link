import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("로그인 처리 중...");

  useEffect(() => {
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hasCode = Boolean(searchParams.get("code"));
        const hasAccessToken = Boolean(hashParams.get("access_token"));

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isActive) return;

          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);
            navigate("/", { replace: true });
          } else if (event === "SIGNED_OUT") {
            subscription.unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);
            navigate("/auth", { replace: true });
          }
        });

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setStatus("로그인 실패. 다시 시도해주세요.");
          timeoutId = setTimeout(() => navigate("/auth", { replace: true }), 2000);
          return () => subscription.unsubscribe();
        }

        if (data.session) {
          subscription.unsubscribe();
          navigate("/", { replace: true });
          return;
        }

        if (!hasCode && !hasAccessToken) {
          subscription.unsubscribe();
          navigate("/auth", { replace: true });
          return;
        }

        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          if (!isActive) return;
          setStatus("로그인 시간이 초과되었습니다.");
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
        }, 10000);

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error("Callback error:", err);
        if (isActive) {
          navigate("/auth", { replace: true });
        }
      }
    };

    let cleanup: void | (() => void);

    handleCallback().then((result) => {
      cleanup = result;
    });

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      cleanup?.();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
      <p className="text-lg font-medium text-foreground">🔐 {status}</p>
    </div>
  );
}