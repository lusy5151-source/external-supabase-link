import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMountains } from "@/contexts/MountainsContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Layers, Mountain as MountainIcon, Route, Clock, Ruler, Phone, MoonStar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SAFEMAP_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/safemap-wms`;

// 코스 마커는 이 줌 레벨 이상부터 표시 (전국 보기에서 어수선함 방지)
const COURSE_MIN_ZOOM = 10;

interface NPCourse {
  id: number;
  cos_kor_nm: string;
  detail_cos: string | null;
  leng: string | null;
  forward_tm: string | null;
  forward_minutes: number | null;
  difficulty: string | null;
  cos_schdul: string | null;
  park_name: string | null;
  mng_tel: string | null;
  latitude: number | null;
  longitude: number | null;
  mountain_id: number | null;
}

function difficultyColor(d: string | null): string {
  if (d === "하") return "#22C55E";
  if (d === "중") return "#F97316";
  if (d === "상") return "#EF4444";
  return "#64748b";
}

function difficultyBadgeClass(d: string | null) {
  if (d === "하") return "bg-emerald-100 text-emerald-700";
  if (d === "중") return "bg-amber-100 text-amber-700";
  if (d === "상") return "bg-red-100 text-red-700";
  return "bg-secondary text-muted-foreground";
}

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const courseMarkersRef = useRef<any[]>([]);
  const safemapLayerRef = useRef<any>(null);
  const navigate = useNavigate();
  const { mountains } = useMountains();
  const { isCompleted, completedCount } = useStore();
  const { user } = useAuth();
  const { fetchSharedCompletions } = useSharedCompletions();
  const [sharedMountains, setSharedMountains] = useState<Set<number>>(new Set());
  const [, setSharedCompletionMap] = useState<Map<number, SharedCompletion>>(new Map());
  const [showSafemap, setShowSafemap] = useState(false);
  const [showCourses, setShowCourses] = useState(true);
  const [courses, setCourses] = useState<NPCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<NPCourse | null>(null);

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

  // Fetch national park courses once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("national_park_courses")
        .select("id,cos_kor_nm,detail_cos,leng,forward_tm,forward_minutes,difficulty,cos_schdul,park_name,mng_tel,latitude,longitude,mountain_id")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (cancelled) return;
      if (error) {
        console.error("national_park_courses fetch error:", error);
        setCourses([]);
        return;
      }
      setCourses((data || []) as NPCourse[]);
    })();
    return () => { cancelled = true; };
  }, []);

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
      courseMarkersRef.current.forEach((m) => m.setMap(null));
      courseMarkersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  // Mountain markers
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
        zIndex: 100,
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

  // National park course markers (with zoom-based visibility + toggle)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    // Clear previous course markers
    courseMarkersRef.current.forEach((m) => m.setMap(null));
    courseMarkersRef.current = [];

    if (!showCourses || courses.length === 0) return;

    const updateVisibility = () => {
      const z = map.getZoom();
      const visible = z >= COURSE_MIN_ZOOM;
      courseMarkersRef.current.forEach((mk) => {
        if (visible && mk.getMap() == null) mk.setMap(map);
        else if (!visible && mk.getMap() != null) mk.setMap(null);
      });
    };

    courses.forEach((c) => {
      if (c.latitude == null || c.longitude == null) return;
      const color = difficultyColor(c.difficulty);
      const size = 10;
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(c.latitude, c.longitude),
        title: c.cos_kor_nm,
        zIndex: 50,
        icon: {
          content: `<div style="width:${size}px;height:${size}px;background:${color};border:1.5px solid white;border-radius:2px;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          anchor: new naver.maps.Point(size / 2, size / 2),
        },
      });
      naver.maps.Event.addListener(marker, "click", () => setSelectedCourse(c));
      courseMarkersRef.current.push(marker);
    });

    updateVisibility();
    const zoomListener = naver.maps.Event.addListener(map, "zoom_changed", updateVisibility);

    return () => {
      try { naver.maps.Event.removeListener(zoomListener); } catch {}
      courseMarkersRef.current.forEach((m) => m.setMap(null));
      courseMarkersRef.current = [];
    };
  }, [courses, showCourses]);

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
    const tileToLonLatBBox = (x: number, y: number, z: number) => {
      const n = Math.pow(2, z);
      const lon1 = (x / n) * 360 - 180;
      const lon2 = ((x + 1) / n) * 360 - 180;
      const latRad1 = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
      const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
      const lat1 = (latRad1 * 180) / Math.PI;
      const lat2 = (latRad2 * 180) / Math.PI;
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
  const isOvernight = selectedCourse?.cos_schdul === "1박2일";

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
        <div className="absolute top-3 right-3 z-10">
          <Button
            size="sm"
            variant={showCourses ? "default" : "secondary"}
            className="gap-1.5 shadow-md"
            onClick={() => setShowCourses((v) => !v)}
          >
            <Route className="h-3.5 w-3.5" />
            공식 탐방로 {showCourses ? "ON" : "OFF"}
          </Button>
        </div>
        {showCourses && (
          <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-card/95 backdrop-blur px-3 py-2 shadow-md border border-border text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground mb-1">탐방로 난이도</div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: "#22C55E" }} />하</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: "#F97316" }} />중</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: "#EF4444" }} />상</span>
            </div>
            <div className="mt-1 text-muted-foreground/70">줌 {COURSE_MIN_ZOOM}+ 에서 표시</div>
          </div>
        )}
      </div>

      <Sheet open={!!selectedCourse} onOpenChange={(o) => !o && setSelectedCourse(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 text-xs text-primary mb-1">
                  <MountainIcon className="h-3.5 w-3.5" />
                  {selectedCourse.park_name || "국립공원"}
                </div>
                <SheetTitle className="text-lg">{selectedCourse.cos_kor_nm}</SheetTitle>
                {selectedCourse.detail_cos && (
                  <SheetDescription className="text-xs leading-relaxed">
                    {selectedCourse.detail_cos}
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {selectedCourse.leng && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
                    <Ruler className="h-3 w-3" /> {selectedCourse.leng}
                  </span>
                )}
                {selectedCourse.forward_tm && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
                    <Clock className="h-3 w-3" /> {selectedCourse.forward_tm}
                  </span>
                )}
                {selectedCourse.difficulty && (
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", difficultyBadgeClass(selectedCourse.difficulty))}>
                    난이도 {selectedCourse.difficulty}
                  </span>
                )}
                {isOvernight && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <MoonStar className="h-3 w-3" /> 1박2일
                  </span>
                )}
                {!isOvernight && selectedCourse.cos_schdul && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {selectedCourse.cos_schdul}
                  </span>
                )}
              </div>

              {selectedCourse.mng_tel && (
                <a
                  href={`tel:${selectedCourse.mng_tel}`}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">관리 연락처</span>
                  <span className="ml-auto font-medium text-foreground">{selectedCourse.mng_tel}</span>
                </a>
              )}

              <div className="mt-4 flex gap-2">
                {selectedCourse.mountain_id != null && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const id = selectedCourse.mountain_id;
                      setSelectedCourse(null);
                      navigate(`/mountains/${id}`);
                    }}
                  >
                    <MountainIcon className="h-4 w-4 mr-1.5" />
                    산 상세로 이동
                  </Button>
                )}
                <Button variant="secondary" className="flex-1" onClick={() => setSelectedCourse(null)}>
                  닫기
                </Button>
              </div>

              <p className="mt-4 text-[10px] text-muted-foreground/70 text-right">
                출처: 국립공원공단
              </p>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MapView;
