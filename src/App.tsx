import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/context/StoreContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GuestProvider, useGuest } from "@/contexts/GuestContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { MountainsProvider } from "@/contexts/MountainsContext";
import { UnreadChatProvider } from "@/contexts/UnreadChatContext";
import { CompletionSuggestionProvider } from "@/context/CompletionSuggestionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import SplashScreen from "@/components/SplashScreen";
import LoadingSpinner from "@/components/LoadingSpinner";
import NotFound from "./pages/NotFound";
import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageSkeleton from "@/components/PageSkeleton";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { useProfileSync } from "@/hooks/useProfileSync";
// usePushNotifications 제거: 토큰 저장 경로는 initPushNotifications 하나로 통일
import { useSchedulePlanAlerts } from "@/hooks/useSchedulePlanAlerts";
import { useDailyMountainNotification } from "@/hooks/useDailyMountainNotification";
import { useFriendRequestNotifications } from "@/hooks/useFriendRequestNotifications";
import { useJournalEngagementNotifications } from "@/hooks/useJournalEngagementNotifications";
import { supabase } from "@/integrations/supabase/client";
import {
  readProfileGateCache,
  writeProfileGateCache,
  type ProfileGateData,
} from "@/lib/profileGateCache";
import { runAfterStartup } from "@/lib/idle";

// Eagerly loaded (auth only)
import AuthPage from "@/pages/AuthPage";

// Lazy loaded pages
const MagazinePopup = lazy(() => import("@/components/MagazinePopup"));
const MigrationNoticeModal = lazy(() => import("@/components/MigrationNoticeModal"));
const Level3BadgeCelebration = lazy(() => import("@/components/Level3BadgeCelebration"));
const OnboardingFlow = lazy(() => import("@/components/OnboardingFlow"));
const CharacterSelectionPage = lazy(() => import("@/pages/CharacterSelectionPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MountainList = lazy(() => import("@/pages/MountainList"));
const MountainDetail = lazy(() => import("@/pages/MountainDetail"));
const TrailDetailPage = lazy(() => import("@/pages/TrailDetailPage"));
const WalkingPathDetail = lazy(() => import("@/pages/WalkingPathDetail"));
const MapView = lazy(() => import("@/pages/MapView"));
const Records = lazy(() => import("@/pages/Records"));
const RecordsHub = lazy(() => import("@/pages/RecordsHub"));
const GearPage = lazy(() => import("@/pages/GearPage"));
const SocialPage = lazy(() => import("@/pages/SocialPage"));
const AchievementsPage = lazy(() => import("@/pages/AchievementsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const MyPage = lazy(() => import("@/pages/MyPage"));
const CharacterSetupPage = lazy(() => import("@/pages/CharacterSetupPage"));
const PlansPage = lazy(() => import("@/pages/PlansPage"));
const CreatePlanPage = lazy(() => import("@/pages/CreatePlanPage"));
const PlanDetailPage = lazy(() => import("@/pages/PlanDetailPage"));
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const JournalDetailPage = lazy(() => import("@/pages/JournalDetailPage"));
const FriendProfilePage = lazy(() => import("@/pages/FriendProfilePage"));
const ChallengePage = lazy(() => import("@/pages/ChallengePage"));
const ChallengeMountainsPage = lazy(() => import("@/pages/ChallengeMountainsPage"));
const SharedCompletionPage = lazy(() => import("@/pages/SharedCompletionPage"));
const GroupDetailPage = lazy(() => import("@/pages/GroupDetailPage"));
const KakaoCallback = lazy(() => import("@/pages/KakaoCallback"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/AdminAnnouncementsPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const MagazinePage = lazy(() => import("@/pages/MagazinePage"));
const AdminMagazinePage = lazy(() => import("@/pages/AdminMagazinePage"));
const AdminMagazineEditorPage = lazy(() => import("@/pages/AdminMagazineEditorPage"));
const AdminReportsPage = lazy(() => import("@/pages/AdminReportsPage"));
const AdminMountainApprovalPage = lazy(() => import("@/pages/AdminMountainApprovalPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
const AdminGpxSyncPage = lazy(() => import("@/pages/AdminGpxSyncPage"));
const AdminMountainPhotosPage = lazy(() => import("@/pages/AdminMountainPhotosPage"));
const SummitClaimPage = lazy(() => import("@/pages/SummitClaimPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const DeleteAccountPage = lazy(() => import("@/pages/DeleteAccountPage"));
const TermsOfServicePage = lazy(() => import("@/pages/TermsOfServicePage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const CommunityPostDetailPage = lazy(() => import("@/pages/CommunityPostDetailPage"));
const CommunityPostCreatePage = lazy(() => import("@/pages/CommunityPostCreatePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isGuest, showLoginPrompt } = useGuest();
  if (loading) return <LoadingSpinner message="인증 확인 중..." />;
  if (!user && isGuest) {
    showLoginPrompt();
    return <Navigate to="/" replace />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const LazyPage = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <Suspense fallback={fallback || <PageSkeleton />}>
    {children}
  </Suspense>
);

const ONBOARDING_BYPASS_PATHS = [
  "/auth",
  "/auth/callback",
  "/kakao/callback",
  "/privacy",
  "/privacy-policy",
  "/terms-of-service",
  "/forgot-password",
  "/reset-password",
];

const profileGateCache = new Map<string, ProfileGateData | "missing">();

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsCharacter, setNeedsCharacter] = useState(false);
  const [recommendedCharacterId, setRecommendedCharacterId] = useState<string | null>(null);

  const applyProfile = useCallback((data: ProfileGateData | "missing") => {
    if (data === "missing") {
      setNeedsOnboarding(true);
      setNeedsCharacter(false);
      return;
    }
    const onboardingNeeded = data.is_onboarded === false || data.is_onboarded == null;
    setNeedsOnboarding(onboardingNeeded);
    const needsCharacterSelection =
      data.character_id == null || data.character_selected_at == null;
    setNeedsCharacter(!onboardingNeeded && needsCharacterSelection);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cancelDeferredProfileRefresh: (() => void) | undefined;
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setNeedsOnboarding(false);
        setNeedsCharacter(false);
        setChecking(false);
        return;
      }

      const refreshProfileGate = async () => {
        try {
          const { data, error } = await (supabase as any)
            .from("profiles")
            .select("is_onboarded, character_id, character_selected_at")
            .eq("user_id", user.id)
            .maybeSingle();
          if (cancelled) return;
          if (error) {
            console.error("[OnboardingGate] profile fetch error");
            setNeedsOnboarding(false);
            setNeedsCharacter(false);
            return;
          }
          if (!data) {
            await (supabase as any)
              .from("profiles")
              .upsert({ user_id: user.id, id: user.id } as any, { onConflict: "user_id" });
            if (cancelled) return;
            profileGateCache.set(user.id, "missing");
            writeProfileGateCache(user.id, "missing");
            applyProfile("missing");
          } else {
            profileGateCache.set(user.id, data as ProfileGateData);
            writeProfileGateCache(user.id, data as ProfileGateData);
            applyProfile(data as ProfileGateData);
          }
        } catch (e) {
          if (!cancelled) {
            setNeedsOnboarding(false);
            setNeedsCharacter(false);
          }
        } finally {
          if (!cancelled) setChecking(false);
        }
      };

      const cached = profileGateCache.get(user.id);
      if (cached) {
        applyProfile(cached);
        setChecking(false);
        cancelDeferredProfileRefresh = runAfterStartup(() => {
          void refreshProfileGate();
        }, 1600);
        return;
      } else {
        const persisted = readProfileGateCache(user.id);
        if (persisted) {
          profileGateCache.set(user.id, persisted);
          applyProfile(persisted);
          setChecking(false);
          cancelDeferredProfileRefresh = runAfterStartup(() => {
            void refreshProfileGate();
          }, 1600);
          return;
        } else {
          setChecking(true);
        }
      }

      await refreshProfileGate();
    };
    check();
    return () => {
      cancelled = true;
      cancelDeferredProfileRefresh?.();
    };
  }, [user, authLoading, applyProfile]);

  const handleComplete = useCallback(async (nickname: string, characterId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          nickname,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) {
        console.error("[OnboardingGate] profile update error", error);
        return;
      }
      const prev = profileGateCache.get(user.id);
      const base: ProfileGateData =
        prev && prev !== "missing"
          ? prev
          : { is_onboarded: true, character_id: null, character_selected_at: null };
      profileGateCache.set(user.id, { ...base, is_onboarded: true });
      writeProfileGateCache(user.id, { ...base, is_onboarded: true });
      setRecommendedCharacterId(characterId || null);
      setNeedsOnboarding(false);
      setNeedsCharacter(true);
    } catch (e) {
      console.error("[OnboardingGate] complete error", e);
    }
  }, [user]);

  const handleCharacterCompleted = useCallback(() => {
    if (user) {
      const prev = profileGateCache.get(user.id);
      const base: ProfileGateData =
        prev && prev !== "missing"
          ? prev
          : { is_onboarded: true, character_id: null, character_selected_at: null };
      profileGateCache.set(user.id, {
        ...base,
        character_id: base.character_id ?? "selected",
        character_selected_at: new Date().toISOString(),
      });
      writeProfileGateCache(user.id, {
        ...base,
        character_id: base.character_id ?? "selected",
        character_selected_at: new Date().toISOString(),
      });
    }
    setNeedsCharacter(false);
    setRecommendedCharacterId(null);
  }, [user]);

  const bypass = ONBOARDING_BYPASS_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  if (user && !authLoading && !bypass) {
    if (checking) return <GateLoadingSkeleton />;
    if (needsOnboarding) return (
      <LazyPage fallback={<GateLoadingSkeleton />}>
        <OnboardingFlow onComplete={handleComplete} />
      </LazyPage>
    );
    if (needsCharacter) return (
      <LazyPage fallback={<GateLoadingSkeleton />}>
        <CharacterSelectionPage
          recommendedId={recommendedCharacterId}
          onCompleted={handleCharacterCompleted}
        />
      </LazyPage>
    );
  }

  return <>{children}</>;
}

function GateLoadingSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-primary, #FFFFFF)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <style>{`
        @keyframes gate-dot { 0%, 80%, 100% { opacity: 0.2 } 40% { opacity: 1 } }
      `}</style>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="완등">
        <path d="M4 40 L18 18 L26 28 L34 14 L44 40 Z" fill="#639922" />
      </svg>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#639922",
              animation: `gate-dot 1.2s ${i * 0.2}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const AppRoutes = () => {
  const { user, loading } = useAuth();
  useProfileSync();
  
  useSchedulePlanAlerts(user?.id);
  useDailyMountainNotification();
  useFriendRequestNotifications();
  useJournalEngagementNotifications();

  useEffect(() => {
    if (!user) return;
    return runAfterStartup(() => {
      import("@/lib/pushNotifications").then(({ initPushNotifications }) => {
        initPushNotifications();
      });
    }, 2500, 6000);
  }, [user]);

  return (
    <Routes>
      <Route path="/auth" element={user && !loading ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/auth/callback" element={<LazyPage><AuthCallbackPage /></LazyPage>} />
      <Route path="/kakao/callback" element={<LazyPage><KakaoCallback /></LazyPage>} />
      <Route path="/" element={<LazyPage fallback={<DashboardSkeleton />}><Dashboard /></LazyPage>} />
      <Route path="/mountains" element={<LazyPage><MountainList /></LazyPage>} />
      <Route path="/mountains/:id" element={<LazyPage><MountainDetail /></LazyPage>} />
      <Route path="/trails/:trailId" element={<LazyPage><TrailDetailPage /></LazyPage>} />
      <Route path="/mountains/:mountainId/courses/:courseId" element={<LazyPage><TrailDetailPage /></LazyPage>} />
      <Route path="/walking-paths/:id" element={<LazyPage><WalkingPathDetail /></LazyPage>} />
      <Route path="/map" element={<LazyPage><MapView /></LazyPage>} />
      <Route path="/records" element={<LazyPage><RecordsHub /></LazyPage>} />
      <Route path="/gear" element={<LazyPage><GearPage /></LazyPage>} />
      <Route path="/social" element={<LazyPage><SocialPage /></LazyPage>} />
      <Route path="/plans" element={<LazyPage><PlansPage /></LazyPage>} />
      <Route path="/plans/create" element={<ProtectedRoute><LazyPage><CreatePlanPage /></LazyPage></ProtectedRoute>} />
      <Route path="/plans/:id" element={<ProtectedRoute><LazyPage><PlanDetailPage /></LazyPage></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><LazyPage><ChallengePage /></LazyPage></ProtectedRoute>} />
      <Route path="/challenge" element={<LazyPage><ChallengeMountainsPage /></LazyPage>} />
      <Route path="/achievements" element={<LazyPage><AchievementsPage /></LazyPage>} />
      <Route path="/feed" element={<LazyPage><FeedPage /></LazyPage>} />
      <Route path="/journals/:id" element={<LazyPage><JournalDetailPage /></LazyPage>} />
      <Route path="/community/new" element={<ProtectedRoute><LazyPage><CommunityPostCreatePage /></LazyPage></ProtectedRoute>} />
      <Route path="/community/:id" element={<LazyPage><CommunityPostDetailPage /></LazyPage>} />
      <Route path="/shared-completions" element={<ProtectedRoute><LazyPage><SharedCompletionPage /></LazyPage></ProtectedRoute>} />
      <Route path="/groups" element={<Navigate to="/social" replace />} />
      <Route path="/groups/:id" element={<ProtectedRoute><LazyPage><GroupDetailPage /></LazyPage></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><LazyPage><FriendProfilePage /></LazyPage></ProtectedRoute>} />
      <Route path="/my" element={<ProtectedRoute><LazyPage><MyPage /></LazyPage></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><LazyPage><NotificationsPage /></LazyPage></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><LazyPage><ProfilePage /></LazyPage></ProtectedRoute>} />
      <Route path="/character-setup" element={<ProtectedRoute><LazyPage><CharacterSetupPage /></LazyPage></ProtectedRoute>} />
      <Route path="/character-select" element={<ProtectedRoute><LazyPage><CharacterSelectionPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><LazyPage><AdminPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><LazyPage><AdminUsersPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute><LazyPage><AdminAnnouncementsPage /></LazyPage></ProtectedRoute>} />
      <Route path="/leaderboard" element={<LazyPage><LeaderboardPage /></LazyPage>} />
      <Route path="/magazine" element={<LazyPage><MagazinePage /></LazyPage>} />
      <Route path="/summit-claim" element={<ProtectedRoute><LazyPage><SummitClaimPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/magazine" element={<ProtectedRoute><LazyPage><AdminMagazinePage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/magazine/new" element={<ProtectedRoute><LazyPage><AdminMagazineEditorPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/magazine/:id/edit" element={<ProtectedRoute><LazyPage><AdminMagazineEditorPage /></LazyPage></ProtectedRoute>} />

      <Route path="/admin/reports" element={<ProtectedRoute><LazyPage><AdminReportsPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/mountains" element={<ProtectedRoute><LazyPage><AdminMountainApprovalPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/gpx-sync" element={<ProtectedRoute><LazyPage><AdminGpxSyncPage /></LazyPage></ProtectedRoute>} />
      <Route path="/admin/photos" element={<ProtectedRoute><LazyPage><AdminMountainPhotosPage /></LazyPage></ProtectedRoute>} />
      <Route path="/privacy" element={<LazyPage><PrivacyPolicyPage /></LazyPage>} />
      <Route path="/privacy-policy" element={<LazyPage><PrivacyPolicyPage /></LazyPage>} />
      <Route path="/terms-of-service" element={<LazyPage><TermsOfServicePage /></LazyPage>} />
      <Route path="/delete-account" element={<LazyPage><DeleteAccountPage /></LazyPage>} />
      <Route path="/forgot-password" element={<LazyPage><ForgotPasswordPage /></LazyPage>} />
      <Route path="/reset-password" element={<LazyPage><ResetPasswordPage /></LazyPage>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function LocalNotificationNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        const listener = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (event) => {
            const route = event.notification.extra?.route;
            if (typeof route === "string" && route.startsWith("/")) {
              navigate(route);
            }
          }
        );

        cleanup = () => listener.remove();
      } catch (error) {
        console.warn("[local-notification] navigation listener failed", error);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [navigate]);

  return null;
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary
      fallbackMessage="데이터를 불러오는 중 오류가 발생했습니다."
      resetKey={location.pathname}
    >
      {children}
    </ErrorBoundary>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // Capacitor deep link handler for OAuth callbacks
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapApp } = await import("@capacitor/app");

        const closeBrowser = async () => {
          try {
            const { Browser } = await import("@capacitor/browser");
            await Browser.close();
          } catch (e) {
            console.warn("[deeplink] Browser.close failed", e);
          }
        };

        const listener = await CapApp.addListener("appUrlOpen", async ({ url }) => {
          // Kakao native flow: KakaoCallback page redirects to
          // com.wandeung.app://oauth?code=... — exchange code in the app context.
          if (url.startsWith("com.wandeung.app://oauth")) {
            await closeBrowser();
            try {
              const parsed = new URL(url);
              const code = parsed.searchParams.get("code");
              const errorParam = parsed.searchParams.get("error");

              // Google (and other Supabase OAuth) flow: no `code` param —
              // session was already established in the in-app browser context,
              // but the app needs to refresh from its own storage.
              if (!code) {
                if (errorParam) {
                  console.error("[deeplink] oauth error", errorParam);
                  return;
                }
                // Google OAuth: 토큰을 URL에서 받아서 세션 설정
                const key = parsed.searchParams.get("key");
                const accessToken = parsed.searchParams.get("access_token");
                const refreshToken = parsed.searchParams.get("refresh_token");
                if (key) {
                  const { data: sessionData } = await supabase
                    .from("temp_auth_sessions")
                    .select("access_token, refresh_token")
                    .eq("key", key)
                    .maybeSingle();
                  if (sessionData) {
                    await supabase.auth.setSession({
                      access_token: sessionData.access_token,
                      refresh_token: sessionData.refresh_token,
                    });
                    await supabase.from("temp_auth_sessions").delete().eq("key", key);
                  }
                } else if (accessToken && refreshToken) {
                  await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                } else {
                  await supabase.auth.refreshSession();
                }
                window.location.replace("/");
                return;
              }

              // Kakao native flow: exchange code in the app context.
              const { data, error } = await supabase.functions.invoke("kakao-auth", {
                body: {
                  code,
                  redirect_uri: "https://wandeung.com/kakao/callback?native=1",
                  is_native: true,
                },
              });
              if (error || !data?.session?.access_token || !data?.session?.refresh_token) {
                console.error("[deeplink] kakao-auth invoke failed", error, data);
                return;
              }
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
              window.location.replace("/");
            } catch (e) {
              console.error("[deeplink] oauth exchange error", e);
            }
            return;
          }

          // Other OAuth providers (Google etc.) — Supabase handles via URL parsing.
          if (
            url.includes("googleusercontent") ||
            url.includes("oauth") ||
            url.includes("auth/callback")
          ) {
            await closeBrowser();
          }
        });
        cleanup = () => listener.remove();
      } catch (e) {
        console.warn("[deeplink] setup failed", e);
      }
    })();
    return () => { if (cleanup) cleanup(); };
  }, []);


  return (
    <ErrorBoundary fallbackMessage="화면을 불러오지 못했어요. 새로고침해주세요.">

      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <TutorialProvider>
            <OnboardingProvider>
            <MountainsProvider>
            <StoreProvider>
              <Toaster />
              <Sonner />
              {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
              {!showSplash && (
                <Suspense fallback={null}>
                  <MagazinePopup />
                </Suspense>
              )}
              <BrowserRouter>
                <GuestProvider>
                <UnreadChatProvider>
                <CompletionSuggestionProvider>
                <LocalNotificationNavigationBridge />
                {!showSplash && (
                  <Suspense fallback={null}>
                    <MigrationNoticeModal />
                    <Level3BadgeCelebration />
                  </Suspense>
                )}
                <Layout>
                  <RouteErrorBoundary>
                    <OnboardingGate>
                      <AppRoutes />
                    </OnboardingGate>
                  </RouteErrorBoundary>
                </Layout>
                </CompletionSuggestionProvider>
                </UnreadChatProvider>
                </GuestProvider>
              </BrowserRouter>
            </StoreProvider>
            </MountainsProvider>
            </OnboardingProvider>
            </TutorialProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
