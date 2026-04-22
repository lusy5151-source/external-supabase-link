import { useState, useEffect, lazy, Suspense } from "react";
import { useTutorial } from "@/contexts/TutorialContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const Records = lazy(() => import("@/pages/Records"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const MyChallengePage = lazy(() => import("@/pages/MyChallengePage"));

type Segment = "journal" | "ranking" | "challenge";

const segments: { key: Segment; label: string }[] = [
  { key: "journal", label: "일지" },
  { key: "ranking", label: "순위" },
  { key: "challenge", label: "나의 도전" },
];

const RecordsHub = () => {
  const [active, setActive] = useState<Segment>("journal");
  const { isTutorialActive, steps, currentStep } = useTutorial();

  // Switch segment when tutorial step requires it
  useEffect(() => {
    if (!isTutorialActive) return;
    const current = steps[currentStep];
    if (current?.recordsSegment) {
      setActive(current.recordsSegment as Segment);
    }
  }, [isTutorialActive, currentStep, steps]);

  return (
    <div className="pb-24">
      {/* Underline segment tabs */}
      <div className="flex border-b" style={{ borderColor: "hsl(var(--border))" }}>
        {segments.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className="flex-1 py-3 text-center transition-colors"
            style={{
              fontSize: 13,
              fontWeight: active === key ? 700 : 500,
              color: active === key ? "#27500A" : "hsl(var(--color-text-tertiary))",
              borderBottom: active === key ? "2px solid #639922" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Suspense fallback={<LoadingSpinner />}>
          {active === "journal" && <Records />}
          {active === "ranking" && <LeaderboardPage />}
          {active === "challenge" && <MyChallengePage />}
        </Suspense>
      </div>
    </div>
  );
};

export default RecordsHub;
