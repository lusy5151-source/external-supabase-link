import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BgWeather = "serenity" | "cloudy" | "rain" | "snow";

function mapCodeToWeather(code: number, season: string): BgWeather {
  if (code === 800) return "serenity";
  if (code === 801 || code === 802) return "serenity";
  if (code >= 803 && code <= 804) return "cloudy";
  if (code >= 200 && code <= 399) return "rain";
  if (code >= 500 && code <= 599) return "rain";
  if (code >= 600 && code <= 699) {
    return season === "winter" || season === "spring" ? "snow" : "cloudy";
  }
  if (code >= 700 && code <= 799) return "cloudy";
  return "serenity";
}

function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {},
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return coords;
}

export function useBgWeather(season: string): BgWeather {
  const coords = useGeolocation();

  const { data } = useQuery({
    queryKey: ["weather", "current", coords?.lat, coords?.lon],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { lat: coords!.lat, lon: coords!.lon, type: "current" },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!coords,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const code = (data as any)?.weather?.[0]?.id;
  if (typeof code === "number") return mapCodeToWeather(code, season);
  return "serenity";
}
