/**
 * CharacterSelectionPage.tsx
 * 온보딩 직후 캐릭터가 아직 선택되지 않은 사용자에게 보여주는 캐릭터 선택 화면.
 * profiles.character_id IS NULL 일 때 트리거된다.
 */

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // 7개일 때 마지막(7번째) 카드를 가운데에 놓기 위한 span 트릭
  const renderCard = (c: CharacterRow, idx: number, total: number) => {
    const isLastOdd = total % 2 === 1 && idx === total - 1;
    const isSelected = selectedId === c.id;
    const isRecommended = effectiveRecommendedId === c.id;
    return (
      <button
        key={c.id}
        onClick={() => setSelectedId(c.id)}
        style={{
          gridColumn: isLastOdd ? "1 / -1" : undefined,
          justifySelf: isLastOdd ? "center" : "stretch",
          width: isLastOdd ? "calc(50% - 6px)" : "100%",
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
        <img
          src={c.image_original || ""}
          alt={c.name_ko}
          style={{
            width: "100%",
            maxWidth: "100px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
            background: "transparent",
            mixBlendMode: "multiply",
          }}
        />

        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary, #1a1a1a)",
          }}
        >
          {c.name_ko}
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
          {c.description}
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
            {characters.map((c, idx) => renderCard(c, idx, characters.length))}
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
                  alt={selected.name_ko}
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
                  {selected.name_ko?.[0] || "?"}
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
              {selected.name_ko}(와)과 함께 등산을 시작해요
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
                  alt={`${selected.name_ko} 뱃지`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "2px solid #639922",
                    objectFit: "cover",
                  }}
                />
                <div style={{ fontSize: 12, color: "#3B6D11" }}>
                  '{selected.name_ko}' 뱃지 획득!
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
    </div>
  );
}
