export interface MockWeatherData {
  temp: number;
  feelsLike: number;
  windSpeed: number;
  precipChance: number;
  condition: "맑음" | "구름" | "흐림" | "비" | "눈";
  humidity: number;
}

export interface OutfitRecommendation {
  category: string;
  item: string;
  reason: string;
}

export function getMockWeather(mountainId: number): MockWeatherData {
  const seed = (mountainId * 7 + 13) % 30;
  return {
    temp: 5 + seed,
    feelsLike: 3 + seed,
    windSpeed: 5 + (seed % 15),
    precipChance: (seed * 3) % 80,
    condition: seed > 20 ? "흐림" : seed > 10 ? "구름" : "맑음",
    humidity: 40 + (seed % 40),
  };
}

export function getOutfitRecommendations(weather: MockWeatherData): OutfitRecommendation[] {
  const recs: OutfitRecommendation[] = [];
  if (weather.temp < 5) {
    recs.push({ category: "상의", item: "패딩 재킷", reason: "기온이 낮아 보온이 필요합니다" });
    recs.push({ category: "하의", item: "기모 바지", reason: "추운 날씨에 적합합니다" });
  } else if (weather.temp < 15) {
    recs.push({ category: "상의", item: "플리스 + 바람막이", reason: "쌀쌀한 날씨에 레이어링이 좋습니다" });
  } else {
    recs.push({ category: "상의", item: "기능성 반팔", reason: "따뜻한 날씨에 적합합니다" });
  }
  if (weather.precipChance > 40) {
    recs.push({ category: "우비", item: "방수 재킷", reason: `강수 확률 ${weather.precipChance}%` });
  }
  recs.push({ category: "신발", item: "등산화", reason: "안전한 산행을 위해 필수입니다" });
  return recs;
}
