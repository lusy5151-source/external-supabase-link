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

      if (errorParam) {
        setError("카카오 로그인이 취소되었습니다.");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      if (!code) {
        setError("인증 코드가 없습니다.");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/kakao/callback`;

        const { data, error: fnError } = await supabase.functions.invoke("kakao-auth", {
          body: { code, redirect_uri: redirectUri },
        });

        if (fnError) {
          console.error("Edge function error:", fnError);
          setError("카카오 로그인 처리 중 오류가 발생했습니다.");
          setTimeout(() => navigate("/auth"), 2000);
          return;
        }

        if (data?.error) {
          console.error("Kakao auth error:", data.error, data.details);
          setError(data.error);
          setTimeout(() => navigate("/auth"), 2000);
          return;
        }

        if (data?.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          navigate("/");
        } else {
          setError("세션 생성에 실패했습니다.");
          setTimeout(() => navigate("/auth"), 2000);
        }
      } catch (err) {
        console.error("Kakao callback error:", err);
        setError("카카오 로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => navigate("/auth"), 2000);
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
