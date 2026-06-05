import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type BadgeRow = {
  id: string;
  character_id: string;
  earned_at: string;
  characters?: {
    name_ko: string | null;
    image_badge: string | null;
    image_complete: string | null;
    color: string | null;
  } | null;
};

const SEEN_KEY = "wandeung_level3_seen_ids";

const getSeen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
};
const markSeen = (id: string) => {
  try {
    const seen = getSeen();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-50)));
    }
  } catch {}
};

const Level3BadgeCelebration = () => {
  const { user } = useAuth();
  const [badge, setBadge] = useState<BadgeRow | null>(null);

  const check = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_badges")
      .select("id, character_id, earned_at, characters(name_ko, image_badge, image_complete, color)")
      .eq("user_id", user.id)
      .eq("badge_type", "level3")
      .order("earned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return;
    const earnedMs = new Date(data.earned_at).getTime();
    const justEarned = Date.now() - earnedMs < 10000;
    const seen = getSeen();
    if (justEarned && !seen.includes(data.id)) {
      setBadge(data as BadgeRow);
    } else if (!seen.includes(data.id) && earnedMs > 0) {
      // mark older badges as seen so they don't appear later
      markSeen(data.id);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    check();
    // Realtime: listen for new level3 badge inserts
    const channel = (supabase as any)
      .channel(`level3-badge-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload?.new?.badge_type === "level3") {
            // refetch with character join
            setTimeout(check, 300);
          }
        }
      )
      .subscribe();

    // Re-check on focus/visibility
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      try { (supabase as any).removeChannel(channel); } catch {}
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, check]);

  if (!badge) return null;

  const c = badge.characters || ({} as NonNullable<BadgeRow["characters"]>);
  const name = c?.name_ko || "캐릭터";

  const handleClose = () => {
    markSeen(badge.id);
    setBadge(null);
  };

  return (
    <>
      <style>{`
        @keyframes wd-confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
        }
        @keyframes wd-pop-in {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes wd-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20,
          animation: "wd-fade-in 0.25s ease-out",
        }}
      >
        {/* Confetti */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const colors = ["#C7D66D", "#639922", "#3B6D11", "#FFD166", "#F4A261", "#EAF3DE"];
            const left = (i * 97) % 100;
            const delay = (i % 10) * 0.15;
            const duration = 2.5 + ((i * 31) % 15) / 10;
            const size = 6 + (i % 4) * 2;
            const color = colors[i % colors.length];
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: "-20px",
                  left: `${left}%`,
                  width: size,
                  height: size * 1.6,
                  background: color,
                  borderRadius: 2,
                  animation: `wd-confetti-fall ${duration}s linear ${delay}s infinite`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: "relative",
            background: "white",
            borderRadius: 20,
            padding: "28px 22px 22px",
            width: "100%",
            maxWidth: 340,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            animation: "wd-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          {/* Character complete image */}
          {c?.image_complete ? (
            <img
              src={c.image_complete}
              alt={name}
              style={{ width: 100, height: 100, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: c?.color || "#EAF3DE",
              }}
            />
          )}

          {/* Achievement banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #639922, #C7D66D)",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 999,
            }}
          >
            🏆 레벨 3 달성!
          </div>

          <div style={{ fontSize: 18, fontWeight: 500, color: "#27500A", textAlign: "center" }}>
            특별 뱃지를 획득했어요!
          </div>
          <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center", marginTop: -6 }}>
            {name}(와)과 함께 레벨 3에 도달했어요
          </div>

          {/* Badge preview */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                border: "2px solid #639922",
                overflow: "hidden",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {c?.image_badge ? (
                <img
                  src={c.image_badge}
                  alt={`${name} 뱃지`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 700, color: "#639922" }}>{name.charAt(0)}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#3B6D11", fontWeight: 500 }}>
              '{name}' 뱃지 획득!
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              marginTop: 8,
              width: "100%",
              height: 48,
              background: "#639922",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            확인
          </button>
        </div>
      </div>
    </>
  );
};

export default Level3BadgeCelebration;
