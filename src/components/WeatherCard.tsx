import { useWeather, useForecast } from "@/hooks/useWeather";
import { getOutfitRecommendations } from "@/data/mockWeather";
import { useMountains } from "@/contexts/MountainsContext";
import { Sun, Cloud, CloudRain, CloudSnow, CloudSun, Loader2 } from "lucide-react";
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
  const { mountains } = useMountains();
  const mountain = mountains.find((m) => m.id === mountainId);
  const lat = mountain?.lat ?? 37.5;
  const lng = mountain?.lng ?? 127.0;

  const { weather, loading, isReal } = useWeather(mountainId, lat, lng);
  const { forecast } = useForecast(lat, lng);
  const recommendations = getOutfitRecommendations(weather);
  const CondIcon = conditionIcons[weather.condition] || Cloud;

  return (
    <div className="space-y-4">
      {/* 1. 현재 날씨 card */}
      <div
        className="bg-card"
        style={{
          border: "0.5px solid hsl(var(--border))",
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: temp + condition */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <CondIcon className="text-primary" style={{ width: 36, height: 36 }} />
              <span className="text-foreground" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1 }}>
                {weather.temp}°
              </span>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 6 }}>
              체감 {weather.feelsLike}°
              {!isReal && " · 예상"}
              {loading && " · 갱신 중"}
            </p>
          </div>

          {/* Right: 3 mini metrics column */}
          <div className="flex flex-col gap-1.5 text-right">
            <MiniMetric label="풍속" value={`${weather.windSpeed}km/h`} />
            <MiniMetric label="강수확률" value={`${weather.precipChance}%`} />
            <MiniMetric label="습도" value={`${weather.humidity}%`} />
          </div>
        </div>
      </div>

      {/* 2. 주간 예보 */}
      {forecast.length > 0 && (
        <div>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 8 }}>주간 예보</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {forecast.map((day) => {
              const DayIcon = conditionIcons[day.condition] || Cloud;
              return (
                <div
                  key={day.date}
                  className="bg-card flex flex-col items-center justify-center flex-shrink-0"
                  style={{
                    width: 60,
                    border: "0.5px solid hsl(var(--border))",
                    borderRadius: 10,
                    padding: "8px 4px",
                    gap: 4,
                  }}
                >
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                    {format(new Date(day.date), "E", { locale: ko })}
                  </p>
                  <DayIcon className="text-primary/80" style={{ width: 18, height: 18 }} />
                  <p className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>{day.temp}°</p>
                  <p className="text-muted-foreground" style={{ fontSize: 10 }}>
                    {day.tempMin}°/{day.tempMax}°
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 복장 추천 card */}
      <div
        className="bg-secondary/50"
        style={{
          borderRadius: 12,
          padding: 14,
        }}
      >
        <p className="text-foreground" style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
          오늘의 복장 추천
        </p>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span
                className="bg-primary/10 text-primary flex-shrink-0 inline-flex items-center justify-center"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  borderRadius: 6,
                  padding: "3px 6px",
                  minWidth: 36,
                }}
              >
                {rec.category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>{rec.item}</p>
                <p className="text-muted-foreground truncate" style={{ fontSize: 11 }}>{rec.reason}</p>
              </div>
              <div
                className="flex-shrink-0 overflow-hidden"
                style={{ width: 24, height: 24, borderRadius: 4 }}
              >
                {rec.sponsorImageUrl ? (
                  <img src={rec.sponsorImageUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-end gap-1.5">
      <span className="text-muted-foreground" style={{ fontSize: 10 }}>{label}</span>
      <span className="text-foreground" style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
