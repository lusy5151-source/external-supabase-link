// Backward-compatible wrapper — delegates to TutorialContext
import { createContext, useContext, type ReactNode } from "react";
import { useTutorial } from "./TutorialContext";

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

export const useOnboarding = () => {
  const tutorial = useTutorial();
  return {
    isOnboarding: tutorial.isTutorialActive,
    startOnboarding: tutorial.restartTutorial,
    finishOnboarding: tutorial.completeTutorial,
  };
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  // No-op wrapper — TutorialProvider handles state now
  return <>{children}</>;
};
