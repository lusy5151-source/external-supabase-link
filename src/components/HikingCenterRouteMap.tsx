import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, CalendarPlus, ChevronRight, Clock, Info, Loader2, Ruler, Star, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HikingCenterRouteMapProps {
  mountainName: string;
  mountainId: number;
  lat: number;
  lng: number;
}

interface TrailRow {
  id: string;
  name: string;
  distance_km: number | null;
  duration_minutes: number | null;
  difficulty: string | null;
  elevation_gain_m: number | null;
  starting_point: string | null;
  ending_point: string | null;
  is_popular: boolean | null;
  course_type: string | null;
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
}

const ROUTE_COLORS = ["#013F92", "#C7D66D", "#FF696C", "#C2B6DE", "#2F403A"];
const DARK_GREEN = "#2F403A";
const LIME = "#C7D66D";
const colorAt = (i: number) => ROUTE_COLORS[i % ROUTE_COLORS.length];

function normName(s?: string | null) {
  return (s ?? "").toLowerCase().replace(/\s+/g, "").replace(/코스$/, "");
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

function fmtDuration(min: number | null): string {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간${m}분`;
}
function difficultyFg(d: string | null): string {
  if (d === "쉬움") return "#3F5C0E";
  if (d === "어려움") return "#B91C28";
  return "#92400E";
}

export function HikingCenterRouteMap({ mountainName, mountainId, lat, lng }: HikingCenterRouteMapProps) {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const startMarkersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [trails, setTrails] = useState<TrailRow[]>([]);
  const [peaks, setPeaks] = useState<PeakRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch trails (cards) + peaks (map)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [tRes, pRes] = await Promise.all([
        supabase
          .from("trails")
          .select("id, name, distance_km, duration_minutes, difficulty, elevation_gain_m, starting_point, ending_point, is_popular, course_type")
          .eq("mountain_id", mountainId)
          .order("is_popular", { ascending: false })
          .order("name"),
        (supabase as any)
          .from("hiking_center_peaks")
          .select("trail_name, summit_name, summit_lat, summit_lng, start_lat, start_lng, end_lat, end_lng, route_coordinates, kakao_nearby_places, summit_elevation_m")
          .eq("peak_name", mountainName),
      ]);
      if (cancelled) return;
      if (tRes.error) console.warn("[trails] fetch error", tRes.error);
      if (pRes.error) console.warn("[peaks] fetch error", pRes.error);
      setTrails(((tRes.data ?? []) as any[]) as TrailRow[]);
      setPeaks(((pRes.data ?? []) as any[]) as PeakRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mountainId, mountainName]);

  // Map of normalized trail name -> card color index
  const trailColorByName = useMemo(() => {
    const m = new Map<string, string>();
    trails.forEach((t, i) => m.set(normName(t.name), colorAt(i)));
    return m;
  }, [trails]);

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

  // Render ALL routes from peaks
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    overlaysRef.current.forEach((o) => o.setMap?.(null));
    polylinesRef.current.forEach((o) => o.setMap?.(null));
    startMarkersRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];
    polylinesRef.current = [];
    startMarkersRef.current = [];

    if (peaks.length === 0) return;

    const allPts: Array<[number, number]> = [];
    let summitShown = false;

    peaks.forEach((r, i) => {
      const matched = trailColorByName.get(normName(r.trail_name));
      const color = matched ?? colorAt(i);
      const path = toLatLngArray(r.route_coordinates);
      path.forEach((p) => allPts.push(p));

      if (path.length >= 2) {
        const naverPath = path.map(([la, ln]) => new naver.maps.LatLng(la, ln));
        const pl = new naver.maps.Polyline({
          map,
          path: naverPath,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.9,
          strokeStyle: "solid",
          zIndex: 60,
        });
        polylinesRef.current.push(pl);
      }

      if (r.start_lat != null && r.start_lng != null) {
        const sm = new naver.maps.Marker({
          position: new naver.maps.LatLng(r.start_lat, r.start_lng),
          map,
          icon: { content: startPin(i + 1, color), anchor: new naver.maps.Point(0, 0) },
          zIndex: 150,
        });
        startMarkersRef.current.push(sm);
        allPts.push([r.start_lat, r.start_lng]);
      }

      // Branch dots
      const places = Array.isArray(r.kakao_nearby_places) ? r.kakao_nearby_places : [];
      places.forEach((p: any) => {
        const la = Number(p?.lat); const ln = Number(p?.lng);
        if (!isFinite(la) || !isFinite(ln)) return;
        const mk = new naver.maps.Marker({
          position: new naver.maps.LatLng(la, ln),
          map,
          icon: { content: branchDot(), anchor: new naver.maps.Point(0, 0) },
          zIndex: 80,
        });
        naver.maps.Event.addListener(mk, "click", () => {
          const iw = new naver.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:11px;color:${DARK_GREEN};">${String(p?.name ?? "")}</div>`,
            borderWidth: 1,
            anchorSize: new naver.maps.Size(6, 6),
          });
          iw.open(map, new naver.maps.LatLng(la, ln));
        });
        overlaysRef.current.push(mk);
        allPts.push([la, ln]);
      });

      // Summit (single, take first available)
      if (!summitShown && r.summit_lat != null && r.summit_lng != null) {
        const sm = new naver.maps.Marker({
          position: new naver.maps.LatLng(r.summit_lat, r.summit_lng),
          map,
          icon: {
            content: summitPin(r.summit_name ?? mountainName, r.summit_elevation_m),
            anchor: new naver.maps.Point(0, 0),
          },
          zIndex: 250,
        });
        overlaysRef.current.push(sm);
        allPts.push([r.summit_lat, r.summit_lng]);
        summitShown = true;
      }
    });

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
  }, [mapReady, peaks, trailColorByName, mountainName]);

  const hasCourses = trails.length > 0;

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

      {/* Course cards (from trails) */}
      {hasCourses && (
        <div className="space-y-2 w-full">
          {trails.map((t, i) => {
            const color = colorAt(i);
            const start = t.starting_point ?? "출발지";
            const end = t.ending_point ?? "도착";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/trails/${t.id}`)}
                className="w-full text-left transition-all hover:shadow-md"
                style={{
                  background: "white",
                  border: "0.5px solid #ddd",
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 12,
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: color, color: "white",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: DARK_GREEN, flex: 1, minWidth: 0 }} className="truncate">
                    {t.name}
                  </span>
                  {t.is_popular && (
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

                <p
                  style={{ fontSize: 11, color: "#7A8589", marginTop: 8, marginBottom: 10, lineHeight: 1.5 }}
                  className="truncate"
                >
                  {start} → {end}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" style={{ fontSize: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: difficultyFg(t.difficulty), fontWeight: 600 }}>
                    <Zap size={12} /> {t.difficulty ?? "-"}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DARK_GREEN }}>
                    <Clock size={12} color="#7A8589" /> {fmtDuration(t.duration_minutes)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DARK_GREEN }}>
                    <Ruler size={12} color="#7A8589" /> {t.distance_km != null ? `${t.distance_km}km` : "-"}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DARK_GREEN }}>
                    <TrendingUp size={12} color="#7A8589" /> {t.elevation_gain_m != null ? `${Math.round(t.elevation_gain_m)}m` : "-"}
                  </span>
                </div>
              </button>
            );
          })}

          {/* CTA bar (single, below all cards) */}
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
              onClick={() => navigate(`/plans/new?mountainId=${mountainId}`)}
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
