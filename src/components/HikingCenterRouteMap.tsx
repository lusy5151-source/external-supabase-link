import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, CalendarPlus, ChevronRight, Clock, Info, Loader2, Mountain, Ruler, Star, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HikingCenterRouteMapProps {
  mountainName: string;
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
  start_place_name: string | null;
  end_place_name: string | null;
  route_coordinates: any;
  kakao_nearby_places: any;
  summit_elevation_m: number | null;
  elevation_gain_m: number | null;
  total_distance_m: number | null;
}

const ROUTE_COLORS = ["#013F92", "#C7D66D", "#FF696C", "#C2B6DE", "#2F403A"];
const DARK_GREEN = "#2F403A";
const LIME = "#C7D66D";
const colorAt = (i: number) => ROUTE_COLORS[i % ROUTE_COLORS.length];

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

function startPin(num: number, color: string) {
  return `<div style="transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${num}</div>`;
}
function summitPin(label: string, elev: number | null) {
  const elevText = elev != null ? ` ${Math.round(elev)}m` : "";
  return `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
    <div style="background:white;color:${DARK_GREEN};padding:3px 9px;border-radius:9px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);border:1px solid ${LIME};margin-bottom:3px;">${label}${elevText}</div>
    <div style="width:30px;height:30px;border-radius:50%;background:${DARK_GREEN};display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${LIME}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
    </div>
  </div>`;
}
function branchDot() {
  return `<div style="transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:#9CA3AF;border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3);"></div>`;
}

function estimateDuration(distanceKm: number | null, gainM: number | null): number | null {
  if (distanceKm == null && gainM == null) return null;
  const d = distanceKm ?? 0;
  const g = gainM ?? 0;
  const m = Math.round(d * 20 + (g / 100) * 10);
  return m > 0 ? m : null;
}
function estimateDifficulty(distanceKm: number | null, gainM: number | null): "쉬움" | "보통" | "어려움" {
  const d = distanceKm ?? 0;
  const g = gainM ?? 0;
  const score = d * 1.2 + g / 150;
  if (score < 5) return "쉬움";
  if (score < 9) return "보통";
  return "어려움";
}
function fmtDuration(min: number | null): string {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간${m}분`;
}
function difficultyFg(d: string): string {
  if (d === "쉬움") return "#3F5C0E";
  if (d === "어려움") return "#B91C28";
  return "#92400E";
}

export function HikingCenterRouteMap({ mountainName, lat, lng }: HikingCenterRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const startMarkersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [rows, setRows] = useState<PeakRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("hiking_center_peaks")
        .select(
          "trail_name, summit_name, summit_lat, summit_lng, start_lat, start_lng, end_lat, end_lng, start_place_name, end_place_name, route_coordinates, kakao_nearby_places, summit_elevation_m, elevation_gain_m, total_distance_m"
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
    return () => { cancelled = true; };
  }, [mountainName]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(lat, lng),
      zoom: 14,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT, style: naver.maps.ZoomControlStyle.SMALL },
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
      polylinesRef.current.forEach((o) => o.setMap?.(null));
      startMarkersRef.current.forEach((o) => o.setMap?.(null));
      overlaysRef.current = [];
      polylinesRef.current = [];
      startMarkersRef.current = [];
      mapInstanceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Render ALL routes (multi-polyline)
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    // Clear
    overlaysRef.current.forEach((o) => o.setMap?.(null));
    polylinesRef.current.forEach((o) => o.setMap?.(null));
    startMarkersRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];
    polylinesRef.current = [];
    startMarkersRef.current = [];

    if (rows.length === 0) return;

    const allPts: Array<[number, number]> = [];

    rows.forEach((r, i) => {
      const color = colorAt(i);
      const path = toLatLngArray(r.route_coordinates);
      path.forEach((p) => allPts.push(p));

      if (path.length >= 2) {
        const naverPath = path.map(([la, ln]) => new naver.maps.LatLng(la, ln));
        const pl = new naver.maps.Polyline({
          map,
          path: naverPath,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: i === selectedIdx ? 1 : 0.4,
          strokeStyle: "solid",
          zIndex: i === selectedIdx ? 100 : 50,
          clickable: true,
        });
        naver.maps.Event.addListener(pl, "click", () => setSelectedIdx(i));
        polylinesRef.current.push(pl);
      }

      // Start marker (numbered, course color)
      if (r.start_lat != null && r.start_lng != null) {
        const m = new naver.maps.Marker({
          position: new naver.maps.LatLng(r.start_lat, r.start_lng),
          map,
          icon: { content: startPin(i + 1, color), anchor: new naver.maps.Point(0, 0) },
          zIndex: i === selectedIdx ? 200 : 150,
        });
        naver.maps.Event.addListener(m, "click", () => setSelectedIdx(i));
        startMarkersRef.current.push(m);
        allPts.push([r.start_lat, r.start_lng]);
      }
    });

    // Selected course extras: branches + summit
    const selected = rows[selectedIdx];
    if (selected) {
      const places = Array.isArray(selected.kakao_nearby_places) ? selected.kakao_nearby_places : [];
      places.forEach((p: any) => {
        const la = Number(p?.lat); const ln = Number(p?.lng);
        if (!isFinite(la) || !isFinite(ln)) return;
        const m = new naver.maps.Marker({
          position: new naver.maps.LatLng(la, ln),
          map,
          icon: { content: branchDot(), anchor: new naver.maps.Point(0, 0) },
          zIndex: 80,
        });
        naver.maps.Event.addListener(m, "click", () => {
          const iw = new naver.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:11px;color:${DARK_GREEN};">${String(p?.name ?? "")}</div>`,
            borderWidth: 1,
            anchorSize: new naver.maps.Size(6, 6),
          });
          iw.open(map, new naver.maps.LatLng(la, ln));
        });
        overlaysRef.current.push(m);
        allPts.push([la, ln]);
      });

      if (selected.summit_lat != null && selected.summit_lng != null) {
        const sm = new naver.maps.Marker({
          position: new naver.maps.LatLng(selected.summit_lat, selected.summit_lng),
          map,
          icon: {
            content: summitPin(selected.summit_name ?? mountainName, selected.summit_elevation_m),
            anchor: new naver.maps.Point(0, 0),
          },
          zIndex: 250,
        });
        overlaysRef.current.push(sm);
        allPts.push([selected.summit_lat, selected.summit_lng]);
      }
    }

    if (allPts.length > 0) {
      const first = new naver.maps.LatLng(allPts[0][0], allPts[0][1]);
      const bounds = new naver.maps.LatLngBounds(first, first);
      allPts.forEach(([la, ln]) => bounds.extend(new naver.maps.LatLng(la, ln)));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      window.setTimeout(() => {
        try {
          const z = map.getZoom?.();
          if (typeof z === "number" && z < 13) map.setZoom(13, true);
        } catch {}
      }, 80);
    }
  }, [mapReady, rows, selectedIdx, mountainName]);

  const cards = useMemo(() => rows.map((r, i) => {
    const color = colorAt(i);
    const distanceKm = r.total_distance_m != null ? Math.round(r.total_distance_m / 100) / 10 : null;
    const gainM = r.elevation_gain_m != null ? Math.round(r.elevation_gain_m) : null;
    const duration = estimateDuration(distanceKm, gainM);
    const difficulty = estimateDifficulty(distanceKm, gainM);
    const places = Array.isArray(r.kakao_nearby_places) ? r.kakao_nearby_places : [];
    const branchNames = places
      .map((p: any) => (p?.name && Number.isFinite(Number(p?.lat)) ? String(p.name) : null))
      .filter(Boolean) as string[];
    const start = r.start_place_name ?? "출발지";
    const end = r.end_place_name ?? r.summit_name ?? "도착";
    const middle = branchNames.slice(0, 2).join(" → ");
    const waypointText = middle ? `${start} → ${middle} → ${end}` : `${start} → ${end}`;
    return {
      idx: i, color,
      name: r.trail_name ?? `코스 ${i + 1}`,
      distanceKm, gainM, duration, difficulty, waypointText,
      isPopular: i === 0,
    };
  }), [rows]);

  const hasCourses = rows.length > 0;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative">
        <div
          ref={mapRef}
          className="naver-map-container w-full rounded-xl overflow-hidden h-[280px] md:h-[360px]"
          style={{ border: "1px solid #E5E7EB" }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl z-20">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: DARK_GREEN }} />
          </div>
        )}
      </div>

      {!loading && !hasCourses && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />이 산의 코스 데이터는 준비 중입니다
        </div>
      )}

      {/* Course cards */}
      {hasCourses && (
        <div className="space-y-2 mx-auto" style={{ maxWidth: 600 }}>
          {cards.map((c) => {
            const active = c.idx === selectedIdx;
            return (
              <button
                key={`${c.name}-${c.idx}`}
                type="button"
                onClick={() => setSelectedIdx(c.idx)}
                className="w-full text-left transition-all"
                style={{
                  background: "white",
                  border: "0.5px solid #ddd",
                  borderLeft: `4px solid ${c.color}`,
                  borderRadius: 12,
                  padding: 12,
                  cursor: "pointer",
                  boxShadow: active ? `0 0 0 2px ${c.color}33` : "none",
                }}
              >
                {/* Top row */}
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: c.color, color: "white",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}
                  >
                    {c.idx + 1}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: DARK_GREEN, flex: 1, minWidth: 0 }} className="truncate">
                    {c.name}
                  </span>
                  {c.isPopular && (
                    <span
                      style={{
                        background: "#FFE4E5", color: "#B91C28",
                        fontSize: 10, fontWeight: 600,
                        padding: "2px 7px", borderRadius: 999,
                        display: "inline-flex", alignItems: "center", gap: 3,
                      }}
                    >
                      <Star size={9} fill="#B91C28" stroke="#B91C28" /> 인기
                    </span>
                  )}
                  <ChevronRight size={16} color="#9CA3AF" />
                </div>

                {/* Waypoints */}
                <p
                  style={{ fontSize: 11, color: "#7A8589", marginTop: 8, marginBottom: 10, lineHeight: 1.5 }}
                  className="truncate"
                >
                  {c.waypointText}
                </p>

                {/* Bottom info row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" style={{ fontSize: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: difficultyFg(c.difficulty), fontWeight: 600 }}>
                    <Zap size={12} /> {c.difficulty}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DARK_GREEN }}>
                    <Clock size={12} color="#7A8589" /> {fmtDuration(c.duration)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DARK_GREEN }}>
                    <Ruler size={12} color="#7A8589" /> {c.distanceKm != null ? `${c.distanceKm}km` : "-"}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DARK_GREEN }}>
                    <TrendingUp size={12} color="#7A8589" /> {c.gainM != null ? `${c.gainM}m` : "-"}
                  </span>
                </div>
              </button>
            );
          })}

          {/* CTA bar (below all cards) */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              aria-label="북마크"
              style={{
                width: 44, height: 44, borderRadius: 12,
                border: `1px solid ${DARK_GREEN}33`,
                background: "white", color: DARK_GREEN,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, cursor: "pointer",
              }}
            >
              <Bookmark size={18} />
            </button>
            <button
              type="button"
              style={{
                flex: 1, height: 44,
                background: LIME, color: DARK_GREEN,
                borderRadius: 12, border: "none",
                fontSize: 14, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                cursor: "pointer",
              }}
            >
              <CalendarPlus size={16} /> 등산일정 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
