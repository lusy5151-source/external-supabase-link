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
  sponsorImageUrl?: string;
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
  // 상의
  let top: OutfitRecommendation;
  if (weather.temp < 5) {
    top = { category: "상의", item: "패딩 재킷", reason: "기온이 낮아 보온 필수" };
  } else if (weather.temp < 15) {
    top = { category: "상의", item: "플리스 + 바람막이", reason: "쌀쌀해 레이어링 권장" };
  } else if (weather.temp < 22) {
    top = { category: "상의", item: "긴팔 기능성 티", reason: "선선한 산행 적정 온도" };
  } else {
    top = { category: "상의", item: "기능성 반팔", reason: "따뜻해 통기성 우선" };
  }
  if (weather.windSpeed > 25) {
    top.reason += ` · 바람 ${weather.windSpeed}km/h`;
  }
  recs.push(top);

  // 우비 / 바람막이
  if (weather.precipChance >= 40) {
    recs.push({ category: "우비", item: "방수 재킷", reason: `강수 확률 ${weather.precipChance}%` });
  } else if (weather.windSpeed > 20) {
    recs.push({ category: "우비", item: "경량 바람막이", reason: `바람 ${weather.windSpeed}km/h` });
  } else {
    recs.push({ category: "우비", item: "휴대용 우비", reason: "산 날씨 대비용" });
  }

  // 신발
  recs.push({ category: "신발", item: "등산화", reason: weather.precipChance >= 40 ? "미끄럼 방지 방수화 권장" : "발목 보호 필수" });

  return recs;
}
