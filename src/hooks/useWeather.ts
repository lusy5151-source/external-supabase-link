import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MockWeatherData } from "@/data/mockWeather";
import { getMockWeather } from "@/data/mockWeather";

interface WeatherConditionMap {
  [key: string]: MockWeatherData["condition"];
}

const conditionMap: WeatherConditionMap = {
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

const STALE_TIME = 1000 * 60 * 10; // 10 min
const GC_TIME = 1000 * 60 * 30; // 30 min

async function fetchCurrentWeather(mountainId: number, lat: number, lng: number) {
  const { data, error } = await supabase.functions
    .invoke("get-weather", { body: { lat, lon: lng, type: "current" } })
    .catch(() => ({ data: null, error: new Error("Network error") }));

  if (error || !data || (data as any)?.error) {
    return { weather: getMockWeather(mountainId), isReal: false };
  }

  const mapped: MockWeatherData = {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    windSpeed: Math.round(data.wind.speed * 3.6),
    precipChance: data.rain ? 80 : data.clouds?.all > 70 ? 50 : 10,
    condition: conditionMap[data.weather?.[0]?.main] || "흐림",
    humidity: data.main.humidity,
  };
  return { weather: mapped, isReal: true };
}

export function useWeather(mountainId: number, lat: number, lng: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["weather", "current", lat, lng],
    queryFn: () => fetchCurrentWeather(mountainId, lat, lng),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return {
    weather: data?.weather ?? getMockWeather(mountainId),
    loading: isLoading,
    isReal: data?.isReal ?? false,
    refetch,
  };
}

export interface ForecastDay {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: MockWeatherData["condition"];
  precipChance: number;
}

async function fetchForecastData(lat: number, lng: number): Promise<ForecastDay[]> {
  const { data, error } = await supabase.functions
    .invoke("get-weather", { body: { lat, lon: lng, type: "forecast" } })
    .catch(() => ({ data: null, error: new Error("Network error") }));

  if (error || (data as any)?.error || !(data as any)?.list) return [];

  const byDay = new Map<string, any[]>();
  for (const item of (data as any).list) {
    const date = item.dt_txt.split(" ")[0];
    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date)!.push(item);
  }

  const days: ForecastDay[] = [];
  byDay.forEach((entries, date) => {
    const midday = entries.find((e: any) => e.dt_txt.includes("12:00")) || entries[0];
    const temps = entries.map((e: any) => e.main.temp);
    days.push({
      date,
      temp: Math.round(midday.main.temp),
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      condition: conditionMap[midday.weather?.[0]?.main] || "흐림",
      precipChance: midday.pop ? Math.round(midday.pop * 100) : 0,
    });
  });

  return days.slice(0, 7);
}

export function useForecast(lat: number, lng: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["weather", "forecast", lat, lng],
    queryFn: () => fetchForecastData(lat, lng),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return { forecast: data ?? [], loading: isLoading, refetch };
}
