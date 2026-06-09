/**
 * CharacterQuizModal.tsx
 * 캐릭터 매칭 퀴즈를 모달로 보여주고, 매칭 결과 캐릭터 id를 onResult로 전달한다.
 */

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  QUIZZES,
  INITIAL_SCORES,
  CHARACTER_RESULT,
  computeTopCharacter,
  type Scores,
  type QuizOption,
} from "@/lib/characterQuiz";
import type { Character } from "@/components/CharacterAnimation";

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (characterId: Character) => void;
}

export default function CharacterQuizModal({ open, onClose, onResult }: Props) {
  const [quizIndex, setQuizIndex] = useState(0);
  const [scores, setScores] = useState<Scores>({ ...INITIAL_SCORES });
  const [step, setStep] = useState<"quiz" | "result">("quiz");

  const topCharacter = useMemo<Character>(() => computeTopCharacter(scores), [scores]);
  const result = CHARACTER_RESULT[topCharacter];

  const reset = () => {
    setScores({ ...INITIAL_SCORES });
    setQuizIndex(0);
    setStep("quiz");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelect = (opt: QuizOption) => {
    setScores((prev) => {
      const next = { ...prev };
      (Object.keys(opt.scores) as Character[]).forEach((c) => {
        next[c] = (next[c] ?? 0) + (opt.scores[c] ?? 0);
      });
      return next;
    });
    if (quizIndex < QUIZZES.length - 1) {
      setQuizIndex(quizIndex + 1);
    } else {
      setStep("result");
    }
  };

  const handleApply = () => {
    onResult(topCharacter);
    reset();
  };

  if (!open) return null;

  const q = QUIZZES[quizIndex];
  const progress = step === "result" ? 100 : ((quizIndex + 1) / QUIZZES.length) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#FFFFFF",
          borderRadius: 20,
          padding: "20px 20px 24px",
          fontFamily: '"Noto Sans KR", sans-serif',
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={handleClose}
          aria-label="닫기"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#666",
            padding: 6,
          }}
        >
          <X size={20} />
        </button>

        <div style={{ height: 6, background: "#EEE", borderRadius: 999, overflow: "hidden", margin: "8px 0 18px" }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#C7D66D",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {step === "quiz" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ color: "#888", fontSize: 13 }}>
              {quizIndex + 1} / {QUIZZES.length}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#222", lineHeight: 1.4 }}>
              {q.question}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: "14px 16px",
                    fontSize: 14,
                    textAlign: "left",
                    color: "#222",
                    background: "#FFF",
                    border: "1px solid #E5E5E5",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C7D66D";
                    e.currentTarget.style.background = "#FAFBF0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E5E5E5";
                    e.currentTarget.style.background = "#FFF";
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <p style={{ fontSize: 14, color: "#666", margin: 0 }}>당신과 가장 잘 맞는 캐릭터는</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", color: "#1f1f1f" }}>
              {result.name}
            </h2>
            <span
              style={{
                padding: "5px 12px",
                background: "#EAF3DE",
                color: "#3B6D11",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 999,
              }}
            >
              {result.type}
            </span>
            <p style={{ fontSize: 14, color: "#444", margin: "6px 6px 0", lineHeight: 1.6 }}>{result.desc}</p>
            <p
              style={{
                fontSize: 13,
                color: "#5a5a5a",
                margin: "4px 6px 0",
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              “{result.quote}”
            </p>
            <button
              onClick={handleApply}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                color: "#FFFFFF",
                background: "#639922",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              {result.name}로 선택하기
            </button>
            <button
              onClick={reset}
              style={{
                marginTop: 4,
                background: "transparent",
                border: "none",
                color: "#666",
                fontSize: 13,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              다시 테스트하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
