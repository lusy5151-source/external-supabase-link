export interface BadgeCondition {
  type: "completedCount" | "specificMountain" | "weather" | "firstAction" | "seasonal" | "sharedParticipants";
  value?: number;
  mountainId?: number;
  weatherCondition?: string;
  actionType?: string;
  season?: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: BadgeCondition;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

export const badges: BadgeDefinition[] = [
  { id: "first-summit", name: "첫 정상", description: "첫 번째 산을 완등했습니다!", icon: "⛰️", condition: { type: "completedCount", value: 1 } },
  { id: "five-summits", name: "다섯 봉우리", description: "5개의 산을 완등했습니다!", icon: "🏔️", condition: { type: "completedCount", value: 5 } },
  { id: "ten-summits", name: "열 봉우리", description: "10개의 산을 완등했습니다!", icon: "🗻", condition: { type: "completedCount", value: 10 } },
  { id: "twenty-summits", name: "스무 봉우리", description: "20개의 산을 완등했습니다!", icon: "🌄", condition: { type: "completedCount", value: 20 } },
  { id: "fifty-summits", name: "오십 봉우리", description: "50개의 산을 완등했습니다!", icon: "🏆", condition: { type: "completedCount", value: 50 } },
  { id: "hundred-summits", name: "백대명산 완등", description: "100개의 산을 모두 완등했습니다!", icon: "👑", condition: { type: "completedCount", value: 100 } },
  { id: "rain-hiker", name: "비 속의 등산가", description: "비 오는 날 등산했습니다", icon: "🌧️", condition: { type: "weather", weatherCondition: "🌧️ 비" } },
  { id: "snow-hiker", name: "눈 속의 등산가", description: "눈 오는 날 등산했습니다", icon: "❄️", condition: { type: "weather", weatherCondition: "❄️ 눈" } },
  { id: "first-journal", name: "첫 일지", description: "첫 등산 일지를 작성했습니다", icon: "📝", condition: { type: "firstAction", actionType: "journal" } },
  { id: "first-photo", name: "첫 사진", description: "첫 등산 사진을 올렸습니다", icon: "📸", condition: { type: "firstAction", actionType: "photo" } },
  { id: "first-gear", name: "장비왕", description: "첫 장비를 등록했습니다", icon: "🎒", condition: { type: "firstAction", actionType: "gear" } },
  { id: "spring-hiker", name: "봄 등산가", description: "봄에 등산했습니다", icon: "🌸", condition: { type: "seasonal", season: "spring" } },
  { id: "summer-hiker", name: "여름 등산가", description: "여름에 등산했습니다", icon: "☀️", condition: { type: "seasonal", season: "summer" } },
  { id: "autumn-hiker", name: "가을 등산가", description: "가을에 등산했습니다", icon: "🍂", condition: { type: "seasonal", season: "autumn" } },
  { id: "winter-hiker", name: "겨울 등산가", description: "겨울에 등산했습니다", icon: "⛄", condition: { type: "seasonal", season: "winter" } },
  { id: "team-player", name: "함께 걷는 사람", description: "3명 이상과 함께 등산했습니다", icon: "👥", condition: { type: "sharedParticipants", value: 3 } },
];
