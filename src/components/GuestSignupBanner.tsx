import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useGuest } from "@/contexts/GuestContext";

export function GuestSignupBanner() {
  const { isGuest } = useGuest();
  const [dismissed, setDismissed] = useState(false);

  if (!isGuest || dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        background: "hsl(var(--brand-lime))",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
      }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--brand-forest))" }}>
          완등 기록을 시작해보세요
        </p>
        <p style={{ fontSize: 11, color: "#3B6D11", marginTop: 2 }}>
          가입하면 정상 인증과 기록이 가능해요
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/auth"
          className="inline-flex items-center justify-center text-white"
          style={{
            background: "hsl(var(--brand-forest))",
            borderRadius: "var(--radius)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          가입하기
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="flex items-center justify-center"
          style={{ color: "#3B6D11" }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
