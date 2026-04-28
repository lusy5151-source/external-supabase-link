import { useEffect, useRef, useState } from "react";
import { Route, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrailFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][] | number[][][];
  };
  properties: Record<string, string | number | null>;
}

interface TrailMapProps {
  mountainName: string;
  lat: number;
  lng: number;
}

const TRAIL_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#10b981",
];

export function TrailMap({ mountainName, lat, lng }: TrailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trailCount, setTrailCount] = useState(0);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!window.naver?.maps) {
      console.warn("Naver Maps SDK not loaded yet");
      return;
    }
    const naver = window.naver;

    // Cleanup previous
    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(lat, lng),
      zoom: 13,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
    });

    // Mountain marker
    const mountainMarker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map,
      title: mountainName,
      icon: {
        content: `<div style="width:14px;height:14px;background:hsl(var(--primary));border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        anchor: new naver.maps.Point(7, 7),
      },
    });
    overlaysRef.current.push(mountainMarker);

    mapInstanceRef.current = map;

    fetchTrails(mountainName, map, naver);

    return () => {
      overlaysRef.current.forEach((o) => o.setMap?.(null));
      overlaysRef.current = [];
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountainName, lat, lng]);

  const fetchTrails = async (name: string, map: any, naver: any) => {
    setLoading(true);
    setTrailCount(0);
    setNoData(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-trails", {
        body: { mountainName: name },
      });

      if (fnError || !data) {
        setNoData(true);
        setLoading(false);
        return;
      }

      const features: TrailFeature[] = data.features || [];
      if (features.length === 0) {
        setNoData(true);
        setLoading(false);
        return;
      }

      setTrailCount(features.length);
      const bounds = new naver.maps.LatLngBounds();
      let hasPoints = false;

      features.forEach((feature, idx) => {
        const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
        const coords = extractCoordinates(feature.geometry);
        if (coords.length === 0) return;

        coords.forEach((lineCoords) => {
          const path = lineCoords.map(([lng, lat]) => {
            const ll = new naver.maps.LatLng(lat, lng);
            bounds.extend(ll);
            hasPoints = true;
            return ll;
          });

          const polyline = new naver.maps.Polyline({
            map,
            path,
            strokeColor: color,
            strokeWeight: 4,
            strokeOpacity: 0.8,
          });
          overlaysRef.current.push(polyline);

          if (path.length > 0) {
            const startMarker = new naver.maps.Marker({
              position: path[0],
              map,
              icon: {
                content: `<div style="width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
                anchor: new naver.maps.Point(5, 5),
              },
            });
            overlaysRef.current.push(startMarker);
          }
        });

        const trailName = feature.properties?.pmntn_nm || feature.properties?.mntn_nm || `루트 ${idx + 1}`;
        const distance = feature.properties?.pmntn_lt;
        let tooltipText = `${trailName}`;
        if (distance) tooltipText += ` (${distance}m)`;

        const firstCoords = coords[0];
        if (firstCoords && firstCoords.length > 0) {
          const mid = firstCoords[Math.floor(firstCoords.length / 2)];
          const midLatLng = new naver.maps.LatLng(mid[1], mid[0]);
          const infoWindow = new naver.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:12px;">${tooltipText}</div>`,
            borderWidth: 0,
            disableAnchor: true,
            backgroundColor: "rgba(255,255,255,0.95)",
          });
          const labelMarker = new naver.maps.Marker({
            position: midLatLng,
            map,
            icon: {
              content: `<div style="width:1px;height:1px;"></div>`,
              anchor: new naver.maps.Point(0, 0),
            },
          });
          naver.maps.Event.addListener(labelMarker, "click", () => infoWindow.open(map, labelMarker));
          overlaysRef.current.push(labelMarker);
        }
      });

      if (hasPoints) {
        map.fitBounds(bounds);
      }
    } catch (e) {
      console.error("Trail fetch error:", e);
      setNoData(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">등산로 지도</h2>
            <p className="text-xs text-muted-foreground">
              {loading ? "로딩 중..." : trailCount > 0 ? `${trailCount}개 등산로` : `${mountainName} 위치`}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {noData && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          GPS 등산로 데이터는 wandeung.com에서 이용 가능합니다
        </div>
      )}

      <div
        ref={mapRef}
        className="naver-map-container h-[350px] rounded-xl border border-border overflow-hidden"
      />

      {trailCount > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          데이터 출처: 브이월드 산림청 등산로 · 좌표계: WGS84
        </p>
      )}
    </div>
  );
}

function extractCoordinates(
  geometry: TrailFeature["geometry"]
): number[][][] {
  if (geometry.type === "LineString") {
    return [geometry.coordinates as number[][]];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates as number[][][];
  }
  return [];
}
