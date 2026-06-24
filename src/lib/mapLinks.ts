type MapTarget = {
  name: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
};

const enc = (value: string) => encodeURIComponent(value.trim());

function hasCoords(target: MapTarget): target is MapTarget & { lat: number; lng: number } {
  return typeof target.lat === "number" && Number.isFinite(target.lat)
    && typeof target.lng === "number" && Number.isFinite(target.lng);
}

export function appleMapsDirectionsUrl(target: MapTarget): string {
  const label = target.name || target.address || "목적지";
  const destination = hasCoords(target)
    ? `${target.lat},${target.lng}`
    : target.address || target.name;

  const params = new URLSearchParams({
    daddr: destination,
    q: label,
    dirflg: "d",
  });

  return `https://maps.apple.com/?${params.toString()}`;
}

export function appleMapsSearchUrl(target: MapTarget): string {
  const params = new URLSearchParams();
  params.set("q", target.name || target.address || "지도");
  if (hasCoords(target)) params.set("ll", `${target.lat},${target.lng}`);
  else if (target.address) params.set("address", target.address);
  return `https://maps.apple.com/?${params.toString()}`;
}

export function naverMapsWebUrl(target: MapTarget): string {
  const query = target.name || target.address || "지도";
  return `https://map.naver.com/v5/search/${enc(query)}`;
}

export function openExternalMap(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openAppleMapsDirections(target: MapTarget) {
  openExternalMap(appleMapsDirectionsUrl(target));
}

export function openNaverMapsWeb(target: MapTarget) {
  openExternalMap(naverMapsWebUrl(target));
}
