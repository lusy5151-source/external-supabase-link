import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, CalendarPlus, Clock, Info, Loader2, Mountain, Ruler, Star, TrendingUp } from "lucide-react";
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
  start_place_name: string | null;
  end_place_name: string | null;
  route_coordinates: any;
  kakao_nearby_places: any;
  summit_elevation_m: number | null;
  elevation_gain_m: number | null;
  total_distance_m: number | null;
}

/* Brand palette (cycled per course order) */
const ROUTE_COLORS = ["#013F92", "#C7D66D", "#FF696C", "#C2B6DE", "#2F403A"];
const DARK_GREEN = "#2F403A";
const LIME = "#C7D66D";
const CORAL = "#FF696C";

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

/* Heuristics for missing fields */
function estimateDuration(distanceKm: number | null, gainM: number | null): number | null {
  if (distanceKm == null && gainM == null) return null;
  const d = distanceKm ?? 0;
  const g = gainM ?? 0;
  // ~ 20min/km + 10min per 100m ascent
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
  return `${h}시간 ${m}분`;
}
function difficultyColor(d: string): { bg: string; fg: string } {
  if (d === "쉬움") return { bg: "#EEF6CC", fg: "#3F5C0E" };
  if (d === "어려움") return { bg: "#FFE4E5", fg: "#B91C28" };
  return { bg: "#FEF3C7", fg: "#92400E" };
}

export function HikingCenterRouteMap({ mountainName, lat, lng }: HikingCenterRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [rows, setRows] = useState<PeakRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mapType, setMapType] = useState<"normal" | "terrain">("terrain");

  // Fetch courses for this mountain
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
      overlaysRef.current = [];
      mapInstanceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Map type toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    map.setMapTypeId(
      mapType === "terrain" ? window.naver.maps.MapTypeId.TERRAIN : window.naver.maps.MapTypeId.NORMAL
    );
  }, [mapType]);

  const selected = rows[selectedIdx] ?? null;
  const selectedColor = colorAt(selectedIdx);

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
        strokeColor: selectedColor,
        strokeWeight: 4,
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

    // Branch markers (small gray dots)
    const places = Array.isArray(selected.kakao_nearby_places) ? selected.kakao_nearby_places : [];
    const branches = places
      .map((p: any) => {
        const la = Number(p?.lat);
        const ln = Number(p?.lng);
        if (!isFinite(la) || !isFinite(ln)) return null;
        return { lat: la, lng: ln, name: String(p?.name ?? "") };
      })
      .filter(Boolean) as Array<{ lat: number; lng: number; name: string }>;

    branches.forEach((b) => {
      pushMarker(b.lat, b.lng, branchDot(), 80, () => {
        const iw = new naver.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-size:11px;color:${DARK_GREEN};">${b.name}</div>`,
          borderWidth: 1,
          anchorSize: new naver.maps.Size(6, 6),
        });
        iw.open(map, new naver.maps.LatLng(b.lat, b.lng));
      });
    });

    // Start = numbered with course color
    pushMarker(selected.start_lat, selected.start_lng, startPin(selectedIdx + 1, selectedColor), 150);

    // Summit = mountain icon + label
    pushMarker(
      selected.summit_lat,
      selected.summit_lng,
      summitPin(selected.summit_name ?? mountainName, selected.summit_elevation_m),
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
      window.setTimeout(() => {
        try {
          const z = map.getZoom?.();
          if (typeof z === "number" && z < 13) map.setZoom(13, true);
        } catch {}
      }, 80);
    } else {
      map.setCenter(new naver.maps.LatLng(lat, lng));
    }
  }, [mapReady, selected, selectedColor, selectedIdx, mountainName, lat, lng]);

  const hasCourses = rows.length > 0;

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
    const middle = branchNames.slice(0, 3).join(" · ");
    const waypointText = middle ? `${start} → ${middle} → ${end}` : `${start} → ${end}`;
    return {
      idx: i,
      color,
      name: r.trail_name ?? `코스 ${i + 1}`,
      distanceKm,
      gainM,
      duration,
      difficulty,
      waypointText,
      isPopular: i === 0, // mark first as popular by default; data has no flag
    };
  }), [rows]);

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative">
        <div
          ref={mapRef}
          className="naver-map-container h-[360px] rounded-xl overflow-hidden"
          style={{ border: `1px solid #E5E7EB` }}
        />
        {/* Top-left map type toggle */}
        <div className="absolute left-2 top-2 z-10 flex rounded-lg overflow-hidden shadow-md text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMapType("normal")}
            style={{
              background: mapType === "normal" ? DARK_GREEN : "white",
              color: mapType === "normal" ? "white" : DARK_GREEN,
              padding: "5px 10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            일반
          </button>
          <button
            type="button"
            onClick={() => setMapType("terrain")}
            style={{
              background: mapType === "terrain" ? DARK_GREEN : "white",
              color: mapType === "terrain" ? "white" : DARK_GREEN,
              padding: "5px 10px",
              border: "none",
              borderLeft: "1px solid #E5E7EB",
              cursor: "pointer",
            }}
          >
            지형도
          </button>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl z-20">
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
        <div className="space-y-2.5">
          {cards.map((c) => {
            const active = c.idx === selectedIdx;
            const dc = difficultyColor(c.difficulty);
            return (
              <button
                key={`${c.name}-${c.idx}`}
                type="button"
                onClick={() => setSelectedIdx(c.idx)}
                className="w-full text-left transition-all"
                style={{
                  background: "white",
                  borderRadius: 14,
                  borderLeft: `4px solid ${c.color}`,
                  boxShadow: active
                    ? `0 0 0 2px ${c.color}33, 0 4px 14px rgba(0,0,0,0.06)`
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  padding: "12px 14px",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
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
                  <span style={{ fontSize: 14, fontWeight: 500, color: DARK_GREEN, flex: 1, minWidth: 0 }} className="truncate">
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
                </div>

                <p style={{ fontSize: 11, color: "#7A8589", marginBottom: 10, lineHeight: 1.5 }} className="truncate">
                  {c.waypointText}
                </p>

                <div className="grid grid-cols-4 gap-2">
                  <InfoCell
                    label="난이도"
                    value={c.difficulty}
                    valueStyle={{ background: dc.bg, color: dc.fg, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}
                  />
                  <InfoCell icon={<Clock size={11} color="#7A8589" />} label="시간" value={fmtDuration(c.duration)} />
                  <InfoCell icon={<Ruler size={11} color="#7A8589" />} label="거리" value={c.distanceKm != null ? `${c.distanceKm}km` : "-"} />
                  <InfoCell icon={<TrendingUp size={11} color="#7A8589" />} label="고도" value={c.gainM != null ? `${c.gainM}m` : "-"} />
                </div>

                {/* CTA row */}
                <div className="mt-3 flex items-center gap-2">
                  <div
                    style={{
                      flex: 1,
                      background: LIME,
                      color: DARK_GREEN,
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <CalendarPlus size={14} /> 등산일정 추가
                  </div>
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      border: `1px solid ${DARK_GREEN}33`,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      color: DARK_GREEN, background: "white",
                    }}
                    aria-label="북마크"
                  >
                    <Bookmark size={15} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  valueStyle,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#7A8589", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 3, justifyContent: "center" }}>
        {icon}
        {label}
      </div>
      {valueStyle ? (
        <span style={{ display: "inline-block", ...valueStyle }}>{value}</span>
      ) : (
        <div style={{ fontSize: 12, fontWeight: 600, color: DARK_GREEN }}>{value}</div>
      )}
    </div>
  );
}
