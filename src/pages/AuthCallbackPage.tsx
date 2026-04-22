import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && isActive) {
        navigate("/", { replace: true });
      }
    });

    const restoreSessionFromHash = async () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;

      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error && isActive) {
          navigate("/auth", { replace: true });
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id && isActive) {
        navigate("/", { replace: true });
        return;
      }

      if (isActive) {
        navigate("/auth", { replace: true });
      }
    };

    restoreSessionFromHash();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return <LoadingSpinner message="로그인 처리 중..." />;
};

export default AuthCallbackPage;