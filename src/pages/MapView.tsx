import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mountains } from "@/data/mountains";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedCompletions, type SharedCompletion } from "@/hooks/useSharedCompletions";
import { Progress } from "@/components/ui/progress";

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();
  const { isCompleted, completedCount } = useStore();
  const { user } = useAuth();
  const { fetchSharedCompletions } = useSharedCompletions();
  const [sharedMountains, setSharedMountains] = useState<Set<number>>(new Set());
  const [sharedCompletionMap, setSharedCompletionMap] = useState<Map<number, SharedCompletion>>(new Map());

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
    const koreaBounds = L.latLngBounds(L.latLng(33.0, 124.5), L.latLng(38.7, 131.9));
    const map = L.map(mapRef.current, { center: [36.0, 127.8], zoom: 7, zoomControl: false, maxBounds: koreaBounds, maxBoundsViscosity: 1.0, minZoom: 6 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18 }).addTo(map);

    mountains.forEach((m) => {
      const completed = isCompleted(m.id);
      const shared = sharedMountains.has(m.id);
      let color = "#94a3b8"; let size = 12;
      if (shared) { color = "#6366f1"; size = 16; }
      else if (completed) { color = "#4a9d6e"; }

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      let tooltipHtml = `<strong>${m.nameKo}</strong><br/>${m.height}m · ${m.difficulty}`;
      if (shared) tooltipHtml += `<br/>👥 공동 완등`;
      else if (completed) tooltipHtml += `<br/>👤 완등`;
      marker.bindTooltip(tooltipHtml, { direction: "top", offset: [0, -8] });
      marker.on("click", () => navigate(`/mountains/${m.id}`));
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [isCompleted, navigate, sharedMountains, sharedCompletionMap]);

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
      <div ref={mapRef} className="h-[calc(100vh-300px)] min-h-[400px] rounded-2xl border border-border overflow-hidden shadow-sm" />
    </div>
  );
};

export default MapView;