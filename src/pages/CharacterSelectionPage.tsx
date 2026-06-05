/**
 * CharacterSelectionPage.tsx
 * 온보딩 직후 캐릭터가 아직 선택되지 않은 사용자에게 보여주는 캐릭터 선택 화면.
 * profiles.character_id IS NULL 일 때 트리거된다.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CharacterRow {
  id: string;
  name_ko: string;
  description: string | null;
  color: string | null;
  image_original: string | null;
}

interface Props {
  onCompleted?: () => void;
}

export default function CharacterSelectionPage({ onCompleted }: Props) {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("characters")
        .select("id, name_ko, description, color, image_original")
        .order("id");
      if (cancelled) return;
      if (error) {
        console.error("[CharacterSelectionPage] fetch error", error);
        toast.error("캐릭터를 불러오지 못했어요");
      } else {
        setCharacters((data as CharacterRow[]) || []);
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
    return (
      <button
        key={c.id}
        onClick={() => setSelectedId(c.id)}
        style={{
          gridColumn: isLastOdd ? "1 / -1" : undefined,
          justifySelf: isLastOdd ? "center" : "stretch",
          width: isLastOdd ? "calc(50% - 6px)" : "100%",
          background: isSelected ? "#EAF3DE" : "var(--color-background-primary, #FFFFFF)",
          border: isSelected ? "2px solid #639922" : "0.5px solid var(--color-border-tertiary, #E5E7EB)",
          borderRadius: "var(--border-radius-lg, 16px)",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {c.image_original && !imgError[c.id] ? (
            <img
              src={c.image_original}
              alt={c.name_ko}
              loading="lazy"
              style={{ width: 80, height: 80, objectFit: "contain" }}
              onError={() => setImgError((prev) => ({ ...prev, [c.id]: true }))}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: c.color || "#9E9E9E",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 500,
              }}
            >
              {c.name_ko?.[0] || "?"}
            </div>
          )}
        </div>
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
            color: "var(--color-text-tertiary, #888)",
            textAlign: "center",
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          언제든지 마이 탭에서 바꿀 수 있어요
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
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
          }}
        >
          <style>{`
            @keyframes csp-popIn { 0%{opacity:0;transform:scale(0.85)} 100%{opacity:1;transform:scale(1)} }
            @keyframes csp-charPop { 0%{opacity:0;transform:scale(0)} 100%{opacity:1;transform:scale(1)} }
          `}</style>
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "32px 24px 24px",
              textAlign: "center",
              animation: "csp-popIn 0.3s cubic-bezier(.34,1.56,.64,1) forwards",
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "csp-charPop 0.5s 0.1s cubic-bezier(.34,1.56,.64,1) backwards",
              }}
            >
              {selected.image_original && !imgError[selected.id] ? (
                <img
                  src={selected.image_original}
                  alt={selected.name_ko}
                  style={{ width: 120, height: 120, objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: selected.color || "#9E9E9E",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    fontWeight: 500,
                  }}
                >
                  {selected.name_ko?.[0] || "?"}
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
              앞으로 함께할 메이트
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
              {selected.name_ko} 🎉
            </div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 24, lineHeight: 1.5 }}>
              {selected.description}
            </div>
            <button
              onClick={handleCelebrationContinue}
              style={{
                width: "100%",
                height: 48,
                background: "#639922",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
