import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Info } from "lucide-react";
import { useTrails, type Trail } from "@/hooks/useTrails";

interface TrailRouteMapProps {
  mountainName: string;
  mountainId?: number;
  lat: number;
  lng: number;
  selectedTrail: Trail | null;
}

const ROUTE_COLORS = [
  "#2D6A4F", // 1번째 - 진초록
  "#E76F51", // 2번째 - 주황
  "#457B9D", // 3번째 - 파랑
  "#9B2226", // 4번째 - 빨강
  "#6A4C93", // 5번째 - 보라
  "#F4A261", // 6번째 - 연주황
];

const NO_GEOMETRY_COLOR = "#AAAAAA";

function getCourseColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

function extractFirstLine(geometry?: { type?: string; coordinates?: any } | null): number[][] | null {
  if (!geometry || !geometry.coordinates) return null;
  const c = geometry.coordinates;
  if (geometry.type === "LineString" && Array.isArray(c)) return c as number[][];
  if (geometry.type === "MultiLineString" && Array.isArray(c) && Array.isArray(c[0])) {
    return (c as number[][][])[0];
  }
  if (Array.isArray(c) && Array.isArray(c[0]) && typeof c[0][0] === "number") {
    return c as number[][];
  }
  return null;
}

export function TrailRouteMap({ mountainName, mountainId, lat, lng, selectedTrail }: TrailRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const summitMarkerRef = useRef<any>(null);
  const coursePolylinesRef = useRef<any[]>([]);
  const startMarkersRef = useRef<any[]>([]);
  const selectedOverlaysRef = useRef<any[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<"NORMAL" | "TERRAIN">("TERRAIN");
  const { trails } = useTrails(mountainId ?? 0);

  // Toggle map type when user clicks the buttons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    map.setMapTypeId(window.naver.maps.MapTypeId[mapType]);
  }, [mapType]);

  // Init map once — wait for `init` event before signaling ready
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

    // 봉우리 마커
    summitMarkerRef.current = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map,
      title: mountainName,
      icon: {
        content: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
            <div style="background:white;color:#1f2937;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid #e5e7eb;margin-bottom:2px;">
              ⛰️ ${mountainName}
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid white;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.15));"></div>
          </div>
        `,
        anchor: new naver.maps.Point(0, 0),
      },
      zIndex: 200,
    });

    // 지도 init 완료 후에만 폴리라인 그리기 시작
    const initListener = naver.maps.Event.addListener(map, "init", () => {
      setMapReady(true);
    });

    // Safety net: 일부 환경에서 init 이벤트가 누락될 수 있어 다음 tick에 fallback
    const fallbackTimer = window.setTimeout(() => setMapReady(true), 300);

    return () => {
      window.clearTimeout(fallbackTimer);
      try { naver.maps.Event.removeListener(initListener); } catch {}
      coursePolylinesRef.current.forEach((p) => p.setMap?.(null));
      coursePolylinesRef.current = [];
      startMarkersRef.current.forEach((m) => m.setMap?.(null));
      startMarkersRef.current = [];
      selectedOverlaysRef.current.forEach((o) => o.setMap?.(null));
      selectedOverlaysRef.current = [];
      summitMarkerRef.current?.setMap(null);
      summitMarkerRef.current = null;
      mapInstanceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountainName, lat, lng]);

  // Draw all course polylines — only after map is fully ready
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    // clear previous
    coursePolylinesRef.current.forEach((p) => p.setMap?.(null));
    coursePolylinesRef.current = [];
    startMarkersRef.current.forEach((m) => m.setMap?.(null));
    startMarkersRef.current = [];

    const summit = new naver.maps.LatLng(lat, lng);
    const bounds = new naver.maps.LatLngBounds(summit, summit);

    trails.forEach((trail, idx) => {
      const coords = extractFirstLine(trail.geometry);
      const color = getCourseColor(idx);

      if (!coords || coords.length < 2) {
        // geometry 없음 → 폴리라인 생략, 범례에만 표시
        return;
      }

      const validPts = coords.filter((pt) => Array.isArray(pt) && pt.length >= 2);
      if (validPts.length < 2) return;

      // bounds: 모든 좌표를 직접 extend
      validPts.forEach(([lng_, lat_]) => {
        bounds.extend(new naver.maps.LatLng(lat_, lng_));
      });

      const path = validPts.map(([lng_, lat_]) => new naver.maps.LatLng(lat_, lng_));
      const polyline = new naver.maps.Polyline({
        map,
        path,
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: 0.85,
        strokeStyle: "solid",
        clickable: true,
        zIndex: 50,
      });

      naver.maps.Event.addListener(polyline, "click", (e: any) => {
        const distance = trail.distance_km ? `${trail.distance_km}km` : "-";
        const difficulty = trail.difficulty || "-";
        const infoWindow = new naver.maps.InfoWindow({
          content: `
            <div style="padding:10px 14px;font-size:13px;line-height:1.6;min-width:140px;">
              <div style="font-weight:600;margin-bottom:4px;color:${color};">${trail.name}</div>
              <div>📏 거리: ${distance}</div>
              <div>난이도: ${difficulty}</div>
            </div>
          `,
          borderColor: color,
          borderWidth: 2,
          anchorSize: new naver.maps.Size(10, 10),
        });
        infoWindow.open(map, e.coord);
      });

      coursePolylinesRef.current.push(polyline);
    });

    if (!selectedTrail) {
      map.fitBounds(bounds, { top: 60, right: 50, bottom: 50, left: 50 });
    }
  }, [mapReady, trails, selectedTrail, lat, lng]);

  // Emphasize selected trail with start/end markers + zoom
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    selectedOverlaysRef.current.forEach((o) => o.setMap?.(null));
    selectedOverlaysRef.current = [];

    if (!selectedTrail) return;

    const coords = extractFirstLine(selectedTrail.geometry);
    if (!coords || coords.length === 0) {
      map.setCenter(new naver.maps.LatLng(lat, lng));
      return;
    }

    const path = coords
      .filter((pt) => Array.isArray(pt) && pt.length >= 2)
      .map(([lng_, lat_]) => new naver.maps.LatLng(lat_, lng_));
    if (path.length < 2) return;

    const startMarker = new naver.maps.Marker({
      position: path[0],
      map,
      icon: {
        content: `<div style="background:#4a8f3f;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">출발</div>`,
        anchor: new naver.maps.Point(20, 15),
      },
      zIndex: 150,
    });
    selectedOverlaysRef.current.push(startMarker);

    const endMarker = new naver.maps.Marker({
      position: path[path.length - 1],
      map,
      icon: {
        content: `<div style="background:#e53e3e;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">▲ 도착</div>`,
        anchor: new naver.maps.Point(25, 15),
      },
      zIndex: 150,
    });
    selectedOverlaysRef.current.push(endMarker);

    const bounds = new naver.maps.LatLngBounds(path[0], path[0]);
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 60, right: 50, bottom: 60, left: 50 });
  }, [mapReady, selectedTrail, lat, lng]);

  const noGeometry = !!selectedTrail && !extractFirstLine(selectedTrail.geometry)?.length;
  const hasAnyTrail = trails.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <MapIcon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">등산 루트 지도</h2>
          <p className="text-xs text-muted-foreground">
            {selectedTrail ? selectedTrail.name : "코스를 선택하면 루트가 강조됩니다"}
          </p>
        </div>
      </div>

      {noGeometry && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />이 코스의 GPS 루트는 준비 중입니다
        </div>
      )}

      <div className="relative">
        <div
          ref={mapRef}
          className="naver-map-container h-[350px] rounded-xl border border-border overflow-hidden"
        />
      </div>

      {/* 코스 범례 */}
      {hasAnyTrail && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
          <div className="text-xs font-semibold text-foreground mb-1.5">코스 범례</div>
          {trails.map((trail, idx) => {
            const hasGeo = !!extractFirstLine(trail.geometry)?.length;
            const color = hasGeo ? getCourseColor(idx) : NO_GEOMETRY_COLOR;
            return (
              <div
                key={trail.id}
                className="flex items-center gap-2 text-xs text-foreground"
              >
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0"
                  style={{ background: color }}
                />
                <span className="font-medium truncate">{trail.name}</span>
                {hasGeo ? (
                  <>
                    {trail.distance_km != null && (
                      <span className="text-muted-foreground">· {trail.distance_km}km</span>
                    )}
                    {trail.difficulty && (
                      <span className="text-muted-foreground">· {trail.difficulty}</span>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground ml-auto">경로 준비 중</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
