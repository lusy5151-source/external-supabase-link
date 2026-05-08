import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMountains } from "@/contexts/MountainsContext";
import type { Mountain } from "@/data/mountains";
import { useStore } from "@/context/StoreContext";
import { useSummitClaims } from "@/hooks/useSummitClaims";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocateFixed, X, MapPin, Users, User, Calendar } from "lucide-react";

type MapFilter = "all" | "completed" | "not_completed" | "shared";

interface InfoCardData {
  mountain: Mountain;
  completed: boolean;
  shared: boolean;
  sharedCompletion?: SharedCompletion;
  completedAt?: string;
}

const MountainMapSection = () => {
  const { mountains } = useMountains();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const myLocationMarkerRef = useRef<any>(null);
  const navigate = useNavigate();
  const { isCompleted: isCompletedLocal, completedCount: localCompletedCount, getRecord } = useStore();
  const { claimedIds } = useSummitClaims();
  const isCompleted = (id: number) => claimedIds.has(id) || isCompletedLocal(id);
  const completedCount = Math.max(claimedIds.size, localCompletedCount);
  const { user } = useAuth();
  const { fetchSharedCompletions } = useSharedCompletions();

  const [sharedMountains, setSharedMountains] = useState<Set<number>>(new Set());
  const [sharedCompletionMap, setSharedCompletionMap] = useState<Map<number, SharedCompletion>>(new Map());
  const [filter, setFilter] = useState<MapFilter>("all");
  const [selectedInfo, setSelectedInfo] = useState<InfoCardData | null>(null);

  useEffect(() => {
    if (user) {
      fetchSharedCompletions()
        .then((scs) => {
          setSharedMountains(new Set(scs.map((sc) => sc.mountain_id)));
          const map = new Map<number, SharedCompletion>();
          scs.forEach((sc) => { if (!map.has(sc.mountain_id)) map.set(sc.mountain_id, sc); });
          setSharedCompletionMap(map);
        })
        .catch(() => {});
    }
  }, [user]);

  const isCompletedRef = useRef(isCompleted);
  const getRecordRef = useRef(getRecord);
  const sharedCompletionMapRef = useRef(sharedCompletionMap);
  useEffect(() => { isCompletedRef.current = isCompleted; }, [isCompleted]);
  useEffect(() => { getRecordRef.current = getRecord; }, [getRecord]);
  useEffect(() => { sharedCompletionMapRef.current = sharedCompletionMap; }, [sharedCompletionMap]);

  // Initialize Naver map ONCE
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
      zoomControl: false,
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.setMap(null);
        myLocationMarkerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when filter/data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    const naver = window.naver;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const filtered = mountains.filter((m) => {
      const completed = isCompletedRef.current(m.id);
      const shared = sharedMountains.has(m.id);
      if (filter === "completed") return completed || shared;
      if (filter === "not_completed") return !completed && !shared;
      if (filter === "shared") return shared;
      return true;
    });

    filtered.forEach((m) => {
      const completed = isCompletedRef.current(m.id);
      const shared = sharedMountains.has(m.id);

      let markerHtml: string;
      let size = 28;

      if (shared) {
        markerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:hsl(239 84% 67%);border:2.5px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(99,102,241,0.45);font-size:13px;">👥</div>`;
      } else if (completed) {
        markerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:hsl(160 40% 40%);border:2.5px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(74,157,110,0.4);font-size:13px;">👤</div>`;
      } else {
        size = 22;
        markerHtml = `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:hsl(200 8% 60%);border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:11px;">⛰</div>`;
      }

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(m.lat, m.lng),
        map,
        title: m.nameKo,
        icon: {
          content: markerHtml,
          anchor: new naver.maps.Point(size / 2, size / 2),
        },
      });

      naver.maps.Event.addListener(marker, "click", () => {
        const record = getRecordRef.current(m.id);
        const sc = sharedCompletionMapRef.current.get(m.id);
        setSelectedInfo({
          mountain: m,
          completed,
          shared,
          sharedCompletion: sc,
          completedAt: record?.completedAt || sc?.completed_at,
        });
      });

      markersRef.current.push(marker);
    });
  }, [mountains, filter, sharedMountains, claimedIds]);

  const handleShowMyLocation = () => {
    if (!navigator.geolocation || !window.naver?.maps) return;
    const naver = window.naver;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map) return;
        const center = new naver.maps.LatLng(latitude, longitude);
        map.setCenter(center);
        map.setZoom(11);
        if (myLocationMarkerRef.current) {
          myLocationMarkerRef.current.setMap(null);
        }
        myLocationMarkerRef.current = new naver.maps.Marker({
          position: center,
          map,
          icon: {
            content: `<div style="width:16px;height:16px;background:hsl(205 60% 50%);border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.5);"></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const filters: { key: MapFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "completed", label: "완등" },
    { key: "not_completed", label: "미등" },
    { key: "shared", label: "공동 완등" },
  ];

  const totalMountains = mountains.length;
  const progressPercent = Math.round((completedCount / totalMountains) * 100);

  return (
    <div className="space-y-4">
      <div className="relative" style={{ zIndex: 1, isolation: 'isolate' }}>
        <div
          ref={mapRef}
          className="naver-map-container h-[200px] sm:h-[200px] rounded-xl border border-border overflow-hidden shadow-sm"
          style={{ zIndex: 1 }}
        />

        <div className="absolute top-3 left-3 z-[1000] flex gap-1.5">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setSelectedInfo(null); }}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium shadow-md backdrop-blur-sm transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/90 text-foreground hover:bg-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 left-3 z-[1000] gap-1.5 rounded-full shadow-md backdrop-blur-sm bg-card/90 hover:bg-card text-xs"
          onClick={handleShowMyLocation}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          내 위치
        </Button>

        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1 rounded-xl bg-card/90 backdrop-blur-sm p-2 shadow-md">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" /> 👤 완등
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(239 84% 67%)" }} /> 👥 공동
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(200 8% 60%)" }} /> ⛰ 미등
          </span>
        </div>

        {selectedInfo && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[320px]">
            <Card className="shadow-xl border-border/50 bg-card/95 backdrop-blur-md">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">{selectedInfo.mountain.nameKo}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {selectedInfo.mountain.region} · {selectedInfo.mountain.height}m
                    </div>
                  </div>
                  <button onClick={() => setSelectedInfo(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedInfo.shared ? (
                    <Badge className="bg-[hsl(239_84%_67%)] text-white text-[10px] gap-1">
                      <Users className="h-3 w-3" /> 공동 완등
                    </Badge>
                  ) : selectedInfo.completed ? (
                    <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                      <User className="h-3 w-3" /> 개인 완등
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">미등</Badge>
                  )}
                  {selectedInfo.mountain.is_baekdu && (
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">백대명산</Badge>
                  )}
                </div>

                {selectedInfo.completedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedInfo.completedAt).toLocaleDateString("ko-KR")}
                  </div>
                )}

                {selectedInfo.sharedCompletion?.participants && selectedInfo.sharedCompletion.participants.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">👥 함께한 사람들</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedInfo.sharedCompletion.participants.map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-[10px] gap-1">
                          {p.profile?.nickname || "익명"}
                          {p.verified && <span className="text-primary">✓</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full text-xs rounded-xl"
                  onClick={() => navigate(`/mountains/${selectedInfo.mountain.id}`)}
                >
                  상세보기
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">🏔 완등 진행률</span>
            <span className="text-sm font-bold text-primary">{completedCount} / {totalMountains}</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{progressPercent}% 완료</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MountainMapSection;
