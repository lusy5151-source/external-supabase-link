import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNaverMaps } from "@/lib/naverMaps";

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
  coordinates?: number[][];
}

interface TrailDetailMapProps {
  geometry: TrailGeometry | null | undefined;
  difficulty: string | null | undefined;
  waypoints?: string | null;
  mountainName?: string | null;
  mountainLat?: number | null;
  mountainLng?: number | null;
  waypointsJson?: WaypointItem[] | null;
  routeSegments?: RouteSegment[] | null;
}

interface PeakRoute {
  summit_name: string | null;
  summit_lat: number | null;
  summit_lng: number | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  route_coordinates: any;
  summit_elevation_m: number | null;
  kakao_nearby_places: any;
}

const POLYLINE_COLOR = "#FF6B35";
const COLOR_START = "#22C55E";
const COLOR_END = "#EF4444";
const COLOR_SUMMIT_BG = "#2F403A";
const COLOR_BRANCH = "#6B7280";

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

function toLatLngArray(rc: any): Array<[number, number]> {
  if (!Array.isArray(rc)) return [];
  return rc
    .map((p: any) => {
      if (!Array.isArray(p) || p.length < 2) return null;
      const lat = Number(p[0]);
      const lng = Number(p[1]);
      if (!isFinite(lat) || !isFinite(lng)) return null;
      return [lat, lng] as [number, number];
    })
    .filter(Boolean) as Array<[number, number]>;
}

function distSq(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = a.lat - b.lat, dy = a.lng - b.lng;
  return dx * dx + dy * dy;
}

function pinHTML(color: string, label: string) {
  return `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
    <div style="background:white;color:${color};padding:3px 9px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);border:1.5px solid ${color};margin-bottom:3px;">${label}</div>
    <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
  </div>`;
}

function summitPinHTML(label: string) {
  return `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
    <div style="background:${COLOR_SUMMIT_BG};color:white;padding:4px 10px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-bottom:3px;">⛰ ${label}</div>
    <div style="width:30px;height:30px;border-radius:50%;background:${COLOR_SUMMIT_BG};display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7D66D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
    </div>
  </div>`;
}

function branchDotHTML() {
  return `<div style="transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:${COLOR_BRANCH};border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3);cursor:pointer;"></div>`;
}

export function TrailDetailMap({
  geometry,
  mountainName,
  mountainLat,
  mountainLng,
}: TrailDetailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const sdkReady = useNaverMaps();
  const [route, setRoute] = useState<PeakRoute | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  // Fallback geometry path as [lat,lng]
  const geomPath = useMemo<Array<[number, number]>>(() => {
    const g = extractFirstLine(geometry);
    if (!g) return [];
    return g
      .filter((pt) => Array.isArray(pt) && pt.length >= 2)
      .map(([lng, lat]) => [Number(lat), Number(lng)] as [number, number])
      .filter(([la, ln]) => isFinite(la) && isFinite(ln));
  }, [geometry]);

  // Fetch hiking_center_peaks for this mountain, pick best match
  useEffect(() => {
    if (!mountainName) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("hiking_center_peaks")
          .select("summit_name, summit_lat, summit_lng, start_lat, start_lng, end_lat, end_lng, route_coordinates, summit_elevation_m, kakao_nearby_places")
          .eq("peak_name", mountainName);
        if (cancelled) return;
        if (error || !Array.isArray(data) || data.length === 0) {
          setRoute(null);
          return;
        }
        // Pick row whose start is closest to geometry start; else first
        let pick: any = data[0];
        const geomStart = geomPath[0];
        if (geomStart) {
          let bestD = Infinity;
          data.forEach((r: any) => {
            if (typeof r?.start_lat === "number" && typeof r?.start_lng === "number") {
              const d = distSq(
                { lat: geomStart[0], lng: geomStart[1] },
                { lat: r.start_lat, lng: r.start_lng }
              );
              if (d < bestD) { bestD = d; pick = r; }
            }
          });
        }
        setRoute(pick as PeakRoute);
      } catch (error) {
        if (!cancelled) {
          console.warn("[TrailDetailMap] route fetch failed", error);
          setRoute(null);
          }
      }
    })();
    return () => { cancelled = true; };
  }, [mountainName, geomPath]);

  const path: Array<[number, number]> = useMemo(() => {
    const fromRoute = toLatLngArray(route?.route_coordinates);
    return fromRoute.length >= 2 ? fromRoute : geomPath;
  }, [route, geomPath]);

  const hasPath = path.length >= 2;
  const hasAnyAnchor =
    hasPath ||
    (typeof mountainLat === "number" && typeof mountainLng === "number");

  // Init map
  useEffect(() => {
    setMapUnavailable(false);
    if (!sdkReady) return;
    if (!hasAnyAnchor) return;
    if (!mapRef.current) return;
    if (!window.naver?.maps) return;
    const naver = window.naver;
    let initListener: any = null;
    let fallbackTimer: number | null = null;
    try {
      const center = hasPath
        ? new naver.maps.LatLng(path[0][0], path[0][1])
        : new naver.maps.LatLng(mountainLat as number, mountainLng as number);

      const map = new naver.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        minZoom: 12,
        maxZoom: 17,
        mapTypeId: naver.maps.MapTypeId.TERRAIN,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
          style: naver.maps.ZoomControlStyle.SMALL,
        },
        scaleControl: true,
        mapDataControl: false,
        logoControl: true,
        mapTypeControl: false,
      });
      mapInstanceRef.current = map;

      initListener = naver.maps.Event.addListener(map, "init", () => setMapReady(true));
      fallbackTimer = window.setTimeout(() => setMapReady(true), 300);
    } catch (error) {
      console.warn("[TrailDetailMap] map init failed", error);
      setMapUnavailable(true);
    }

    return () => {
      if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
      try { if (initListener) naver.maps.Event.removeListener(initListener); } catch {}
      overlaysRef.current.forEach((o) => o.setMap?.(null));
      overlaysRef.current = [];
      mapInstanceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnyAnchor, sdkReady]);

  // Draw route + markers
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];

    const allPts: Array<[number, number]> = [];

    if (hasPath) {
      const naverPath = path.map(([la, ln]) => new naver.maps.LatLng(la, ln));
      const polyline = new naver.maps.Polyline({
        map,
        path: naverPath,
        strokeColor: POLYLINE_COLOR,
        strokeWeight: 5,
        strokeOpacity: 0.95,
        strokeStyle: "solid",
        strokeLineCap: "round",
        strokeLineJoin: "round",
        zIndex: 50,
      });
      overlaysRef.current.push(polyline);
      path.forEach((p) => allPts.push(p));
    }

    // Start marker
    const sLat = route?.start_lat ?? (hasPath ? path[0][0] : null);
    const sLng = route?.start_lng ?? (hasPath ? path[0][1] : null);
    if (sLat != null && sLng != null) {
      const m = new naver.maps.Marker({
        position: new naver.maps.LatLng(sLat, sLng),
        map,
        icon: { content: pinHTML(COLOR_START, "출발"), anchor: new naver.maps.Point(0, 0) },
        zIndex: 200,
      });
      overlaysRef.current.push(m);
      allPts.push([sLat, sLng]);
    }

    // End marker
    const eLat = route?.end_lat ?? (hasPath ? path[path.length - 1][0] : null);
    const eLng = route?.end_lng ?? (hasPath ? path[path.length - 1][1] : null);
    if (eLat != null && eLng != null) {
      const m = new naver.maps.Marker({
        position: new naver.maps.LatLng(eLat, eLng),
        map,
        icon: { content: pinHTML(COLOR_END, "도착"), anchor: new naver.maps.Point(0, 0) },
        zIndex: 200,
      });
      overlaysRef.current.push(m);
      allPts.push([eLat, eLng]);
    }

    // Summit marker
    if (route?.summit_lat != null && route?.summit_lng != null) {
      const label = `${route.summit_name ?? mountainName ?? "정상"}${
        route.summit_elevation_m != null ? ` ${Math.round(route.summit_elevation_m)}m` : ""
      }`;
      const m = new naver.maps.Marker({
        position: new naver.maps.LatLng(route.summit_lat, route.summit_lng),
        map,
        icon: { content: summitPinHTML(label), anchor: new naver.maps.Point(0, 0) },
        zIndex: 250,
      });
      overlaysRef.current.push(m);
      allPts.push([route.summit_lat, route.summit_lng]);
    }

    // Branch markers
    const places = Array.isArray(route?.kakao_nearby_places) ? route!.kakao_nearby_places : [];
    places.forEach((p: any) => {
      const la = Number(p?.lat); const ln = Number(p?.lng);
      if (!isFinite(la) || !isFinite(ln)) return;
      const mk = new naver.maps.Marker({
        position: new naver.maps.LatLng(la, ln),
        map,
        icon: { content: branchDotHTML(), anchor: new naver.maps.Point(0, 0) },
        zIndex: 80,
        title: String(p?.name ?? ""),
      });
      naver.maps.Event.addListener(mk, "click", () => {
        const iw = new naver.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-size:11px;color:${COLOR_SUMMIT_BG};">${String(p?.name ?? "")}</div>`,
          borderWidth: 1,
          anchorSize: new naver.maps.Size(6, 6),
        });
        iw.open(map, new naver.maps.LatLng(la, ln));
      });
      overlaysRef.current.push(mk);
      allPts.push([la, ln]);
    });

    if (allPts.length > 0) {
      const first = new naver.maps.LatLng(allPts[0][0], allPts[0][1]);
      const bounds = new naver.maps.LatLngBounds(first, first);
      allPts.forEach(([la, ln]) => bounds.extend(new naver.maps.LatLng(la, ln)));
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
    }
  }, [mapReady, path, route, hasPath, mountainName]);

  if (!hasAnyAnchor) {
    return (
      <div style={{ background: "white", borderRadius: 18, padding: 12, margin: "0 12px 8px" }}>
        <h2 style={{
          fontSize: 12, fontWeight: 600, color: "#173404",
          borderLeft: "2.5px solid #c6d56c", paddingLeft: 8, marginBottom: 10,
        }}>코스 경로</h2>
        <div className="rounded-xl bg-muted/50 px-3 py-6 text-center text-xs text-muted-foreground">
          이 코스의 경로 데이터는 준비 중입니다
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "white", borderRadius: 18, padding: 12, margin: "0 12px 8px" }}>
      <h2 style={{
        fontSize: 12, fontWeight: 600, color: "#173404",
        borderLeft: "2.5px solid #c6d56c", paddingLeft: 8, marginBottom: 10,
      }}>코스 경로</h2>
      {mapUnavailable ? (
        <div
          className="rounded-xl px-3 py-8 text-center text-xs text-muted-foreground"
          style={{ background: "#F8FAED" }}
        >
          지도를 잠시 불러오지 못했어요. 아래 코스 정보는 계속 확인할 수 있어요.
        </div>
      ) : (
        <div
          ref={mapRef}
          className="naver-map-container"
          style={{ height: 280, borderRadius: 12, overflow: "hidden" }}
        />
      )}
    </div>
  );
}
