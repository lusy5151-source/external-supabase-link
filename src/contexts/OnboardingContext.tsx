import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface OnboardingContextType {
  isOnboarding: boolean;
  startOnboarding: () => void;
  finishOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  isOnboarding: false,
  startOnboarding: () => {},
  finishOnboarding: () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

const ONBOARDING_KEY = "onboarding_completed";

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [isOnboarding, setIsOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  const startOnboarding = useCallback(() => setIsOnboarding(true), []);

  const finishOnboarding = useCallback(() => {
    setIsOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  return (
    <OnboardingContext.Provider value={{ isOnboarding, startOnboarding, finishOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};
