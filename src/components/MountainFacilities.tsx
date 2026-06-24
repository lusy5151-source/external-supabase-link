import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { appleMapsDirectionsUrl, naverMapsWebUrl } from "@/lib/mapLinks";

interface Facility {
  id: string;
  facility_type: string;
  name: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Only these two types are surfaced in the 편의시설 tab
const SURFACED_TYPES: { type: string; label: string }[] = [
  { type: "visitor_center", label: "탐방안내소" },
  { type: "parking", label: "주차장" },
];

export function MountainFacilities({ mountainId }: { mountainId: number }) {
  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: ["mountain-facilities", mountainId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mountain_facilities")
        .select("id, facility_type, name, description, latitude, longitude")
        .eq("mountain_id", mountainId)
        .eq("is_active", true);
      if (error) throw error;
      return (data as Facility[]) || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: 12, padding: "12px 0" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> 시설 정보를 불러오는 중...
      </div>
    );
  }

  // Group surfaced types
  const grouped = SURFACED_TYPES.map((g) => ({
    ...g,
    items: facilities.filter((f) => f.facility_type === g.type),
  })).filter((g) => g.items.length > 0);

  if (grouped.length === 0) {
    return <FacilitiesEmptyState mountainId={mountainId} />;
  }

  return (
    <div className="space-y-4">
      {grouped.map((g) => (
        <section key={g.type} className="space-y-2">
          <h3 className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
            {g.label}
          </h3>
          <div className="space-y-2">
            {g.items.map((f) => (
              <FacilityCard key={f.id} facility={f} fallbackLabel={g.label} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FacilityCard({ facility, fallbackLabel }: { facility: Facility; fallbackLabel: string }) {
  const name = facility.name || fallbackLabel;
  const hasCoords = facility.latitude != null && facility.longitude != null;
  const mapTarget = {
    name,
    lat: facility.latitude,
    lng: facility.longitude,
    address: facility.description,
  };

  return (
    <div
      className="bg-card flex items-center gap-3 transition-colors hover:bg-secondary/30"
      style={{
        border: "0.5px solid hsl(var(--border))",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        className="bg-secondary/60 flex items-center justify-center flex-shrink-0"
        style={{ width: 24, height: 24, borderRadius: 6 }}
      >
        <MapPin className="text-primary" style={{ width: 14, height: 14 }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>
          {name}
        </p>
        {facility.description && (
          <p className="text-muted-foreground truncate" style={{ fontSize: 12, marginTop: 2 }}>
            {facility.description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <a
          href={appleMapsDirectionsUrl(mapTarget)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary"
          aria-label={`${name} Apple Maps 길찾기`}
        >
          길찾기
        </a>
        <a
          href={naverMapsWebUrl(mapTarget)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
          aria-label={`${name} 네이버지도 웹에서 보기`}
        >
          네이버
        </a>
      </div>
    </div>
  );
}

function FacilitiesEmptyState({ mountainId }: { mountainId: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      toast("로그인이 필요해요", { description: "정보를 등록하려면 먼저 로그인해주세요." });
      navigate("/auth");
      return;
    }
    window.dispatchEvent(new CustomEvent("open-facility-register", { detail: { mountainId } }));
  };

  return (
    <div>
      <div
        style={{
          background: "#f7faf2",
          border: "1.5px dashed #c6d56c",
          borderRadius: 16,
          padding: "32px 16px",
          margin: "0 12px",
          textAlign: "center",
        }}
      >
        <svg viewBox="0 0 100 100" width="56" height="56" style={{ display: "block", margin: "0 auto 12px" }}>
          <circle cx="50" cy="50" r="44" fill="#e3efcc" />
          <circle cx="68" cy="35" r="6" fill="#FAC775" />
          <path d="M28 68 L48 35 L68 68 Z" fill="#c6d56c" />
          <path d="M40 68 L52 50 L64 68 Z" fill="#639922" />
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#173404", margin: "0 0 4px" }}>
          아직 정보가 없어요
        </p>
        <p style={{ fontSize: 11, color: "#666", margin: "0 0 16px", lineHeight: 1.5 }}>
          탐방안내소 · 대피소 · 주차장
          <br />
          위치를 가장 먼저 등록해보세요
        </p>
        <button
          onClick={handleClick}
          style={{
            background: "#c6d56c",
            color: "#173404",
            padding: "9px 20px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          + 정보 등록하기
        </button>
      </div>
      <p style={{ textAlign: "center", fontSize: 10, color: "#999", marginTop: 16 }}>
        또는 다른 사용자 등록을 기다려요
      </p>
    </div>
  );
}
