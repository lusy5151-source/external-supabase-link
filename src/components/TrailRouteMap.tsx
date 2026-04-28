import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Info } from "lucide-react";
import type { Trail } from "@/hooks/useTrails";
import { supabase } from "@/integrations/supabase/client";

interface TrailRouteMapProps {
  mountainName: string;
  mountainId?: number;
  lat: number;
  lng: number;
  selectedTrail: Trail | null;
}

type VworldFeature = {
  type: "Feature";
  geometry: {
    type: "MultiLineString";
    coordinates: number[][][];
  };
  properties: {
    mntn_nm?: string;
    sec_len?: string;
    up_min?: string;
    down_min?: string;
    cat_nam?: string;
  };
};

function getColorByDifficulty(catNam: string | undefined): string {
  switch (catNam) {
    case "하": return "#22c55e";
    case "중": return "#f59e0b";
    case "상": return "#ef4444";
    default:   return "#3b82f6";
  }
}

function getDifficultyLabel(catNam: string | undefined): string {
  switch (catNam) {
    case "하": return "쉬움 🟢";
    case "중": return "보통 🟡";
    case "상": return "어려움 🔴";
    default:   return "정보 없음";
  }
}

/**
 * Naver map: shows VWorld hiking trail polylines for the mountain,
 * plus an emphasized polyline for the selected trail.
 */
export function TrailRouteMap({ mountainName, mountainId, lat, lng, selectedTrail }: TrailRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const trailPolylinesRef = useRef<any[]>([]);
  const summitMarkerRef = useRef<any>(null);

  const [features, setFeatures] = useState<VworldFeature[]>([]);
  const [isLoadingTrails, setIsLoadingTrails] = useState(false);

  // Fetch VWorld trail features for this mountain
  useEffect(() => {
    if (!mountainId) return;
    let cancelled = false;
    setIsLoadingTrails(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("mountain_trail_features")
        .select("vworld_features")
        .eq("mountain_id", mountainId)
        .maybeSingle();
      if (cancelled) return;
      const fs = (data?.vworld_features as VworldFeature[]) || [];
      setFeatures(Array.isArray(fs) ? fs : []);
      setIsLoadingTrails(false);
    })();
    return () => { cancelled = true; };
  }, [mountainId]);

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
      clearTrailPolylines();
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

  const clearTrailPolylines = () => {
    trailPolylinesRef.current.forEach((p) => p.setMap?.(null));
    trailPolylinesRef.current = [];
  };

  // Draw VWorld trail polylines when features arrive
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    clearTrailPolylines();
    if (!features || features.length === 0) return;

    const polylines: any[] = [];
    features.forEach((feature) => {
      if (feature.geometry?.type !== "MultiLineString") return;
      const props = feature.properties || {};
      const color = getColorByDifficulty(props.cat_nam);

      feature.geometry.coordinates.forEach((lineString) => {
        const path = lineString.map(
          ([lng_, lat_]: number[]) => new naver.maps.LatLng(lat_, lng_)
        );
        const polyline = new naver.maps.Polyline({
          map,
          path,
          strokeColor: color,
          strokeWeight: 3,
          strokeOpacity: 0.75,
          strokeStyle: "solid",
          clickable: true,
        });

        naver.maps.Event.addListener(polyline, "click", (e: any) => {
          const lengthKm = (parseInt(props.sec_len || "0") / 1000).toFixed(2);
          const infoWindow = new naver.maps.InfoWindow({
            content: `
              <div style="padding:10px 14px;font-size:13px;line-height:1.6;min-width:140px;">
                <div style="font-weight:600;margin-bottom:4px;">${props.mntn_nm || "등산로"}</div>
                <div>📏 거리: ${lengthKm}km</div>
                <div>⬆️ 상행: ${props.up_min || "-"}분</div>
                <div>⬇️ 하행: ${props.down_min || "-"}분</div>
                <div>난이도: ${getDifficultyLabel(props.cat_nam)}</div>
              </div>
            `,
            borderColor: color,
            borderWidth: 2,
            anchorSize: new naver.maps.Size(10, 10),
          });
          infoWindow.open(map, e.coord);
        });

        polylines.push(polyline);
      });
    });

    trailPolylinesRef.current = polylines;

    // Auto-fit bounds to all trails (only if no selected trail to override)
    if (polylines.length > 0 && !selectedTrail) {
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(lat, lng),
        new naver.maps.LatLng(lat, lng)
      );
      polylines.forEach((p) => {
        p.getPath().forEach((latlng: any) => bounds.extend(latlng));
      });
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
    }
  }, [features, selectedTrail, lat, lng]);

  // Draw selected trail (emphasized) when it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    clearRoute();

    if (!selectedTrail) return;

    const coords = extractFirstLine(selectedTrail.geometry);
    if (!coords || coords.length === 0) {
      map.setCenter(new naver.maps.LatLng(lat, lng));
      return;
    }

    const path = coords.map(([lng_, lat_]) => new naver.maps.LatLng(lat_, lng_));

    polylineRef.current = new naver.maps.Polyline({
      map,
      path,
      strokeColor: "#4a8f3f",
      strokeWeight: 5,
      strokeOpacity: 0.9,
      zIndex: 100,
    });

    const startMarker = new naver.maps.Marker({
      position: path[0],
      map,
      icon: {
        content: `<div style="background:#4a8f3f;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">출발</div>`,
        anchor: new naver.maps.Point(20, 15),
      },
    });
    overlaysRef.current.push(startMarker);

    const endMarker = new naver.maps.Marker({
      position: path[path.length - 1],
      map,
      icon: {
        content: `<div style="background:#e53e3e;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">▲ 정상</div>`,
        anchor: new naver.maps.Point(25, 15),
      },
    });
    overlaysRef.current.push(endMarker);

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

      <div className="relative">
        <div
          ref={mapRef}
          className="naver-map-container h-[350px] rounded-xl border border-border overflow-hidden"
        />

        {isLoadingTrails && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs z-10">
            🥾 등산로 불러오는 중...
          </div>
        )}

        {!isLoadingTrails && features.length === 0 && mountainId && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs z-10">
            🚧 등산로 데이터 준비 중
          </div>
        )}

        {features.length > 0 && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-2.5 text-xs space-y-1 z-10">
            <div className="font-semibold mb-1 text-gray-800">난이도</div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-3 h-1 bg-green-500 rounded-full"></span>
              <span>쉬움</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-3 h-1 bg-amber-500 rounded-full"></span>
              <span>보통</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-3 h-1 bg-red-500 rounded-full"></span>
              <span>어려움</span>
            </div>
          </div>
        )}
      </div>
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
  if (Array.isArray(c) && Array.isArray(c[0]) && typeof c[0][0] === "number") {
    return c as number[][];
  }
  return null;
}
