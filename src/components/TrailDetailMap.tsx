import { useEffect, useRef, useState, useMemo } from "react";
import { Map as MapIcon } from "lucide-react";

interface TrailGeometry {
  type?: string;
  coordinates?: number[][] | number[][][];
}

export type WaypointType = "start" | "end" | "branch" | "waypoint";

export interface WaypointItem {
  no?: number;
  name?: string;
  type?: WaypointType | string;
  lat?: number;
  lng?: number;
}

export interface RouteSegment {
  difficulty?: "easy" | "medium" | "hard" | string;
  coordinates?: number[][]; // [[lng, lat], ...]
}

interface TrailDetailMapProps {
  geometry: TrailGeometry | null | undefined;
  difficulty: string | null | undefined;
  waypoints?: string | null;
  mountainLat?: number | null;
  mountainLng?: number | null;
  waypointsJson?: WaypointItem[] | null;
  routeSegments?: RouteSegment[] | null;
}

const WAYPOINT_COLORS: Record<string, string> = {
  start: "#22C55E",
  end: "#EF4444",
  branch: "#F97316",
  waypoint: "#8B5CF6",
};

const SEGMENT_COLORS: Record<string, string> = {
  easy: "#22C55E",
  medium: "#F97316",
  hard: "#EF4444",
};

function getColorByDifficulty(difficulty: string | null | undefined): string {
  switch (difficulty) {
    case "쉬움": return "#22C55E";
    case "보통": return "#F97316";
    case "어려움": return "#EF4444";
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

function normalizeWaypointsJson(raw: any): WaypointItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w, i) => ({
      no: typeof w?.no === "number" ? w.no : i + 1,
      name: w?.name ?? "",
      type: (w?.type as string) ?? "waypoint",
      lat: typeof w?.lat === "number" ? w.lat : undefined,
      lng: typeof w?.lng === "number" ? w.lng : undefined,
    }))
    .filter((w) => w.name);
}

function normalizeSegments(raw: any): RouteSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      difficulty: (s?.difficulty as string) ?? "medium",
      coordinates: Array.isArray(s?.coordinates) ? (s.coordinates as number[][]) : [],
    }))
    .filter((s) => Array.isArray(s.coordinates) && s.coordinates.length >= 2);
}

export function TrailDetailMap({
  geometry,
  difficulty,
  waypoints,
  mountainLat,
  mountainLng,
  waypointsJson,
  routeSegments,
}: TrailDetailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const placeholderMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const placeholderMapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<"NORMAL" | "TERRAIN">("TERRAIN");

  const path = extractFirstLine(geometry)?.filter(
    (pt) => Array.isArray(pt) && pt.length >= 2
  );
  const hasPath = !!path && path.length >= 2;
  const wpList = parseWaypoints(waypoints);

  const wpJson = useMemo(() => normalizeWaypointsJson(waypointsJson), [waypointsJson]);
  const segments = useMemo(() => normalizeSegments(routeSegments), [routeSegments]);
  const hasWpJson = wpJson.length > 0;
  const hasSegments = segments.length > 0;

  // Sync map type toggle
  useEffect(() => {
    const map = mapInstanceRef.current || placeholderMapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    map.setMapTypeId(window.naver.maps.MapTypeId[mapType]);
  }, [mapType]);

  // Init map (with path)
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

  // Init placeholder map (no path)
  useEffect(() => {
    if (hasPath) return;
    if (!placeholderMapRef.current) return;
    if (!window.naver?.maps) return;
    if (typeof mountainLat !== "number" || typeof mountainLng !== "number") return;
    const naver = window.naver;

    const map = new naver.maps.Map(placeholderMapRef.current, {
      center: new naver.maps.LatLng(mountainLat, mountainLng),
      zoom: 13,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
    });
    placeholderMapInstanceRef.current = map;

    return () => {
      placeholderMapInstanceRef.current = null;
    };
  }, [hasPath, mountainLat, mountainLng]);

  // Draw polyline(s) + markers
  useEffect(() => {
    if (!mapReady) return;
    if (!hasPath) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];

    const naverPath = path!.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

    // --- Route lines: segments OR single line ---
    if (hasSegments) {
      segments.forEach((seg) => {
        const segPath = (seg.coordinates || [])
          .filter((pt) => Array.isArray(pt) && pt.length >= 2)
          .map(([lng, lat]) => new naver.maps.LatLng(lat, lng));
        if (segPath.length < 2) return;
        const color = SEGMENT_COLORS[seg.difficulty as string] || "#457B9D";
        const polyline = new naver.maps.Polyline({
          map,
          path: segPath,
          strokeColor: color,
          strokeWeight: 5,
          strokeOpacity: 0.95,
          strokeStyle: "solid",
          zIndex: 50,
        });
        overlaysRef.current.push(polyline);
      });
    } else {
      const color = getColorByDifficulty(difficulty);
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
    }

    // --- Markers: numbered waypoints OR fallback start/end ---
    if (hasWpJson) {
      wpJson.forEach((wp, i) => {
        const typeKey = (wp.type as string) || "waypoint";
        const color = WAYPOINT_COLORS[typeKey] || WAYPOINT_COLORS.waypoint;
        const num = wp.no ?? i + 1;

        // Resolve position: explicit lat/lng, else best-fit along path
        let pos: any = null;
        if (typeof wp.lat === "number" && typeof wp.lng === "number") {
          pos = new naver.maps.LatLng(wp.lat, wp.lng);
        } else if (typeKey === "start") {
          pos = naverPath[0];
        } else if (typeKey === "end") {
          pos = naverPath[naverPath.length - 1];
        } else if (naverPath.length > 2 && wpJson.length > 1) {
          const ratio = i / Math.max(1, wpJson.length - 1);
          const idx = Math.min(naverPath.length - 1, Math.max(0, Math.round(ratio * (naverPath.length - 1))));
          pos = naverPath[idx];
        } else {
          pos = naverPath[Math.floor(naverPath.length / 2)];
        }
        if (!pos) return;

        const marker = new naver.maps.Marker({
          position: pos,
          map,
          icon: {
            content: `
              <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
                <div style="background:white;color:#374151;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);border:1px solid #e5e7eb;margin-bottom:3px;max-width:160px;overflow:hidden;text-overflow:ellipsis;">
                  ${(wp.name || "").replace(/</g, "&lt;")}
                </div>
                <div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;background:${color};color:white;border:2px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.35);font-size:12px;font-weight:800;line-height:1;">
                  ${num}
                </div>
              </div>
            `,
            anchor: new naver.maps.Point(0, 0),
          },
          zIndex: 150,
        });
        overlaysRef.current.push(marker);
      });
    } else {
      // Fallback: original start/end labels
      const startMarker = new naver.maps.Marker({
        position: naverPath[0],
        map,
        icon: {
          content: `<div style="display:flex;align-items:center;gap:4px;background:white;color:#16A34A;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15);transform:translate(-50%,-50%);border:1px solid #E5E7EB;">▶ 출발</div>`,
          anchor: new naver.maps.Point(0, 0),
        },
        zIndex: 150,
      });
      overlaysRef.current.push(startMarker);

      const endMarker = new naver.maps.Marker({
        position: naverPath[naverPath.length - 1],
        map,
        icon: {
          content: `<div style="display:flex;align-items:center;gap:4px;background:white;color:#DC2626;padding:5px 10px;border-radius:14px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15);transform:translate(-50%,-50%);border:1px solid #E5E7EB;">🏁 도착</div>`,
          anchor: new naver.maps.Point(0, 0),
        },
        zIndex: 150,
      });
      overlaysRef.current.push(endMarker);

      // Legacy text waypoints sprinkled along path
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
    }

    const bounds = new naver.maps.LatLngBounds(naverPath[0], naverPath[0]);
    naverPath.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 50, right: 40, bottom: 50, left: 40 });
  }, [mapReady, difficulty, waypoints, path?.length, hasWpJson, hasSegments, wpJson, segments]);

  const Legend = () =>
    hasSegments ? (
      <div className="flex flex-wrap items-center gap-3 px-1 pt-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full" style={{ background: SEGMENT_COLORS.easy }} />
          쉬움
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full" style={{ background: SEGMENT_COLORS.medium }} />
          보통
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full" style={{ background: SEGMENT_COLORS.hard }} />
          어려움
        </span>
      </div>
    ) : null;

  // ---- Course points list (timeline) ----
  const PointsList = () =>
    hasWpJson ? (
      <div className="rounded-xl bg-muted/30 p-4">
        <div className="text-xs font-semibold text-foreground mb-3">코스 포인트</div>
        <ol className="relative space-y-3">
          {wpJson.map((wp, i) => {
            const typeKey = (wp.type as string) || "waypoint";
            const color = WAYPOINT_COLORS[typeKey] || WAYPOINT_COLORS.waypoint;
            const isLast = i === wpJson.length - 1;
            return (
              <li key={i} className="relative flex items-start gap-3">
                <div className="relative flex flex-col items-center">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow"
                    style={{ background: color }}
                  >
                    {wp.no ?? i + 1}
                  </div>
                  {!isLast && (
                    <div className="mt-1 w-0.5 flex-1 bg-border" style={{ minHeight: 18 }} />
                  )}
                </div>
                <div className="flex flex-1 items-center gap-2 pt-1">
                  <span className="text-sm font-medium text-foreground">
                    {wp.no ?? i + 1}. {wp.name}
                  </span>
                  {typeKey === "start" && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      출발
                    </span>
                  )}
                  {typeKey === "end" && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      도착
                    </span>
                  )}
                  {typeKey === "branch" && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      분기점
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    ) : wpList.length > 0 ? (
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
    ) : null;

  // No geometry — placeholder map
  if (!hasPath) {
    return (
      <div style={{ background: "white", borderRadius: 18, padding: 12, margin: "0 12px 8px" }}>
        <h2 style={{
          fontSize: 12, fontWeight: 600, color: "#173404",
          borderLeft: "2.5px solid #c6d56c", paddingLeft: 8, marginBottom: 10,
        }}>코스 경로</h2>
        <div className="relative">
          <div
            ref={placeholderMapRef}
            className="naver-map-container"
            style={{ height: 220, borderRadius: 12, overflow: "hidden" }}
          />
          <div className="absolute top-2 right-2 z-10 flex rounded-lg overflow-hidden shadow-md" style={{ border: "0.5px solid #e3efcc", background: "white" }}>
            {(["NORMAL", "TERRAIN"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMapType(t)}
                className="px-2.5 py-1 text-xs font-semibold transition-colors"
                style={mapType === t
                  ? { background: "#c6d56c", color: "#173404" }
                  : { background: "white", color: "#444" }}
              >
                {t === "NORMAL" ? "일반" : "지형도"}
              </button>
            ))}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-background/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground shadow-md border border-border">
            등산로는 지형도에서 확인하세요 🗺️
          </div>
        </div>
        <PointsList />
      </div>
    );
  }

  return (
    <div style={{ background: "white", borderRadius: 18, padding: 12, margin: "0 12px 8px" }}>
      <h2 style={{
        fontSize: 12, fontWeight: 600, color: "#173404",
        borderLeft: "2.5px solid #c6d56c", paddingLeft: 8, marginBottom: 10,
      }}>코스 경로</h2>
      <div className="relative">
        <div
          ref={mapRef}
          className="naver-map-container"
          style={{ height: 220, borderRadius: 12, overflow: "hidden" }}
        />
        <div className="absolute top-2 right-2 z-10 flex rounded-lg overflow-hidden shadow-md" style={{ border: "0.5px solid #e3efcc", background: "white" }}>
          {(["NORMAL", "TERRAIN"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMapType(t)}
              className="px-2.5 py-1 text-xs font-semibold transition-colors"
              style={mapType === t
                ? { background: "#c6d56c", color: "#173404" }
                : { background: "white", color: "#444" }}
            >
              {t === "NORMAL" ? "일반" : "지형도"}
            </button>
          ))}
        </div>
      </div>
      <Legend />
      <PointsList />
    </div>
  );
}
