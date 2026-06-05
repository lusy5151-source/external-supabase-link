import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const WANDEUNG_FALLBACK_IMAGE =
  "https://ylcjlzlchinijvyojdbc.supabase.co/storage/v1/object/public/character-images/complete_wandeung/wandeung.png";

const BUBBLE_TEXT: Record<string, string> = {
  wandeung: "정상이다! 완등 성공! 🎉",
  oreumi: "새로운 봉우리 정복! 대단해요!",
  gaia: "천천히 올라왔군요. 잘 하셨어요!",
  peggy: "자연과 함께한 멋진 등산이에요!",
  pongdang: "지도대로 딱 왔네요! 완벽해요!",
  dorongi: "충분히 수분 보충했나요? 최고예요!",
  dorami: "묵직하게 해냈군요. 대단합니다!",
};

interface Props {
  userId?: string | null;
  size?: number;
}

const CharacterCompletionCelebration = ({ userId, size = 120 }: Props) => {
  const [imageUrl, setImageUrl] = useState<string>(WANDEUNG_FALLBACK_IMAGE);
  const [characterId, setCharacterId] = useState<string>("wandeung");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      try {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("character_id")
          .eq("user_id", userId)
          .single();
        const charId = profile?.character_id || "wandeung";
        const { data: char } = await (supabase as any)
          .from("characters")
          .select("id, image_complete")
          .eq("id", charId)
          .single();
        if (cancelled) return;
        setCharacterId(char?.id || "wandeung");
        if (char?.image_complete) setImageUrl(char.image_complete);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const bubble = BUBBLE_TEXT[characterId] || BUBBLE_TEXT.wandeung;

  return (
    <div className="flex flex-col items-center">
      <img
        src={imageUrl}
        alt="character complete"
        loading="lazy"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          animation: "characterDropIn 0.4s ease-out both",
        }}
      />
      <div
        style={{
          position: "relative",
          marginTop: 14,
          background: "#FFFFFF",
          border: "1px solid #EAF3DE",
          borderRadius: 12,
          padding: "8px 14px",
          fontSize: 13,
          color: "#27500A",
          maxWidth: 240,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {/* Triangle pointer */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -7,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderBottom: "7px solid #EAF3DE",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "6px solid #FFFFFF",
          }}
        />
        {bubble}
      </div>
      <style>{`
        @keyframes characterDropIn {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CharacterCompletionCelebration;
