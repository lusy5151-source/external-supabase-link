/**
 * CharacterSetupPage.tsx
 * 캐릭터 설정 / 변경 화면 — 온보딩의 캐릭터 추천 퀴즈 단계를 재사용한다.
 * 닉네임 단계 없이 퀴즈 → 결과 → profiles.character_id 업데이트 → 홈으로 이동.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CharacterAnimation, {
  type Character,
  CHARACTER_META,
} from "@/components/CharacterAnimation";
import {
  QUIZZES,
  INITIAL_SCORES,
  CHARACTER_THEME,
  CONFETTI_COLORS,
  QuizPanel,
  type QuizOption,
  type Scores,
} from "@/components/OnboardingFlow";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export default function CharacterSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"quiz" | "result">("quiz");
  const [quizIndex, setQuizIndex] = useState(0);
  const [scores, setScores] = useState<Scores>({ ...INITIAL_SCORES });
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSteps = QUIZZES.length + 1;
  const currentStepNum = step === "quiz" ? quizIndex + 1 : totalSteps;
  const progress = (currentStepNum / totalSteps) * 100;

  const topCharacter = useMemo<Character>(() => {
    let best: Character = "oreumi";
    let bestScore = -Infinity;
    (Object.keys(scores) as Character[]).forEach((c) => {
      if (scores[c] > bestScore) {
        bestScore = scores[c];
        best = c;
      }
    });
    return best;
  }, [scores]);

  const handleOptionSelect = (option: QuizOption) => {
    if (outgoingIndex !== null) return;
    setScores((prev) => {
      const next = { ...prev };
      (Object.keys(option.scores) as Character[]).forEach((c) => {
        next[c] = (next[c] ?? 0) + (option.scores[c] ?? 0);
      });
      return next;
    });
    const currentIdx = quizIndex;
    if (currentIdx < QUIZZES.length - 1) {
      setOutgoingIndex(currentIdx);
      setQuizIndex(currentIdx + 1);
      window.setTimeout(() => setOutgoingIndex(null), 320);
    } else {
      setStep("result");
    }
  };

  const handleComplete = async () => {
    if (saving) return;
    if (!user?.id) {
      toast.error("로그인 정보를 찾을 수 없어요");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ character_id: topCharacter })
        .eq("user_id", user.id);
      if (error) throw error;
      try {
        localStorage.setItem("wandeung_character_id", topCharacter);
      } catch {}
      toast.success(`${CHARACTER_META[topCharacter].name}와 함께해요!`);
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("[CharacterSetupPage] update failed", err);
      toast.error(err?.message || "저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const meta = CHARACTER_META[topCharacter];
  const theme = CHARACTER_THEME[topCharacter];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: step === "result" ? theme.gradient : "#FAFBF7",
        padding: "24px 20px",
        fontFamily: '"Noto Sans KR", sans-serif',
        position: "relative",
        overflow: "hidden",
        transition: "background 0.6s ease",
      }}
    >
      {/* 상단 헤더 (뒤로가기) */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "none",
            color: "#555",
            fontSize: 14,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <ChevronLeft size={18} /> 뒤로
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: "#333" }}>
          캐릭터 설정
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* 진행바 */}
      <div
        style={{
          height: 6,
          background: "#EAEAEA",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#C7D66D",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {step === "quiz" && (
          <div style={{ position: "relative", overflow: "hidden", flex: 1 }}>
            <style>{`
              @keyframes ob-slideInRight { from{transform:translateX(100%);opacity:0.4} to{transform:translateX(0);opacity:1} }
              @keyframes ob-slideOutLeft { from{transform:translateX(0);opacity:1} to{transform:translateX(-100%);opacity:0.4} }
            `}</style>
            {outgoingIndex !== null && (
              <QuizPanel
                key={`out-${outgoingIndex}`}
                index={outgoingIndex}
                onSelect={() => {}}
                style={{
                  position: "absolute",
                  inset: 0,
                  animation: "ob-slideOutLeft 0.3s ease forwards",
                  pointerEvents: "none",
                }}
              />
            )}
            <QuizPanel
              key={`in-${quizIndex}`}
              index={quizIndex}
              onSelect={handleOptionSelect}
              style={{
                position: "relative",
                animation: outgoingIndex !== null ? "ob-slideInRight 0.3s ease forwards" : undefined,
              }}
            />
          </div>
        )}

        {step === "result" && (
          <>
            <style>{`
              @keyframes ob-fadeInUp { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
              @keyframes ob-charPop { 0%{opacity:0;transform:scale(0)} 100%{opacity:1;transform:scale(1)} }
              @keyframes ob-starPop { 0%{opacity:0;transform:scale(0) rotate(0deg)} 60%{opacity:1;transform:scale(1.2) rotate(20deg)} 100%{opacity:0.85;transform:scale(1) rotate(0deg)} }
              @keyframes ob-confetti { 0%{transform:translateY(-40px) rotate(0deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0.9} }
              @keyframes ob-btnPulse { 0%,100%{box-shadow:0 12px 28px -10px var(--ob-shadow,rgba(0,0,0,0.2))} 50%{box-shadow:0 18px 36px -10px var(--ob-shadow,rgba(0,0,0,0.35))} }
            `}</style>

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const left = (i * 8.3 + (i % 3) * 4) % 100;
                const delay = (i % 6) * 0.25;
                const duration = 2.6 + (i % 4) * 0.4;
                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                const w = 8 + (i % 3) * 3;
                const h = 12 + (i % 2) * 4;
                return (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      top: -20,
                      left: `${left}%`,
                      width: w,
                      height: h,
                      background: color,
                      borderRadius: 2,
                      animation: `ob-confetti ${duration}s ${delay}s linear forwards`,
                    }}
                  />
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                textAlign: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  color: "#5a5a5a",
                  margin: 0,
                  opacity: 0,
                  animation: "ob-fadeInUp 0.5s 0s forwards",
                }}
              >
                나와 가장 잘 맞는 캐릭터는
              </p>

              <div
                style={{
                  position: "relative",
                  width: 220,
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "8px 0 4px",
                  opacity: 0,
                  animation: "ob-charPop 0.7s 0.15s cubic-bezier(.34,1.56,.64,1) forwards",
                }}
              >
                <CharacterAnimation character={topCharacter} emotion="normal" size={180} />
                <span style={{ position: "absolute", top: -12, left: 8, fontSize: 18, opacity: 0, animation: "ob-starPop 1s 0.9s ease-out forwards" }}>✨</span>
                <span style={{ position: "absolute", top: -8, right: 12, fontSize: 16, opacity: 0, animation: "ob-starPop 1s 1.1s ease-out forwards" }}>⭐</span>
                <span style={{ position: "absolute", bottom: 8, right: -8, fontSize: 16, opacity: 0, animation: "ob-starPop 1s 1.3s ease-out forwards" }}>💫</span>
              </div>

              <h2
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  margin: 0,
                  color: "#1f1f1f",
                  opacity: 0,
                  animation: "ob-fadeInUp 0.5s 0.45s forwards",
                }}
              >
                {meta.name}
              </h2>

              <span
                style={{
                  padding: "6px 14px",
                  background: meta.tagBg,
                  color: meta.tagCol,
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 999,
                  opacity: 0,
                  animation: "ob-fadeInUp 0.5s 0.6s forwards",
                }}
              >
                {meta.type}
              </span>

              <p
                style={{
                  fontSize: 15,
                  color: "#444",
                  margin: "4px 8px 0",
                  lineHeight: 1.6,
                  opacity: 0,
                  animation: "ob-fadeInUp 0.5s 0.75s forwards",
                }}
              >
                {meta.desc}
              </p>

              <button
                onClick={handleComplete}
                disabled={saving}
                style={{
                  marginTop: 24,
                  width: "100%",
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  background: theme.primary,
                  border: "none",
                  borderRadius: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: 0,
                  ["--ob-shadow" as any]: theme.shadow,
                  boxShadow: theme.shadow,
                  animation: saving
                    ? "ob-fadeInUp 0.5s 0.9s forwards"
                    : "ob-fadeInUp 0.5s 0.9s forwards, ob-btnPulse 2.2s 1.6s ease-in-out infinite",
                  filter: saving ? "grayscale(0.3) brightness(0.95)" : "none",
                  transition: "filter 0.2s",
                }}
              >
                {saving ? "저장 중..." : `${meta.name}로 설정하기`}
              </button>

              <button
                onClick={() => {
                  setScores({ ...INITIAL_SCORES });
                  setQuizIndex(0);
                  setStep("quiz");
                }}
                disabled={saving}
                style={{
                  marginTop: 8,
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
          </>
        )}
      </div>
    </div>
  );
}
