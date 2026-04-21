import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { Mountain, Mail, Lock, Eye, EyeOff, ArrowRight, User, RefreshCw } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const friendlyError = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/email not confirmed/i.test(msg)) return "이메일 인증 후 로그인할 수 있습니다.\n인증 메일을 확인해주세요.";
  if (/user already registered|already.*registered|database error saving new user/i.test(msg)) return "이미 가입된 이메일입니다. 로그인을 시도해주세요.";
  if (/password.*characters/i.test(msg)) return "비밀번호는 최소 8자 이상이어야 합니다.";
  if (/rate limit/i.test(msg)) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  if (/network/i.test(msg)) return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
  return msg || "오류가 발생했습니다.";
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!isLogin && !name.trim()) errors.name = "이름을 입력해주세요.";
    if (!email.trim()) errors.email = "이메일을 입력해주세요.";
    if (!password) errors.password = "비밀번호를 입력해주세요.";
    else if (password.length < 8) errors.password = "비밀번호는 최소 8자 이상이어야 합니다.";
    if (!isLogin && (!agreePrivacy || !agreeTerms)) errors.consent = "필수 약관에 동의해주세요.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canSignup = isLogin || (agreePrivacy && agreeTerms);

  const handleResendEmail = useCallback(async () => {
    if (resendCooldown > 0 || !signupEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: signupEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setResendCooldown(60);
      toast({ title: "인증 메일을 재발송했습니다." });
    } catch (err: any) {
      toast({ title: "오류", description: friendlyError(err.message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [resendCooldown, signupEmail, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate("/");
        } else {
          setSignupEmail(email.trim());
          setSignupSuccess(true);
          setResendCooldown(60);
        }
      }
    } catch (err: any) {
      toast({ title: "오류", description: friendlyError(err.message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://external-spark.lovable.app",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "오류", description: friendlyError(err.message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const KAKAO_REST_API_KEY = "c8b31eed7d32a5ad3a13a56f3b8e3995";
    const redirectUri = `${window.location.origin}/kakao/callback`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  if (signupSuccess) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center pb-24">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">인증 메일을 발송했습니다 📧</h1>
            <p className="text-sm text-muted-foreground">이메일을 확인하고 인증 버튼을 눌러주세요.</p>
            <p className="text-xs text-muted-foreground/70">{signupEmail}</p>
          </div>
          <button onClick={handleResendEmail} disabled={loading || resendCooldown > 0} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />
            {resendCooldown > 0 ? `인증 메일 재발송 (${resendCooldown}초)` : "인증 메일 재발송"}
          </button>
          <button onClick={() => { setSignupSuccess(false); setIsLogin(true); setFieldErrors({}); }} className="text-sm font-medium text-primary hover:underline">로그인으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center pb-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Mountain className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">완등</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isLogin ? "로그인하여 등산 여정을 시작하세요" : "새 계정을 만들어보세요"}</p>
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
          {!isLogin && (
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: "" })); }} placeholder="이름을 입력하세요" className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
            </div>
          )}
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: "" })); }} placeholder="이메일" className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: "" })); }} placeholder="비밀번호" className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

          {!isLogin && (
            <div className="space-y-2.5 py-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => { setAgreePrivacy(e.target.checked); setFieldErrors(prev => ({ ...prev, consent: "" })); }} className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0" />
                <span className="text-[13px] text-foreground leading-snug"><span className="text-destructive font-medium">(필수)</span> 개인정보처리방침에 동의합니다 <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">전문 보기</a></span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => { setAgreeTerms(e.target.checked); setFieldErrors(prev => ({ ...prev, consent: "" })); }} className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0" />
                <span className="text-[13px] text-foreground leading-snug"><span className="text-destructive font-medium">(필수)</span> 이용약관에 동의합니다 <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">전문 보기</a></span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0" />
                <span className="text-[13px] text-muted-foreground leading-snug">(선택) 마케팅 정보 수신에 동의합니다</span>
              </label>
              {fieldErrors.consent && <p className="text-xs text-destructive">{fieldErrors.consent}</p>}
            </div>
          )}

          <button type="submit" disabled={loading || (!isLogin && !canSignup)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${!isLogin && canSignup ? "bg-primary text-primary-foreground hover:bg-primary/90" : !isLogin ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {loading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button onClick={() => { setIsLogin(!isLogin); setFieldErrors({}); setAgreePrivacy(false); setAgreeTerms(false); setAgreeMarketing(false); }} className="font-medium text-primary hover:underline">
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