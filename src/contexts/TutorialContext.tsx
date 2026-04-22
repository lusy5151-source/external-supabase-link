import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "wandeung_tutorial_v2";

export interface TutorialStep {
  route: string;
  targetSelector: string;
  title: string;
  description: string;
  buttonLabel: string;
  spotlightShape: "rect" | "circle" | "none";
  /** If true, step waits for user interaction instead of showing button */
  interactive?: boolean;
  /** Selector user must tap to complete interactive step */
  interactiveSelector?: string;
  /** Task hint text shown instead of button */
  taskHint?: string;
  /** Custom content type for rendering extras in tooltip */
  customContent?: "welcome-chips" | "filter-interactive" | "fab-methods" | "share-card";
  /** Whether to show extra glow ring animation on spotlight */
  glowRing?: boolean;
}

interface TutorialContextType {
  currentStep: number;
  isTutorialActive: boolean;
  tutorialCompleted: boolean;
  totalSteps: number;
  steps: TutorialStep[];
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  restartTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  currentStep: 0,
  isTutorialActive: false,
  tutorialCompleted: true,
  totalSteps: 0,
  steps: [],
  nextStep: () => {},
  skipTutorial: () => {},
  completeTutorial: () => {},
  restartTutorial: () => {},
});

export const useTutorial = () => useContext(TutorialContext);

export const tutorialSteps: TutorialStep[] = [
  // Step 1 — Welcome / Guest mode
  {
    route: "/",
    targetSelector: "",
    title: "완등에 오신 걸 환영해요! 🏔",
    description:
      "로그인 없이도 산 탐색과 홈을 자유롭게 둘러볼 수 있어요.\n정상 인증과 기록 기능은 로그인 후 이용 가능해요.",
    buttonLabel: "다음 →",
    spotlightShape: "none",
    customContent: "welcome-chips",
  },
  // Step 2 — Mountain filter (interactive)
  {
    route: "/mountains",
    targetSelector: '[data-onboarding="mountain-filter"]',
    title: "원하는 산을 쉽게 찾아요",
    description:
      "지역, 난이도, 완등 여부로 산을 필터링할 수 있어요.\n아래 필터 중 하나를 직접 눌러보세요!",
    buttonLabel: "",
    spotlightShape: "rect",
    interactive: true,
    interactiveSelector: '[data-onboarding="mountain-filter"] button',
    taskHint: "✋ 필터 칩을 하나 탭해보세요",
    customContent: "filter-interactive",
  },
  // Step 3 — FAB summit claim (interactive)
  {
    route: "/",
    targetSelector: '[data-onboarding="fab-summit"]',
    title: "올랐으면 인증까지! 🚩",
    description:
      "이 버튼 하나로 정상 인증을 바로 시작해요.\nGPS로 현장 인증하거나, 정상석 사진을 AI가 인증해줘요.",
    buttonLabel: "",
    spotlightShape: "circle",
    interactive: true,
    interactiveSelector: '[data-onboarding="fab-summit"]',
    taskHint: "✋ 인증 버튼을 직접 탭해보세요",
    customContent: "fab-methods",
    glowRing: true,
  },
  // Step 4 — Journal & share card
  {
    route: "/records",
    targetSelector: '[data-onboarding="journal-create"]',
    title: "등산 기록을 남겨보세요 📔",
    description:
      "산 이름과 날짜만 입력하면 빠르게 일지 저장 완료!\n완성된 기록은 예쁜 공유 카드로 SNS에 자랑할 수 있어요.",
    buttonLabel: "다음 →",
    spotlightShape: "rect",
    customContent: "share-card",
  },
];

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [tutorialCompleted, setTutorialCompleted] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });
  const [isTutorialActive, setIsTutorialActive] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY);
  });
  const [currentStep, setCurrentStep] = useState(0);

  const completeTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setTutorialCompleted(true);
    setCurrentStep(0);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const nextStep = useCallback(() => {
    if (currentStep >= tutorialSteps.length - 1) {
      completeTutorial();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, completeTutorial]);

  const restartTutorial = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("tutorial_seen");
    setTutorialCompleted(false);
    setCurrentStep(0);
    setIsTutorialActive(true);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        currentStep,
        isTutorialActive,
        tutorialCompleted,
        totalSteps: tutorialSteps.length,
        steps: tutorialSteps,
        nextStep,
        skipTutorial,
        completeTutorial,
        restartTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};
