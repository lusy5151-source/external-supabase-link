import { useState, useEffect, useCallback, useRef } from "react";
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

// Simple in-memory cache
const weatherCache = new Map<string, { data: MockWeatherData; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function useWeather(mountainId: number, lat: number, lng: number) {
  const [weather, setWeather] = useState<MockWeatherData>(getMockWeather(mountainId));
  const [loading, setLoading] = useState(false);
  const [isReal, setIsReal] = useState(false);
  const fetchedRef = useRef(false);

  const fetchWeather = useCallback(async () => {
    const cacheKey = `${lat}-${lng}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setWeather(cached.data);
      setIsReal(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { lat, lon: lng, type: "current" },
      }).catch(() => ({ data: null, error: new Error("Network error") }));

      if (error || !data || data?.error) {
        // Fall back to mock data (handles 401/network errors gracefully)
        setWeather(getMockWeather(mountainId));
        setIsReal(false);
        return;
      }

      const mapped: MockWeatherData = {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        precipChance: data.rain ? 80 : data.clouds?.all > 70 ? 50 : 10,
        condition: conditionMap[data.weather?.[0]?.main] || "흐림",
        humidity: data.main.humidity,
      };

      weatherCache.set(cacheKey, { data: mapped, timestamp: Date.now() });
      setWeather(mapped);
      setIsReal(true);
    } catch {
      setWeather(getMockWeather(mountainId));
      setIsReal(false);
    } finally {
      setLoading(false);
    }
  }, [mountainId, lat, lng]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchWeather();
    }
  }, [fetchWeather]);

  return { weather, loading, isReal, refetch: fetchWeather };
}

export interface ForecastDay {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: MockWeatherData["condition"];
  precipChance: number;
}

const forecastCache = new Map<string, { data: ForecastDay[]; timestamp: number }>();

export function useForecast(lat: number, lng: number) {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchForecast = useCallback(async () => {
    const cacheKey = `forecast-${lat}-${lng}`;
    const cached = forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setForecast(cached.data);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { lat, lon: lng, type: "forecast" },
      }).catch(() => ({ data: null, error: new Error("Network error") }));

      if (error || data?.error || !data?.list) {
        setForecast([]);
        return;
      }

      // Group by day and pick midday entry
      const byDay = new Map<string, any[]>();
      for (const item of data.list) {
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

      const result = days.slice(0, 7);
      forecastCache.set(cacheKey, { data: result, timestamp: Date.now() });
      setForecast(result);
    } catch {
      setForecast([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchForecast();
    }
  }, [fetchForecast]);

  return { forecast, loading, refetch: fetchForecast };
}
