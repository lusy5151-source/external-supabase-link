import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMountains } from "@/contexts/MountainsContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";

const SAFEMAP_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/safemap-wms`;

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const safemapLayerRef = useRef<any>(null);
  const navigate = useNavigate();
  const { mountains } = useMountains();
  const { isCompleted, completedCount } = useStore();
  const { user } = useAuth();
  const { fetchSharedCompletions } = useSharedCompletions();
  const [sharedMountains, setSharedMountains] = useState<Set<number>>(new Set());
  const [sharedCompletionMap, setSharedCompletionMap] = useState<Map<number, SharedCompletion>>(new Map());
  const [showSafemap, setShowSafemap] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSharedCompletions().then((scs) => {
        const ids = new Set(scs.map((sc) => sc.mountain_id));
        setSharedMountains(ids);
        const map = new Map<number, SharedCompletion>();
        scs.forEach((sc) => { if (!map.has(sc.mountain_id)) map.set(sc.mountain_id, sc); });
        setSharedCompletionMap(map);
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.naver?.maps) {
      console.warn("Naver Maps SDK not loaded yet");
      return;
    }
    const naver = window.naver;
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(36.0, 127.8),
      zoom: 7,
      mapTypeId: naver.maps.MapTypeId.TERRAIN,
      minZoom: 6,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
    });
    mapInstanceRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    mountains.forEach((m) => {
      const completed = isCompleted(m.id);
      const shared = sharedMountains.has(m.id);
      let color = "#94a3b8"; let size = 12;
      if (shared) { color = "#6366f1"; size = 16; }
      else if (completed) { color = "#4a9d6e"; }

      let tooltipHtml = `<strong>${m.nameKo}</strong><br/>${m.height}m · ${m.difficulty}`;
      if (shared) tooltipHtml += `<br/>👥 공동 완등`;
      else if (completed) tooltipHtml += `<br/>👤 완등`;

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(m.lat, m.lng),
        map,
        title: m.nameKo,
        icon: {
          content: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          anchor: new naver.maps.Point(size / 2, size / 2),
        },
      });

      const infoWindow = new naver.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:12px;line-height:1.4;">${tooltipHtml}</div>`,
        borderWidth: 0,
        disableAnchor: true,
        backgroundColor: "rgba(255,255,255,0.95)",
      });

      naver.maps.Event.addListener(marker, "mouseover", () => infoWindow.open(map, marker));
      naver.maps.Event.addListener(marker, "mouseout", () => infoWindow.close());
      naver.maps.Event.addListener(marker, "click", () => navigate(`/mountains/${m.id}`));

      markersRef.current.push(marker);
    });
  }, [mountains, isCompleted, sharedMountains, navigate]);

  // SafeMap WMS overlay (산사태 위험지도 IF_0017) — EPSG:4326 BBOX 변환
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    if (!showSafemap) {
      if (safemapLayerRef.current) {
        map.overlayMapTypes?.removeAt?.(0);
        safemapLayerRef.current = null;
      }
      return;
    }

    const TILE_SIZE = 256;
    // Web Mercator 타일 (x,y,z) -> EPSG:4326 lon/lat BBOX
    const tileToLonLatBBox = (x: number, y: number, z: number) => {
      const n = Math.pow(2, z);
      const lon1 = (x / n) * 360 - 180;
      const lon2 = ((x + 1) / n) * 360 - 180;
      const latRad1 = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
      const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
      const lat1 = (latRad1 * 180) / Math.PI;
      const lat2 = (latRad2 * 180) / Math.PI;
      // WMS 1.1.1 EPSG:4326 BBOX 순서: minLon,minLat,maxLon,maxLat
      const minLon = Math.min(lon1, lon2);
      const maxLon = Math.max(lon1, lon2);
      const minLat = Math.min(lat1, lat2);
      const maxLat = Math.max(lat1, lat2);
      return `${minLon},${minLat},${maxLon},${maxLat}`;
    };

    const safemapType = new naver.maps.ImageMapType({
      name: "SafeMap_IF_0017",
      tileSize: new naver.maps.Size(TILE_SIZE, TILE_SIZE),
      minZoom: 6,
      maxZoom: 18,
      opacity: 0.55,
      getTileUrl: (x: number, y: number, z: number) => {
        const bbox = tileToLonLatBBox(x, y, z);
        const params = new URLSearchParams({
          bbox,
          width: String(TILE_SIZE),
          height: String(TILE_SIZE),
          layers: "IF_0017",
          format: "image/png",
          srs: "EPSG:4326",
          version: "1.1.1",
        });
        return `${SAFEMAP_PROXY_URL}?${params.toString()}`;
      },
    });

    map.overlayMapTypes.insertAt(0, safemapType);
    safemapLayerRef.current = safemapType;

    return () => {
      if (safemapLayerRef.current) {
        try { map.overlayMapTypes.removeAt(0); } catch {}
        safemapLayerRef.current = null;
      }
    };
  }, [showSafemap]);

  const totalMountains = mountains.length;
  const progressPercent = Math.round((completedCount / totalMountains) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">지도</h1><p className="mt-1 text-muted-foreground">{completedCount}개 완등</p></div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-primary" />완등</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#6366f1" }} />공동</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#94a3b8" }} />미등</span>
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-foreground">완등 진행률</span><span className="text-sm font-bold text-primary">{completedCount} / {totalMountains}</span></div>
        <Progress value={progressPercent} className="h-3 rounded-full" />
        <p className="text-[10px] text-muted-foreground mt-1">{progressPercent}% 완료</p>
      </div>
      <div className="relative">
        <div ref={mapRef} className="naver-map-container h-[calc(100vh-300px)] min-h-[400px] rounded-2xl border border-border overflow-hidden shadow-sm" />
        <div className="absolute top-3 left-3 z-10">
          <Button
            size="sm"
            variant={showSafemap ? "default" : "secondary"}
            className="gap-1.5 shadow-md"
            onClick={() => setShowSafemap((v) => !v)}
          >
            <Layers className="h-3.5 w-3.5" />
            산사태 위험지도 {showSafemap ? "ON" : "OFF"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MapView;
