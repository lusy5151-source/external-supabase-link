import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ padding: "60px 16px", gap: 8 }}
      >
        <p className="text-muted-foreground" style={{ fontSize: 12 }}>
          이 산의 편의시설 정보가 아직 등록되지 않았어요
        </p>
        <a
          href="mailto:hello@wandeung.com?subject=편의시설 정보 제보"
          className="text-primary hover:underline"
          style={{ fontSize: 11 }}
        >
          정보 제보하기
        </a>
      </div>
    );
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
  const naverUrl = hasCoords
    ? `nmap://place?lat=${facility.latitude}&lng=${facility.longitude}&name=${encodeURIComponent(name)}&appname=com.wandeung.app`
    : `https://map.naver.com/v5/search/${encodeURIComponent(name)}`;

  return (
    <a
      href={naverUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-card flex items-center gap-3 transition-colors hover:bg-secondary/30"
      style={{
        border: "0.5px solid hsl(var(--border))",
        borderRadius: 10,
        padding: 12,
      }}
      aria-label={`${name} 네이버 지도에서 보기`}
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
      <ChevronRight className="text-muted-foreground/60 flex-shrink-0" style={{ width: 16, height: 16 }} />
    </a>
  );
}
