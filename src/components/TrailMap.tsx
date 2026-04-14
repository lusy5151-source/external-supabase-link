import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Route, Loader2, AlertCircle } from "lucide-react";
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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailCount, setTrailCount] = useState(0);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Mountain marker
    const mountainIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:14px;height:14px;background:hsl(var(--primary));border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon: mountainIcon })
      .addTo(map)
      .bindTooltip(mountainName, { direction: "top", offset: [0, -10] });

    mapInstanceRef.current = map;

    // Fetch trail data
    fetchTrails(mountainName, map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mountainName, lat, lng]);

  const fetchTrails = async (name: string, map: L.Map) => {
    setLoading(true);
    setError(null);
    setTrailCount(0);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-trails", {
        body: { mountainName: name },
      });

      if (fnError || !data) {
        setError("등산로 GPS 데이터를 찾을 수 없습니다");
        setLoading(false);
        return;
      }

      const features: TrailFeature[] = data.features || [];

      if (features.length === 0) {
        setError("등산로 GPS 데이터를 찾을 수 없습니다");
        setLoading(false);
        return;
      }

      setTrailCount(features.length);
      const allBounds: L.LatLng[] = [];

      features.forEach((feature, idx) => {
        const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
        const coords = extractCoordinates(feature.geometry);

        if (coords.length === 0) return;

        coords.forEach((lineCoords) => {
          const latLngs = lineCoords.map(([lng, lat]) => {
            const ll = L.latLng(lat, lng);
            allBounds.push(ll);
            return ll;
          });

          // Trail line
          L.polyline(latLngs, {
            color,
            weight: 4,
            opacity: 0.8,
          }).addTo(map);

          // Start/end markers
          if (latLngs.length > 0) {
            const startIcon = L.divIcon({
              className: "trail-marker",
              html: `<div style="width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
              iconSize: [10, 10],
              iconAnchor: [5, 5],
            });
            L.marker(latLngs[0], { icon: startIcon }).addTo(map);
          }
        });

        // Tooltip with trail name
        const trailName = feature.properties?.pmntn_nm || feature.properties?.mntn_nm || `루트 ${idx + 1}`;
        const distance = feature.properties?.pmntn_lt;
        let tooltipText = `${trailName}`;
        if (distance) tooltipText += ` (${distance}m)`;

        const firstCoords = coords[0];
        if (firstCoords && firstCoords.length > 0) {
          const mid = firstCoords[Math.floor(firstCoords.length / 2)];
          L.marker([mid[1], mid[0]], {
            icon: L.divIcon({ className: "invisible-marker", html: "", iconSize: [0, 0] }),
          })
            .addTo(map)
            .bindTooltip(tooltipText, { permanent: false, direction: "top" });
        }
      });

      // Fit bounds
      if (allBounds.length > 0) {
        const bounds = L.latLngBounds(allBounds);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (e) {
      console.error("VWorld trail fetch error:", e);
      setError("등산로 데이터를 불러오는 중 오류가 발생했습니다");
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
              {loading ? "로딩 중..." : trailCount > 0 ? `${trailCount}개 등산로` : "데이터 없음"}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div
        ref={mapRef}
        className="h-[350px] rounded-xl border border-border overflow-hidden"
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
