import { useWeather, useForecast } from "@/hooks/useWeather";
import { getOutfitRecommendations } from "@/data/mockWeather";
import { useMountains } from "@/contexts/MountainsContext";
import { Sun, Cloud, CloudRain, CloudSnow, CloudSun } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const conditionIconMap: Record<string, { Icon: any; color: string }> = {
  "맑음": { Icon: Sun, color: "#FAC775" },
  "구름": { Icon: CloudSun, color: "#B4B2A9" },
  "흐림": { Icon: Cloud, color: "#B4B2A9" },
  "비": { Icon: CloudRain, color: "#85B7EB" },
  "눈": { Icon: CloudSnow, color: "#B5D4F4" },
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#173404",
  borderLeft: "2.5px solid #c6d56c",
  paddingLeft: 8,
  margin: "12px 12px 8px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  margin: "0 12px 8px",
};

export function WeatherCard({ mountainId }: { mountainId: number }) {
  const { mountains } = useMountains();
  const mountain = mountains.find((m) => m.id === mountainId);
  const lat = mountain?.lat ?? 37.5;
  const lng = mountain?.lng ?? 127.0;

  const { weather, loading, isReal } = useWeather(mountainId, lat, lng);
  const { forecast, loading: forecastLoading } = useForecast(lat, lng);
  const recommendations = getOutfitRecommendations(weather);

  const cur = conditionIconMap[weather.condition] ?? conditionIconMap["흐림"];
  const CurIcon = cur.Icon;

  return (
    <div>
      {/* Section A: Current Weather */}
      <div style={{ ...cardStyle, padding: "14px 12px" }}>
        {loading && !isReal ? (
          <SkeletonBlock height={64} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CurIcon size={32} color={cur.color} strokeWidth={2} />
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: "#173404", lineHeight: 1, margin: 0 }}>
                {weather.temp}°
              </h2>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                체감 {weather.feelsLike}°{!isReal && " · 예상"}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <MetaLine label="풍속" value={`${weather.windSpeed}km/h`} />
              <MetaLine label="강수확률" value={`${weather.precipChance}%`} />
              <MetaLine label="습도" value={`${weather.humidity}%`} />
            </div>
          </div>
        )}
      </div>

      {/* Section B: Weekly Forecast */}
      <h3 style={sectionTitleStyle}>주간 예보</h3>
      {forecastLoading && forecast.length === 0 ? (
        <div style={{ margin: "0 12px" }}>
          <SkeletonBlock height={62} />
        </div>
      ) : forecast.length > 0 ? (
        <div
          style={{
            margin: "0 12px",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 4,
          }}
        >
          {forecast.slice(0, 6).map((day, idx) => {
            const dc = conditionIconMap[day.condition] ?? conditionIconMap["흐림"];
            const DIcon = dc.Icon;
            const dateObj = new Date(day.date);
            const dow = dateObj.getDay(); // 0 sun, 6 sat
            const isToday = idx === 0;
            const dayLabel = isToday ? "오늘" : format(dateObj, "E", { locale: ko });
            const dayColor = isToday
              ? "#c6d56c"
              : dow === 0 || dow === 6
              ? "#D85A30"
              : "#666";
            return (
              <div
                key={day.date}
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: "8px 2px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: dayColor,
                    fontWeight: isToday ? 600 : 400,
                    marginBottom: 2,
                  }}
                >
                  {dayLabel}
                </div>
                <DIcon size={14} color={dc.color} strokeWidth={2} style={{ display: "inline-block" }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "#173404", marginTop: 2 }}>
                  {day.temp}°
                </div>
                <div style={{ fontSize: 9, color: "#888" }}>
                  {day.tempMin}/{day.tempMax}°
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ margin: "0 12px", fontSize: 11, color: "#888", textAlign: "center", padding: 12 }}>
          예보 정보를 불러올 수 없어요
        </div>
      )}

      <div style={{ height: 8 }} />

      {/* Section C: Outfit Recommendations */}
      <div style={{ ...cardStyle, padding: 12 }}>
        <h3 style={{ ...sectionTitleStyle, margin: "0 0 8px" }}>오늘의 복장 추천</h3>
        {recommendations.length === 0 ? (
          <div style={{ fontSize: 11, color: "#888", textAlign: "center", padding: 16 }}>
            현재 날씨 데이터를 가져오는 중이에요
          </div>
        ) : (
          <div>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom:
                    i === recommendations.length - 1 ? "none" : "0.5px solid #f1efe8",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    background: "#EAF3DE",
                    color: "#27500A",
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: 8,
                  }}
                >
                  {rec.category}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#173404", margin: 0 }}>
                    {rec.item}
                  </p>
                  <p style={{ fontSize: 10, color: "#888", marginTop: 1, margin: 0 }}>
                    {rec.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>
      {label}
      <span style={{ fontWeight: 700, color: "#173404", marginLeft: 6 }}>{value}</span>
    </div>
  );
}

function SkeletonBlock({ height }: { height: number }) {
  return (
    <div
      style={{
        background: "#f1efe8",
        borderRadius: 10,
        height,
        width: "100%",
      }}
    />
  );
}
