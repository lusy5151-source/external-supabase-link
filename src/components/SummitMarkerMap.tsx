import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

interface SummitMarker {
  id: string;
  summit_name: string;
  elevation: number;
  latitude: number;
  longitude: number;
  isCompleted?: boolean;
}

interface Props {
  mountain: { lat: number; lng: number; nameKo: string };
  summits: SummitMarker[];
  height?: number;
}

export default function SummitMarkerMap({ mountain, summits, height = 240 }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 17,
    }).addTo(map);

    const bounds: L.LatLngExpression[] = [];

    if (mountain.lat && mountain.lng) {
      const mainIcon = L.divIcon({
        className: "",
        html: `<div style="background:#1e3a5f;color:white;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:1.5px solid white;">${mountain.nameKo}</div>`,
        iconAnchor: [30, 12],
      });
      L.marker([mountain.lat, mountain.lng], { icon: mainIcon }).addTo(map);
      bounds.push([mountain.lat, mountain.lng]);
    }

    summits.forEach((s) => {
      if (!s.latitude || !s.longitude) return;
      const color = s.isCompleted ? "#FF696C" : "#C7D66D";
      const textColor = s.isCompleted ? "white" : "#173404";
      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${color};color:${textColor};font-size:13px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${s.isCompleted ? "✓" : "▲"}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([s.latitude, s.longitude], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:12px;font-weight:700;color:#173404;margin-bottom:2px;">${s.summit_name}</div>
           <div style="font-size:11px;color:#666;">${s.elevation}m</div>
           ${s.isCompleted ? '<div style="font-size:10px;color:#FF696C;font-weight:700;margin-top:2px;">✓ 정복 완료</div>' : ""}`,
          { closeButton: false }
        );
      bounds.push([s.latitude, s.longitude]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0] as L.LatLngExpression, 13);
    } else {
      map.setView([36.0, 127.8], 7);
    }

    mapInstanceRef.current = map;

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [mountain.lat, mountain.lng, mountain.nameKo, summits]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height,
        borderRadius: 10,
        overflow: "hidden",
        zIndex: 0,
      }}
    />
  );
}
