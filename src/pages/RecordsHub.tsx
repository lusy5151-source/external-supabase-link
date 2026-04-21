import { useState, lazy, Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

const Records = lazy(() => import("@/pages/Records"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const ChallengePage = lazy(() => import("@/pages/ChallengePage"));

type Segment = "journal" | "ranking" | "challenge";

const segments: { key: Segment; label: string }[] = [
  { key: "journal", label: "일지" },
  { key: "ranking", label: "순위" },
  { key: "challenge", label: "챌린지" },
];

const RecordsHub = () => {
  const [active, setActive] = useState<Segment>("journal");

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
          {active === "challenge" && <ChallengePage />}
        </Suspense>
      </div>
    </div>
  );
};

export default RecordsHub;
