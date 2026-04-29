import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Info } from "lucide-react";

interface TrailGeometry {
  type?: string;
  coordinates?: number[][] | number[][][];
}

interface TrailDetailMapProps {
  geometry: TrailGeometry | null | undefined;
  difficulty: string | null | undefined;
  waypoints?: string | null;
}

function getColorByDifficulty(difficulty: string | null | undefined): string {
  switch (difficulty) {
    case "쉬움": return "#40B37C";
    case "보통": return "#F4A261";
    case "어려움": return "#E76F51";
    default:     return "#457B9D";
  }
}

function extractFirstLine(geometry?: TrailGeometry | null): number[][] | null {
  if (!geometry || !geometry.coordinates) return null;
  const c = geometry.coordinates as any;
  if (geometry.type === "LineString" && Array.isArray(c)) return c as number[][];
  if (geometry.type === "MultiLineString" && Array.isArray(c) && Array.isArray(c[0])) {
    return c[0] as number[][];
  }
  if (Array.isArray(c) && Array.isArray(c[0]) && typeof c[0][0] === "number") {
    return c as number[][];
  }
  return null;
}

function parseWaypoints(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|,|·|\u00B7/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TrailDetailMap({ geometry, difficulty, waypoints }: TrailDetailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const path = extractFirstLine(geometry)?.filter(
    (pt) => Array.isArray(pt) && pt.length >= 2
  );
  const hasPath = !!path && path.length >= 2;
  const wpList = parseWaypoints(waypoints);

  // Init map
  useEffect(() => {
    if (!hasPath) return;
    if (!mapRef.current) return;
    if (!window.naver?.maps) return;
    const naver = window.naver;

    const first = path![0];
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(first[1], first[0]),
      zoom: 13,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
    });
    mapInstanceRef.current = map;

    const initListener = naver.maps.Event.addListener(map, "init", () => {
      setMapReady(true);
    });
    const fallbackTimer = window.setTimeout(() => setMapReady(true), 300);

    return () => {
      window.clearTimeout(fallbackTimer);
      try { naver.maps.Event.removeListener(initListener); } catch {}
      overlaysRef.current.forEach((o) => o.setMap?.(null));
      overlaysRef.current = [];
      mapInstanceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPath]);

  // Draw polyline + markers + waypoints
  useEffect(() => {
    if (!mapReady) return;
    if (!hasPath) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];

    const color = getColorByDifficulty(difficulty);
    const naverPath = path!.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

    // Polyline
    const polyline = new naver.maps.Polyline({
      map,
      path: naverPath,
      strokeColor: color,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      strokeStyle: "solid",
      zIndex: 50,
    });
    overlaysRef.current.push(polyline);

    // Start marker ▶ 출발
    const startMarker = new naver.maps.Marker({
      position: naverPath[0],
      map,
      icon: {
        content: `<div style="display:flex;align-items:center;gap:4px;background:#2D6A4F;color:white;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:translate(-50%,-50%);">▶ 출발</div>`,
        anchor: new naver.maps.Point(0, 0),
      },
      zIndex: 150,
    });
    overlaysRef.current.push(startMarker);

    // End marker 🏁 도착
    const endMarker = new naver.maps.Marker({
      position: naverPath[naverPath.length - 1],
      map,
      icon: {
        content: `<div style="display:flex;align-items:center;gap:4px;background:#9B2226;color:white;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:translate(-50%,-50%);">🏁 도착</div>`,
        anchor: new naver.maps.Point(0, 0),
      },
      zIndex: 150,
    });
    overlaysRef.current.push(endMarker);

    // Waypoints — distribute evenly along the path (no coords available)
    if (wpList.length > 0 && naverPath.length > 2) {
      const step = naverPath.length / (wpList.length + 1);
      wpList.forEach((label, i) => {
        const idx = Math.min(naverPath.length - 1, Math.max(1, Math.floor(step * (i + 1))));
        const pos = naverPath[idx];

        const wpMarker = new naver.maps.Marker({
          position: pos,
          map,
          icon: {
            content: `
              <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
                <div style="background:white;color:#374151;padding:2px 6px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);border:1px solid #e5e7eb;margin-bottom:2px;max-width:140px;overflow:hidden;text-overflow:ellipsis;">
                  ${label}
                </div>
                <div style="width:10px;height:10px;background:#6b7280;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
              </div>
            `,
            anchor: new naver.maps.Point(0, 0),
          },
          zIndex: 100,
        });
        overlaysRef.current.push(wpMarker);
      });
    }

    // fitBounds — track manually to avoid LatLngBounds.isEmpty()
    const bounds = new naver.maps.LatLngBounds(naverPath[0], naverPath[0]);
    naverPath.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 50, right: 40, bottom: 50, left: 40 });
  }, [mapReady, difficulty, waypoints, path?.length]);

  // No geometry — show placeholder
  if (!hasPath) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">코스 경로</h2>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-10 text-sm text-muted-foreground">
          <Info className="h-4 w-4" /> 코스 경로 데이터 준비 중
        </div>
        {wpList.length > 0 && (
          <div className="rounded-xl bg-muted/30 p-3 space-y-1">
            <div className="text-xs font-semibold text-foreground mb-1">분기점</div>
            <ol className="list-decimal list-inside text-xs text-foreground space-y-0.5">
              {wpList.map((w, i) => <li key={i}>{w}</li>)}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <MapIcon className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">코스 경로</h2>
      </div>
      <div
        ref={mapRef}
        className="naver-map-container h-[280px] rounded-xl border border-border overflow-hidden"
      />
      {wpList.length > 0 && (
        <div className="rounded-xl bg-muted/30 p-3 space-y-1">
          <div className="text-xs font-semibold text-foreground mb-1">분기점</div>
          <div className="flex flex-wrap gap-1.5">
            {wpList.map((w, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 text-[11px] text-foreground"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
