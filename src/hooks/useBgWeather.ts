import { useEffect, useState } from "react";
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

const REFRESH_MS = 30 * 60 * 1000;

export function useBgWeather(season: string): BgWeather {
  const [weather, setWeather] = useState<BgWeather>("serenity");

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let coords: { lat: number; lon: number } | null = null;

    const fetchWeather = async () => {
      if (!coords) return;
      try {
        const { data, error } = await supabase.functions.invoke("get-weather", {
          body: { lat: coords.lat, lon: coords.lon, type: "current" },
        });
        if (cancelled || error || !data) return;
        const code = data?.weather?.[0]?.id;
        if (typeof code === "number") {
          setWeather(mapCodeToWeather(code, season));
        }
      } catch (e) {
        console.error("useBgWeather fetch error", e);
      }
    };

    if (!navigator.geolocation) {
      setWeather("serenity");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        fetchWeather();
        intervalId = setInterval(fetchWeather, REFRESH_MS);
      },
      () => {
        if (!cancelled) setWeather("serenity");
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [season]);

  return weather;
}
