import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "wandeung_tutorial_v2";

export interface TutorialStep {
  route: string;
  targetSelector: string;
  title: string;
  description: string;
  buttonLabel: string;
  spotlightShape: "rect" | "circle";
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
  {
    route: "/auth",
    targetSelector: '[data-onboarding="guest-browse"]',
    title: "먼저 둘러봐도 괜찮아요",
    description:
      "로그인 없이 산 탐색과 홈을 자유롭게 둘러볼 수 있어요. 정상 인증과 기록은 로그인 후 이용 가능해요.",
    buttonLabel: "다음 →",
    spotlightShape: "rect",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="fab-summit"]',
    title: "올랐으면 인증까지!",
    description:
      "언제 어디서든 이 버튼 하나로 정상 인증을 바로 시작할 수 있어요. GPS 또는 정상석 사진으로 인증 가능해요.",
    buttonLabel: "다음 →",
    spotlightShape: "circle",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="tab-records"]',
    title: "등산 기록을 남겨보세요",
    description:
      "산 이름과 날짜만 입력하면 빠르게 일지를 저장할 수 있어요. 완성된 기록은 예쁜 공유 카드로 SNS에 자랑해보세요!",
    buttonLabel: "다음 →",
    spotlightShape: "circle",
  },
  {
    route: "/",
    targetSelector: '[data-onboarding="tab-records"]',
    title: "도전하고 업적을 모아보세요",
    description:
      "100대 명산 완등, 거리 챌린지 등 다양한 목표에 도전해보세요. 달성할 때마다 특별한 업적 배지를 받을 수 있어요.",
    buttonLabel: "시작하기",
    spotlightShape: "circle",
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
    // Also clear old key
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
