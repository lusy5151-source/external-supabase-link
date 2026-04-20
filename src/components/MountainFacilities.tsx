import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Tent, ParkingCircle, MapPin, Loader2 } from "lucide-react";

interface Facility {
  id: string;
  facility_type: string;
  name: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

const typeMeta: Record<string, { label: string; icon: any; color: string }> = {
  visitor_center: { label: "탐방안내소", icon: Building2, color: "bg-blue-50 text-blue-700 border-blue-200" },
  shelter: { label: "대피소", icon: Tent, color: "bg-amber-50 text-amber-700 border-amber-200" },
  parking: { label: "주차장", icon: ParkingCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const getMeta = (type: string) => typeMeta[type] || { label: type, icon: MapPin, color: "bg-secondary text-secondary-foreground border-border" };

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
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 시설 정보를 불러오는 중...
      </div>
    );
  }

  if (facilities.length === 0) return null;

  // group by type
  const grouped = facilities.reduce<Record<string, Facility[]>>((acc, f) => {
    (acc[f.facility_type] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">편의시설</h3>
        <span className="text-xs text-muted-foreground">({facilities.length}개)</span>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([type, list]) => {
          const meta = getMeta(type);
          const Icon = meta.icon;
          return (
            <div key={type} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{meta.label}</span>
                <span className="text-[10px] text-muted-foreground">{list.length}개</span>
              </div>
              <div className="space-y-1.5">
                {list.map((f) => (
                  <div key={f.id} className={`rounded-lg border px-2.5 py-1.5 ${meta.color}`}>
                    <p className="text-xs font-medium">{f.name || meta.label}</p>
                    {f.description && (
                      <p className="text-[11px] mt-0.5 opacity-80">{f.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
