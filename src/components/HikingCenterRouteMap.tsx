import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapIcon, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HikingCenterRouteMapProps {
  mountainName: string;
  /** Fallback center when no route data is available */
  lat: number;
  lng: number;
}

interface PeakRow {
  trail_name: string | null;
  summit_name: string | null;
  summit_lat: number | null;
  summit_lng: number | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  route_coordinates: any;
  kakao_nearby_places: any;
  summit_elevation_m: number | null;
  elevation_gain_m: number | null;
}

const ROUTE_COLORS = ["#C7D66D", "#013F92", "#FF696C", "#C2B6DE", "#2F403A"];

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

export function HikingCenterRouteMap({ mountainName, lat, lng }: HikingCenterRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<"NORMAL" | "TERRAIN">("TERRAIN");

  const [rows, setRows] = useState<PeakRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Fetch courses for this mountain
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("hiking_center_peaks")
        .select(
          "trail_name, summit_name, summit_lat, summit_lng, start_lat, start_lng, end_lat, end_lng, route_coordinates, kakao_nearby_places, summit_elevation_m, elevation_gain_m"
        )
        .eq("peak_name", mountainName)
        .order("trail_name", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.warn("[HikingCenterRouteMap] fetch error", error);
        setRows([]);
      } else {
        setRows((data ?? []) as PeakRow[]);
      }
      setSelectedIdx(0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mountainName]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(lat, lng),
      zoom: 13,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
    });
    mapInstanceRef.current = map;
    const initListener = naver.maps.Event.addListener(map, "init", () => setMapReady(true));
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
  }, [lat, lng]);

  // Toggle map type
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    map.setMapTypeId(window.naver.maps.MapTypeId[mapType]);
  }, [mapType]);

  const selected = rows[selectedIdx] ?? null;
  const color = ROUTE_COLORS[selectedIdx % ROUTE_COLORS.length];

  // Render selected course
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];

    if (!selected) return;

    const path = toLatLngArray(selected.route_coordinates);
    const naverPath = path.map(([la, ln]) => new naver.maps.LatLng(la, ln));

    // Polyline
    if (naverPath.length >= 2) {
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

    const pushMarker = (
      la: number | null,
      ln: number | null,
      content: string,
      z = 100,
      onClick?: () => void
    ) => {
      if (la == null || ln == null || !isFinite(la) || !isFinite(ln)) return;
      const m = new naver.maps.Marker({
        position: new naver.maps.LatLng(la, ln),
        map,
        icon: { content, anchor: new naver.maps.Point(0, 0) },
        zIndex: z,
      });
      if (onClick) naver.maps.Event.addListener(m, "click", onClick);
      overlaysRef.current.push(m);
    };

    // Start marker (green)
    pushMarker(
      selected.start_lat,
      selected.start_lng,
      `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
         <div style="background:#4a8f3f;color:white;padding:4px 9px;border-radius:12px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">출발</div>
         <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #4a8f3f;"></div>
       </div>`,
      150
    );

    // End marker (red)
    pushMarker(
      selected.end_lat,
      selected.end_lng,
      `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
         <div style="background:#e53e3e;color:white;padding:4px 9px;border-radius:12px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">도착</div>
         <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #e53e3e;"></div>
       </div>`,
      150
    );

    // Summit marker (orange)
    const summitLabel = `정상 ${selected.summit_name ?? mountainName}${
      selected.summit_elevation_m != null ? ` ${selected.summit_elevation_m}m` : ""
    }`;
    pushMarker(
      selected.summit_lat,
      selected.summit_lng,
      `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
         <div style="background:#f59e0b;color:white;padding:4px 9px;border-radius:12px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">⛰️ ${summitLabel}</div>
         <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #f59e0b;"></div>
       </div>`,
      200
    );

    // Branch markers from kakao_nearby_places (only items with lat/lng)
    const places = Array.isArray(selected.kakao_nearby_places) ? selected.kakao_nearby_places : [];
    places.forEach((p: any) => {
      const la = Number(p?.lat);
      const ln = Number(p?.lng);
      if (!isFinite(la) || !isFinite(ln)) return;
      const name = String(p?.name ?? "");
      const dot = `<div style="transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#6b7280;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;"></div>`;
      pushMarker(la, ln, dot, 80, () => {
        const iw = new naver.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;font-weight:600;">${name}</div>`,
          borderWidth: 1,
          anchorSize: new naver.maps.Size(8, 8),
        });
        iw.open(map, new naver.maps.LatLng(la, ln));
      });
    });

    // Fit bounds to route
    const allPts: Array<[number, number]> = [...path];
    if (selected.start_lat != null && selected.start_lng != null) allPts.push([selected.start_lat, selected.start_lng]);
    if (selected.end_lat != null && selected.end_lng != null) allPts.push([selected.end_lat, selected.end_lng]);
    if (selected.summit_lat != null && selected.summit_lng != null) allPts.push([selected.summit_lat, selected.summit_lng]);

    if (allPts.length > 0) {
      const first = new naver.maps.LatLng(allPts[0][0], allPts[0][1]);
      const bounds = new naver.maps.LatLngBounds(first, first);
      allPts.forEach(([la, ln]) => bounds.extend(new naver.maps.LatLng(la, ln)));
      map.fitBounds(bounds, { top: 60, right: 50, bottom: 60, left: 50 });
    } else {
      map.setCenter(new naver.maps.LatLng(lat, lng));
    }
  }, [mapReady, selected, color, mountainName, lat, lng]);

  const hasCourses = rows.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <MapIcon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">등산 루트 지도</h2>
          <p className="text-xs text-muted-foreground">
            {hasCourses
              ? `총 ${rows.length}개 코스 · ${selected?.trail_name ?? ""}`
              : loading
              ? "코스 정보를 불러오는 중..."
              : "등록된 코스 정보가 없습니다"}
          </p>
        </div>
      </div>

      {/* Course tabs */}
      {hasCourses && (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r, idx) => {
            const c = ROUTE_COLORS[idx % ROUTE_COLORS.length];
            const active = idx === selectedIdx;
            return (
              <button
                key={`${r.trail_name}-${idx}`}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "text-white border-transparent"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
                style={active ? { background: c } : { borderLeft: `3px solid ${c}` }}
              >
                {r.trail_name ?? `코스 ${idx + 1}`}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <div
          ref={mapRef}
          className="naver-map-container h-[350px] rounded-xl border border-border overflow-hidden"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10 flex rounded-lg overflow-hidden shadow-md border border-border bg-background">
          {(["NORMAL", "TERRAIN"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMapType(t)}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                mapType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              {t === "NORMAL" ? "일반" : "지형도"}
            </button>
          ))}
        </div>
      </div>

      {!loading && !hasCourses && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />이 산의 코스 데이터는 준비 중입니다
        </div>
      )}

      {/* Selected course summary */}
      {selected && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {selected.summit_elevation_m != null && (
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-muted-foreground">정상 고도</div>
              <div className="font-semibold text-foreground">{selected.summit_elevation_m}m</div>
            </div>
          )}
          {selected.elevation_gain_m != null && (
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-muted-foreground">고도 상승</div>
              <div className="font-semibold text-foreground">{Math.round(selected.elevation_gain_m)}m</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
