import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuest } from "@/contexts/GuestContext";
import { z } from "zod";
import { Mountain, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z
  .string()
  .trim()
  .min(1, "이메일을 입력해주세요.")
  .email("올바른 이메일 주소를 입력해주세요.")
  .max(255, "이메일은 255자 이하로 입력해주세요.");

const passwordSchema = z
  .string()
  .min(1, "비밀번호를 입력해주세요.")
  .max(72, "비밀번호는 72자 이하로 입력해주세요.");

const buildDisplayName = (email: string) => email.split("@")[0]?.slice(0, 50) || "user";
const getSupabaseErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "string" && error.trim()) return error;

  if (typeof error === "object" && error) {
    if ("message" in error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const validate = () => {
    const errors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    const passwordResult = passwordSchema.safeParse(password);

    if (!emailResult.success) errors.email = emailResult.error.issues[0]?.message ?? "이메일을 확인해주세요.";
    if (!passwordResult.success) errors.password = passwordResult.error.issues[0]?.message ?? "비밀번호를 확인해주세요.";
    if (!isLogin) {
      if (!confirmPassword) errors.confirmPassword = "비밀번호 확인을 입력해주세요.";
      else if (password !== confirmPassword) errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!validate()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;
        navigate("/");
      } else {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        console.log("Supabase signup response:", { data, error });

        if (error) throw error;

        if (data.user?.id) {
          const hasActiveSession = data.session?.user?.id === data.user.id;

          if (hasActiveSession) {
            const { error: profileError } = await supabase.from("profiles").upsert(
              {
                id: data.user.id,
                user_id: data.user.id,
                email: data.user.email ?? normalizedEmail,
                nickname: buildDisplayName(data.user.email ?? normalizedEmail),
                provider: "email",
              },
              { onConflict: "user_id" }
            );

            if (profileError) {
              console.error("Profile insert error after signup:", profileError);
              setAuthSuccess("계정은 생성되었습니다. 로그인 후 다시 시도해주세요.");
              setIsLogin(true);
              setPassword("");
              setConfirmPassword("");
              return;
            }
          }

          if (data.session) {
            navigate("/");
          } else {
            setAuthSuccess("회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.");
            setIsLogin(true);
            setPassword("");
            setConfirmPassword("");
          }
        } else {
          setAuthError("회원가입 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
    } catch (err: any) {
      const message = getSupabaseErrorMessage(
        err,
        isLogin ? "로그인 처리 중 오류가 발생했습니다." : "회원가입 처리 중 오류가 발생했습니다."
      );
      if (!isLogin) {
        console.error("Supabase signup error:", err);
      } else {
        console.error("Supabase login error:", err);
      }
      setAuthError(message);
      toast({
        title: "인증 오류",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    setLoading(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? "https://wandeung.com/auth/callback?native=1"
        : "https://wandeung.com/auth/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
        },
      });

      if (error) throw error;

      if (isNative && data?.url) {
        const { Browser } = await import("@capacitor/browser");

        await Browser.addListener("browserFinished", async () => {
          await Browser.removeAllListeners();
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            navigate("/");
          } else {
            setLoading(false);
          }
        });

        await Browser.open({ url: data.url });
      }
    } catch (err: any) {
      const message = getSupabaseErrorMessage(err, "로그인 처리 중 오류가 발생했습니다.");
      console.error("Supabase Google login error:", err);
      setAuthError(message);
      toast({ title: "인증 오류", description: message, variant: "destructive" });
      setLoading(false);
    }
  };



  const handleKakaoLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    try {
      const { Capacitor } = await import("@capacitor/core");
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        const redirectUri = "https://wandeung.com/kakao/callback?native=1";
        const { data, error } = await supabase.functions.invoke("kakao-auth", {
          body: { redirect_uri: redirectUri, is_native: true, request_type: "authorize_url" },
        });
        if (error) throw error;
        if (data?.url) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url, windowName: "_self" });
        } else {
          throw new Error("카카오 인증 URL을 가져오지 못했습니다.");
        }
      } else {
        const redirectUri = `${window.location.origin}/kakao/callback`;
        const kakaoAuthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-auth?redirect_uri=${encodeURIComponent(redirectUri)}`;
        window.location.assign(kakaoAuthUrl);
      }
    } catch (err: any) {
      const message = getSupabaseErrorMessage(err, "카카오 로그인 처리 중 오류가 발생했습니다.");
      console.error("Kakao login error:", err);
      setAuthError(message);
      toast({ title: "인증 오류", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center pb-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Mountain className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">완등</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isLogin ? "로그인하여 등산 여정을 시작하세요" : "이메일로 새 계정을 만드세요"}</p>
        </div>

        <div className="space-y-2">
          <button onClick={handleGoogleLogin} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google로 계속하기
          </button>
          <button onClick={handleKakaoLogin} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(50,100%,50%)] px-4 py-3 text-sm font-medium text-[hsl(0,0%,10%)] transition-colors hover:bg-[hsl(50,100%,45%)] disabled:opacity-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.36 2 10.5c0 2.67 1.8 5.01 4.5 6.36-.15.54-.97 3.48-1 3.6 0 .07.03.14.09.18.04.02.08.03.12.03.06 0 .12-.03.17-.07.75-.54 3-2.16 4.38-3.17.56.07 1.14.11 1.74.11 5.52 0 10-3.36 10-7.5S17.52 3 12 3z"/></svg>
            카카오로 계속하기
          </button>
        </div>

        <div className="flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">또는</span><div className="h-px flex-1 bg-border" /></div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isLogin && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          )}

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                  setAuthError("");
                  setAuthSuccess("");
                }}
                placeholder="이메일"
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                  setAuthError("");
                  setAuthSuccess("");
                }}
                placeholder="비밀번호"
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

          {!isLogin && (
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  placeholder="비밀번호 확인"
                  className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
            </div>
          )}

          {authSuccess && <p className="text-sm text-primary">{authSuccess}</p>}
          {authError && <p className="text-sm text-destructive">{authError}</p>}

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {loading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button onClick={() => { setIsLogin(!isLogin); setFieldErrors({}); setAuthError(""); setAuthSuccess(""); setPassword(""); setConfirmPassword(""); }} className="font-medium text-primary hover:underline">
            {isLogin ? "회원가입" : "로그인"}
          </button>
        </p>

        <GuestEntryButton />
      </div>
    </div>
  );
};

function GuestEntryButton() {
  const navigate = useNavigate();
  const { enterGuestMode } = useGuest();

  return (
    <button
      data-onboarding="guest-browse"
      onClick={() => {
        enterGuestMode();
        navigate("/");
      }}
      className="w-full text-center"
      style={{ fontSize: 13, color: "hsl(var(--color-text-tertiary))" }}
    >
      로그인 없이 둘러보기 →
    </button>
  );
}

export default AuthPage;
