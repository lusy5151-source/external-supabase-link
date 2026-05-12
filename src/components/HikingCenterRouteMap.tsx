import { useEffect, useRef, useState } from "react";
import { Info, Loader2 } from "lucide-react";
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

const ROUTE_STROKE = "#FF6B35";
const COLOR_START = "#22C55E";
const COLOR_BRANCH = "#FF6B35";
const COLOR_SUMMIT = "#B45309";

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

function numberedPin(num: number, color: string, label?: string, big = false) {
  const size = big ? 32 : 26;
  const fontSize = big ? 14 : 12;
  return `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
    ${label ? `<div style="background:white;color:#1f2937;padding:2px 7px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);border:1px solid #e5e7eb;margin-bottom:3px;">${label}</div>` : ""}
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:800;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${num}</div>
  </div>`;
}

export function HikingCenterRouteMap({ mountainName, lat, lng }: HikingCenterRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

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
      zoom: 14,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: false,
      scaleControl: false,
      mapDataControl: false,
      logoControl: true,
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

  const selected = rows[selectedIdx] ?? null;

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

    if (naverPath.length >= 2) {
      const polyline = new naver.maps.Polyline({
        map,
        path: naverPath,
        strokeColor: ROUTE_STROKE,
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

    // Branch markers
    const places = Array.isArray(selected.kakao_nearby_places) ? selected.kakao_nearby_places : [];
    const branches = places
      .map((p: any) => {
        const la = Number(p?.lat);
        const ln = Number(p?.lng);
        if (!isFinite(la) || !isFinite(ln)) return null;
        return { lat: la, lng: ln, name: String(p?.name ?? "") };
      })
      .filter(Boolean) as Array<{ lat: number; lng: number; name: string }>;

    let n = 1;

    // Start = 1
    pushMarker(selected.start_lat, selected.start_lng, numberedPin(n, COLOR_START, "출발"), 150);
    n++;

    // Branches
    branches.forEach((b) => {
      const num = n;
      pushMarker(b.lat, b.lng, numberedPin(num, COLOR_BRANCH), 120, () => {
        const iw = new naver.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;font-weight:600;">${b.name}</div>`,
          borderWidth: 1,
          anchorSize: new naver.maps.Size(8, 8),
        });
        iw.open(map, new naver.maps.LatLng(b.lat, b.lng));
      });
      n++;
    });

    // Summit = last
    const summitLabel = `${selected.summit_name ?? mountainName}${
      selected.summit_elevation_m != null ? ` ${selected.summit_elevation_m}m` : ""
    }`;
    pushMarker(
      selected.summit_lat,
      selected.summit_lng,
      numberedPin(n, COLOR_SUMMIT, summitLabel, true),
      200
    );

    // Fit bounds with min zoom 13
    const allPts: Array<[number, number]> = [...path];
    if (selected.start_lat != null && selected.start_lng != null) allPts.push([selected.start_lat, selected.start_lng]);
    if (selected.end_lat != null && selected.end_lng != null) allPts.push([selected.end_lat, selected.end_lng]);
    if (selected.summit_lat != null && selected.summit_lng != null) allPts.push([selected.summit_lat, selected.summit_lng]);
    branches.forEach((b) => allPts.push([b.lat, b.lng]));

    if (allPts.length > 0) {
      const first = new naver.maps.LatLng(allPts[0][0], allPts[0][1]);
      const bounds = new naver.maps.LatLngBounds(first, first);
      allPts.forEach(([la, ln]) => bounds.extend(new naver.maps.LatLng(la, ln)));
      map.fitBounds(bounds, { top: 40, right: 30, bottom: 40, left: 30 });
      // Enforce min zoom 13 after fitBounds settles
      window.setTimeout(() => {
        try {
          const z = map.getZoom?.();
          if (typeof z === "number" && z < 13) map.setZoom(13, true);
        } catch {}
      }, 80);
    } else {
      map.setCenter(new naver.maps.LatLng(lat, lng));
    }
  }, [mapReady, selected, mountainName, lat, lng]);

  const hasCourses = rows.length > 0;

  return (
    <div className="space-y-2">
      {/* Course tabs */}
      {hasCourses && rows.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r, idx) => {
            const active = idx === selectedIdx;
            return (
              <button
                key={`${r.trail_name}-${idx}`}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
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
          className="naver-map-container h-[380px] rounded-xl border border-border overflow-hidden"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {!loading && !hasCourses && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />이 산의 코스 데이터는 준비 중입니다
        </div>
      )}
    </div>
  );
}
