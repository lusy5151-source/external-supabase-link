/**
 * CharacterSelectionPage.tsx
 * 온보딩 직후 캐릭터가 아직 선택되지 않은 사용자에게 보여주는 캐릭터 선택 화면.
 * profiles.character_id IS NULL 일 때 트리거된다.
 */

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CharacterQuizModal from "@/components/CharacterQuizModal";
import type { Character } from "@/components/CharacterAnimation";

// 화면에 노출할 캐릭터 이름/설명 오버라이드 (DB 값보다 우선)
const CHARACTER_DISPLAY: Record<string, { name: string; desc: string }> = {
  wandeung: { name: "완등이", desc: "정상에 깃발을 꽂는 완등의 주인공" },
  oreumi:   { name: "오름이", desc: "산이 처음이라 모든 게 설레는 새싹 등산러" },
  pongdang: { name: "퐁당이", desc: "정상보다 쉼이 좋은 힐링 산책 캐릭터" },
  dorong:   { name: "도롱이", desc: "작은 기록도 모이면 완등이 되는 막내 물방울" },
  dorami:   { name: "도라미", desc: "말없이 안전을 지키는 든든한 바위 캐릭터" },
  gaia:     { name: "가이아", desc: "명산의 시간과 풍경을 아는 지혜로운 산" },
  peggy:    { name: "페기", desc: "산을 깨끗이 지키는 클린 하이킹 마스코트" },
};
const displayName = (c: { id: string; name_ko: string }) =>
  CHARACTER_DISPLAY[c.id]?.name ?? c.name_ko;
const displayDesc = (c: { id: string; description: string | null }) =>
  CHARACTER_DISPLAY[c.id]?.desc ?? c.description ?? "";

interface CharacterRow {
  id: string;
  name_ko: string;
  description: string | null;
  color: string | null;
  image_original: string | null;
  image_complete?: string | null;
  image_badge?: string | null;
}

interface Props {
  onCompleted?: () => void;
  recommendedId?: string | null;
}

export default function CharacterSelectionPage({ onCompleted, recommendedId }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const navStateRecommendedId =
    (location.state as { recommendedId?: string } | null)?.recommendedId ?? null;
  const effectiveRecommendedId = recommendedId ?? navStateRecommendedId ?? null;

  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(effectiveRecommendedId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizResultId, setQuizResultId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = sessionStorage.getItem("characters_cache");
        if (cached) {
          const rows = JSON.parse(cached) as CharacterRow[];
          if (!cancelled) {
            setCharacters(rows);
            setLoading(false);
          }
          return;
        }
      } catch {}
      const charsRes = await (supabase as any)
        .from("characters")
        .select("id, name_ko, description, color, image_original, image_complete, image_badge")
        .order("name_ko");
      if (cancelled) return;
      if (charsRes.error) {
        console.error("[CharacterSelectionPage] fetch error", charsRes.error);
        toast.error("캐릭터를 불러오지 못했어요");
      } else {
        const rows = (charsRes.data as CharacterRow[]) || [];
        console.log("Character URLs:", rows.map((c) => c.image_original));
        setCharacters(rows);
        try {
          sessionStorage.setItem("characters_cache", JSON.stringify(rows));
        } catch {}
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인 정보를 찾을 수 없어요");
        setSaving(false);
        return;
      }
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ character_id: selectedId })
        .eq("user_id", user.id);
      if (error) throw error;
      try {
        localStorage.setItem("wandeung_character_id", selectedId);
      } catch {}
      setShowCelebration(true);
    } catch (err: any) {
      console.error("[CharacterSelectionPage] update failed", err);
      toast.error(err?.message || "저장에 실패했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  const handleCelebrationContinue = () => {
    if (onCompleted) onCompleted();
    else navigate("/", { replace: true });
  };

  const selected = characters.find((c) => c.id === selectedId);

  const renderCard = (c: CharacterRow) => {
    const isSelected = selectedId === c.id;
    const isRecommended = effectiveRecommendedId === c.id;
    return (
      <button
        key={c.id}
        onClick={() => setSelectedId(c.id)}
        style={{
          width: "100%",
          background: isSelected ? "#EAF3DE" : "transparent",
          border: isSelected ? "2px solid #639922" : "0.5px solid var(--color-border-tertiary, #E5E7EB)",
          borderRadius: "var(--border-radius-lg, 16px)",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
          textAlign: "center",
          position: "relative",
        }}
      >
        {isRecommended && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#FAEEDA",
              color: "#633806",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 10,
              padding: "2px 6px",
              lineHeight: 1.2,
            }}
          >
            추천 ✨
          </span>
        )}
        <div
          style={{
            width: 96,
            height: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={`${c.image_original || ""}?v=${Date.now()}`}
            alt={displayName(c)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              background: "transparent",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary, #1a1a1a)",
          }}
        >
          {displayName(c)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary, #888)",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {displayDesc(c)}
        </div>
      </button>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background-tertiary, #F5F6F2)",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      <div style={{ marginTop: 40, padding: "0 20px", marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            textAlign: "center",
            margin: 0,
            color: "var(--color-text-primary, #1a1a1a)",
          }}
        >
          나만의 등산 메이트를 선택해요
        </h1>
        <p
          style={{
            fontSize: 13,
            color: effectiveRecommendedId
              ? "var(--color-text-secondary, #666)"
              : "var(--color-text-tertiary, #888)",
            textAlign: "center",
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          {effectiveRecommendedId
            ? "퀴즈 결과로 추천된 캐릭터예요"
            : "함께 등산할 나만의 캐릭터를 골라보세요"}
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button
            onClick={() => setQuizOpen(true)}
            style={{
              background: "#FFFFFF",
              border: "1px solid #C7D66D",
              color: "#3B6D11",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: 999,
              cursor: "pointer",
              boxShadow: "0 2px 8px -4px rgba(99,153,34,0.35)",
            }}
          >
            🧭 내 캐릭터 찾기
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 20px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", paddingTop: 60, color: "#888", fontSize: 13 }}>
            불러오는 중...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {characters.map((c) => renderCard(c))}
          </div>
        )}
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--color-background-tertiary, #F5F6F2)",
          padding: "16px 20px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          onClick={handleConfirm}
          disabled={!selectedId || saving}
          style={{
            width: "100%",
            height: 52,
            background: !selectedId || saving ? "#C5D6A8" : "#639922",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
            border: "none",
            borderRadius: 12,
            cursor: !selectedId || saving ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {saving ? "저장 중..." : "이 캐릭터로 시작하기"}
        </button>
      </div>

      {showCelebration && selected && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
            overflow: "hidden",
          }}
        >
          <style>{`
            @keyframes csp-popIn { 0%{opacity:0;transform:scale(0.85)} 100%{opacity:1;transform:scale(1)} }
            @keyframes csp-charPop { 0%{opacity:0;transform:scale(0)} 100%{opacity:1;transform:scale(1)} }
            @keyframes csp-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
            @keyframes csp-confetti-fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(110vh) rotate(540deg);opacity:0.9} }
          `}</style>

          {/* Confetti */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const palette = ["#C7D66D", "#639922", "#F5C518", "#5BC8F5", "#E53935", "#B39DDB"];
              const left = (i * 8.3 + (i % 4) * 5) % 100;
              const delay = (i % 6) * 0.18;
              const duration = 2.4 + (i % 4) * 0.35;
              const size = 8 + (i % 3) * 3;
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    top: -20,
                    left: `${left}%`,
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: palette[i % palette.length],
                    animation: `csp-confetti-fall ${duration}s ${delay}s linear forwards`,
                  }}
                />
              );
            })}
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 300,
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "32px 24px",
              textAlign: "center",
              animation: "csp-popIn 0.3s cubic-bezier(.34,1.56,.64,1) forwards",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Character image with 깃발 */}
            <div
              style={{
                width: 100,
                height: 100,
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "csp-charPop 0.5s 0.1s cubic-bezier(.34,1.56,.64,1) backwards, csp-pulse 2s 0.7s ease-in-out infinite",
              }}
            >
              {selected.image_complete || selected.image_original ? (
                <img
                  src={(selected.image_complete || selected.image_original) as string}
                  alt={displayName(selected)}
                  style={{ width: 100, height: 100, objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: selected.color || "#9E9E9E",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    fontWeight: 500,
                  }}
                >
                  {displayName(selected)?.[0] || "?"}
                </div>
              )}
            </div>

            {/* Achievement banner */}
            <div
              style={{
                display: "inline-block",
                background: "#EAF3DE",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 500,
                color: "#27500A",
                marginBottom: 16,
              }}
            >
              🏆 업적 달성!
            </div>

            <div style={{ fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>
              나만의 등산 메이트!
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>
              {displayName(selected)}(와)과 함께 등산을 시작해요
            </div>

            {/* Badge preview */}
            {selected.image_badge && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 24,
                }}
              >
                <img
                  src={selected.image_badge}
                  alt={`${displayName(selected)} 뱃지`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "2px solid #639922",
                    objectFit: "cover",
                  }}
                />
                <div style={{ fontSize: 12, color: "#3B6D11" }}>
                  '{displayName(selected)}' 뱃지 획득!
                </div>
              </div>
            )}

            <button
              onClick={handleCelebrationContinue}
              style={{
                width: "100%",
                height: 48,
                background: "#639922",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 500,
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              완등 시작하기!
            </button>
          </div>
        </div>
      )}

      <CharacterQuizModal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        onResult={(charId) => {
          setSelectedId(charId);
          setQuizResultId(charId);
          setQuizOpen(false);
          // 추천 멘트 노출을 위해 살짝 스크롤
          setTimeout(() => {
            try {
              window.scrollTo({ top: 0, behavior: "smooth" });
            } catch {}
          }, 50);
          toast.success("추천 캐릭터를 선택했어요. 확인 후 시작해 보세요!");
        }}
      />
    </div>
  );
}
