import { useWeather, useForecast } from "@/hooks/useWeather";
import { getOutfitRecommendations } from "@/data/mockWeather";
import { mountains } from "@/data/mountains";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, CloudSun, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const conditionIcons: Record<string, any> = {
  "맑음": Sun,
  "구름": CloudSun,
  "흐림": Cloud,
  "비": CloudRain,
  "눈": CloudSnow,
};

export function WeatherCard({ mountainId }: { mountainId: number }) {
  const mountain = mountains.find((m) => m.id === mountainId);
  const lat = mountain?.lat ?? 37.5;
  const lng = mountain?.lng ?? 127.0;

  const { weather, loading, isReal } = useWeather(mountainId, lat, lng);
  const { forecast, loading: forecastLoading } = useForecast(lat, lng);
  const recommendations = getOutfitRecommendations(weather);
  const CondIcon = conditionIcons[weather.condition] || Cloud;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">현재 날씨</h2>
          <p className="text-xs text-muted-foreground">
            {isReal ? "실시간 데이터" : "예상 데이터 · 실제 날씨와 다를 수 있습니다"}
          </p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Weather overview */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <CondIcon className="h-10 w-10 text-primary" />
          <div>
            <p className="text-3xl font-bold text-foreground">{weather.temp}°C</p>
            <p className="text-xs text-muted-foreground">체감 {weather.feelsLike}°C</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3">
          <WeatherStat icon={Wind} label="풍속" value={`${weather.windSpeed}km/h`} />
          <WeatherStat icon={Droplets} label="강수 확률" value={`${weather.precipChance}%`} />
          <WeatherStat icon={Thermometer} label="습도" value={`${weather.humidity}%`} />
        </div>
      </div>

      {/* 7-day forecast */}
      {forecast.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">📅 주간 예보</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {forecast.map((day) => {
              const DayIcon = conditionIcons[day.condition] || Cloud;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1 rounded-lg bg-secondary/40 px-3 py-2 min-w-[60px]">
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(day.date), "E", { locale: ko })}
                  </p>
                  <DayIcon className="h-5 w-5 text-primary/70" />
                  <p className="text-xs font-semibold text-foreground">{day.temp}°</p>
                  <p className="text-[9px] text-muted-foreground">{day.tempMin}°/{day.tempMax}°</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outfit recommendations */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">🧥 복장 추천</h3>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3">
              <span className="mt-0.5 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary whitespace-nowrap">
                {rec.category}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{rec.item}</p>
                <p className="text-xs text-muted-foreground">{rec.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeatherStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}