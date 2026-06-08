import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { timeStart, timeEnd } from "@/lib/debugTiming";
import type { MockWeatherData } from "@/data/mockWeather";
import { getMockWeather } from "@/data/mockWeather";
import type { BgWeather } from "@/hooks/useBgWeather";

const STALE_TIME = 1000 * 60 * 30; // 30 min
const GC_TIME = 1000 * 60 * 60; // 1 hour
const SS_KEY = "wandeung_weather_cache_v1";

const conditionMap: Record<string, MockWeatherData["condition"]> = {
  Clear: "맑음",
  Clouds: "구름",
  Rain: "비",
  Drizzle: "비",
  Thunderstorm: "비",
  Snow: "눈",
  Mist: "흐림",
  Fog: "흐림",
  Haze: "흐림",
};

function getSeason(month: number) {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function mapCodeToBg(code: number | undefined, season: string): BgWeather {
  if (typeof code !== "number") return "serenity";
  if (code === 800 || code === 801 || code === 802) return "serenity";
  if (code >= 803 && code <= 804) return "cloudy";
  if (code >= 200 && code <= 599) return "rain";
  if (code >= 600 && code <= 699) {
    return season === "winter" || season === "spring" ? "snow" : "cloudy";
  }
  if (code >= 700 && code <= 799) return "cloudy";
  return "serenity";
}

function readCache(): { ts: number; raw: any } | null {
  try {
    const s = sessionStorage.getItem(SS_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > STALE_TIME) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(raw: any) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ ts: Date.now(), raw }));
  } catch {}
}

function useGeoCoords() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {},
      { timeout: 10000, maximumAge: 30 * 60 * 1000 }
    );
    return () => { cancelled = true; };
  }, []);
  return coords;
}

export interface DashboardWeatherResult {
  weather: MockWeatherData;
  bg: BgWeather;
  isReal: boolean;
  loading: boolean;
}

export function useDashboardWeather(
  fallback: { lat: number; lng: number; id?: number }
): DashboardWeatherResult {
  const geo = useGeoCoords();
  const lat = geo?.lat ?? fallback.lat;
  const lon = geo?.lon ?? fallback.lng;
  const season = getSeason(new Date().getMonth() + 1);
  const mountainId = fallback.id ?? 1;

  // Round to ~10km buckets to keep cache key stable across small geo jitter
  const keyLat = Math.round(lat * 10) / 10;
  const keyLon = Math.round(lon * 10) / 10;

  const { data, isLoading } = useQuery({
    queryKey: ["weather", "shared", keyLat, keyLon],
    queryFn: async () => {
      const cached = readCache();
      if (cached && cached.raw?._key === `${keyLat},${keyLon}`) {
        return cached.raw;
      }
      timeStart("weather:fetch");
      try {
        const { data, error } = await supabase.functions.invoke("get-weather", {
          body: { lat, lon, type: "current" },
        });
        if (error || !data || (data as any)?.error) {
          throw error || new Error("weather upstream error");
        }
        (data as any)._key = `${keyLat},${keyLon}`;
        writeCache(data);
        return data;
      } finally {
        timeEnd("weather:fetch");
      }
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
  });

  if (!data) {
    return {
      weather: getMockWeather(mountainId),
      bg: "serenity",
      isReal: false,
      loading: isLoading,
    };
  }

  const code = (data as any)?.weather?.[0]?.id;
  const main = (data as any)?.weather?.[0]?.main;
  const weather: MockWeatherData = {
    temp: Math.round((data as any).main?.temp ?? 0),
    feelsLike: Math.round((data as any).main?.feels_like ?? 0),
    windSpeed: Math.round(((data as any).wind?.speed ?? 0) * 3.6),
    precipChance: (data as any).rain ? 80 : ((data as any).clouds?.all ?? 0) > 70 ? 50 : 10,
    condition: conditionMap[main] || "흐림",
    humidity: (data as any).main?.humidity ?? 0,
  };

  return {
    weather,
    bg: mapCodeToBg(code, season),
    isReal: true,
    loading: false,
  };
}
