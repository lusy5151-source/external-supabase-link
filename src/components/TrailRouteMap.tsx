import { useEffect, useRef } from "react";
import { Map as MapIcon, Info } from "lucide-react";
import type { Trail } from "@/hooks/useTrails";

interface TrailRouteMapProps {
  mountainName: string;
  lat: number;
  lng: number;
  selectedTrail: Trail | null;
}

/**
 * Naver map that shows a polyline route for the selected trail.
 * Falls back to summit marker only when geometry is missing.
 */
export function TrailRouteMap({ mountainName, lat, lng, selectedTrail }: TrailRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const summitMarkerRef = useRef<any>(null);

  // Init map once per mountain
  useEffect(() => {
    if (!mapRef.current) return;
    if (!window.naver?.maps) {
      console.warn("Naver Maps SDK not loaded yet");
      return;
    }
    const naver = window.naver;
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(lat, lng),
      zoom: 13,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
    });
    mapInstanceRef.current = map;

    summitMarkerRef.current = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map,
      title: mountainName,
      icon: {
        content: `<div style="width:14px;height:14px;background:hsl(var(--primary));border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        anchor: new naver.maps.Point(7, 7),
      },
    });

    return () => {
      clearRoute();
      summitMarkerRef.current?.setMap(null);
      summitMarkerRef.current = null;
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountainName, lat, lng]);

  const clearRoute = () => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];
  };

  // Draw route when selected trail changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    clearRoute();

    if (!selectedTrail) return;

    const coords = extractFirstLine(selectedTrail.geometry);
    if (!coords || coords.length === 0) {
      // No geometry: keep summit marker only, recenter on summit
      map.setCenter(new naver.maps.LatLng(lat, lng));
      map.setZoom(13);
      return;
    }

    const path = coords.map(([lng_, lat_]) => new naver.maps.LatLng(lat_, lng_));

    polylineRef.current = new naver.maps.Polyline({
      map,
      path,
      strokeColor: "#4a8f3f",
      strokeWeight: 5,
      strokeOpacity: 0.9,
    });

    // Start marker
    const startMarker = new naver.maps.Marker({
      position: path[0],
      map,
      icon: {
        content: `<div style="background:#4a8f3f;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">출발</div>`,
        anchor: new naver.maps.Point(20, 15),
      },
    });
    overlaysRef.current.push(startMarker);

    // Summit marker (end)
    const endMarker = new naver.maps.Marker({
      position: path[path.length - 1],
      map,
      icon: {
        content: `<div style="background:#e53e3e;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">▲ 정상</div>`,
        anchor: new naver.maps.Point(25, 15),
      },
    });
    overlaysRef.current.push(endMarker);

    // Fit bounds
    const bounds = new naver.maps.LatLngBounds(path[0], path[0]);
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
  }, [selectedTrail, lat, lng]);

  const noGeometry = !!selectedTrail && !extractFirstLine(selectedTrail.geometry)?.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <MapIcon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">등산 루트 지도</h2>
          <p className="text-xs text-muted-foreground">
            {selectedTrail ? selectedTrail.name : "코스를 선택하면 루트가 표시됩니다"}
          </p>
        </div>
      </div>

      {noGeometry && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />이 코스의 GPS 루트는 준비 중입니다
        </div>
      )}

      <div
        ref={mapRef}
        className="naver-map-container h-[350px] rounded-xl border border-border overflow-hidden"
      />
    </div>
  );
}

function extractFirstLine(geometry?: { type?: string; coordinates?: any } | null): number[][] | null {
  if (!geometry || !geometry.coordinates) return null;
  const c = geometry.coordinates;
  if (geometry.type === "LineString" && Array.isArray(c)) return c as number[][];
  if (geometry.type === "MultiLineString" && Array.isArray(c) && Array.isArray(c[0])) {
    return (c as number[][][])[0];
  }
  // Fallback: bare array of [lng,lat]
  if (Array.isArray(c) && Array.isArray(c[0]) && typeof c[0][0] === "number") {
    return c as number[][];
  }
  return null;
}
