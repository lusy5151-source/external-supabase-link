export interface BadgeDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: BadgeCategory;
  condition: BadgeCondition;
}

export type BadgeCategory = "starter" | "milestone" | "seasonal" | "special" | "weather" | "shared";

export interface BadgeCondition {
  type: "completedCount" | "specificMountain" | "weather" | "firstAction" | "seasonal" | "sharedParticipants";
  value?: number;
  mountainId?: number;
  weatherCondition?: string;
  season?: string;
  actionType?: string;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

export const badgeCategories: Record<BadgeCategory, { label: string; icon: string }> = {
  starter: { label: "시작의 발걸음", icon: "🌱" },
  milestone: { label: "이정표", icon: "🏆" },
  seasonal: { label: "계절 탐험", icon: "🍂" },
  special: { label: "명산 정복", icon: "⛰️" },
  weather: { label: "날씨 도전", icon: "🌧️" },
  shared: { label: "공동 완등", icon: "👥" },
};

export const badges: BadgeDefinition[] = [
  { id: "first-hike", name: "첫 발자국", icon: "👣", description: "첫 번째 산을 완등하세요", category: "starter", condition: { type: "completedCount", value: 1 } },
  { id: "first-journal", name: "기록의 시작", icon: "📝", description: "첫 번째 등산 기록에 메모를 남기세요", category: "starter", condition: { type: "firstAction", actionType: "journal" } },
  { id: "first-photo", name: "풍경 수집가", icon: "📸", description: "첫 번째 등산 사진을 업로드하세요", category: "starter", condition: { type: "firstAction", actionType: "photo" } },
  { id: "first-gear", name: "장비 마스터", icon: "🎒", description: "첫 번째 장비를 등록하세요", category: "starter", condition: { type: "firstAction", actionType: "gear" } },
  { id: "hike-5", name: "초보 등산가", icon: "🥾", description: "5개의 산을 완등하세요", category: "milestone", condition: { type: "completedCount", value: 5 } },
  { id: "hike-10", name: "열정 등산가", icon: "🔥", description: "10개의 산을 완등하세요", category: "milestone", condition: { type: "completedCount", value: 10 } },
  { id: "hike-20", name: "산악 모험가", icon: "🗻", description: "20개의 산을 완등하세요", category: "milestone", condition: { type: "completedCount", value: 20 } },
  { id: "hike-50", name: "산의 달인", icon: "👑", description: "50개의 산을 완등하세요", category: "milestone", condition: { type: "completedCount", value: 50 } },
  { id: "hike-100", name: "완등 마스터", icon: "🎖️", description: "100개의 산을 모두 완등하세요", category: "milestone", condition: { type: "completedCount", value: 100 } },
  { id: "hallasan", name: "한라산 정복", icon: "🌋", description: "대한민국 최고봉 한라산을 완등하세요", category: "special", condition: { type: "specificMountain", mountainId: 1 } },
  { id: "jirisan", name: "지리산 정복", icon: "🌄", description: "한국 최초 국립공원 지리산을 완등하세요", category: "special", condition: { type: "specificMountain", mountainId: 2 } },
  { id: "seoraksan", name: "설악산 정복", icon: "🏔️", description: "기암괴석의 설악산을 완등하세요", category: "special", condition: { type: "specificMountain", mountainId: 3 } },
  { id: "rain-hiker", name: "빗속의 등산가", icon: "🌧️", description: "비 오는 날 등산을 완료하세요", category: "weather", condition: { type: "weather", weatherCondition: "비" } },
  { id: "snow-hiker", name: "설원의 모험가", icon: "❄️", description: "눈 오는 날 등산을 완료하세요", category: "weather", condition: { type: "weather", weatherCondition: "눈" } },
  { id: "spring-bloom", name: "봄꽃 산행", icon: "🌸", description: "봄(3~5월)에 등산을 완료하세요", category: "seasonal", condition: { type: "seasonal", season: "spring" } },
  { id: "summer-green", name: "여름 녹음", icon: "🌿", description: "여름(6~8월)에 등산을 완료하세요", category: "seasonal", condition: { type: "seasonal", season: "summer" } },
  { id: "autumn-foliage", name: "가을 단풍", icon: "🍁", description: "가을(9~11월)에 등산을 완료하세요", category: "seasonal", condition: { type: "seasonal", season: "autumn" } },
  { id: "winter-snow", name: "겨울 설산", icon: "⛄", description: "겨울(12~2월)에 등산을 완료하세요", category: "seasonal", condition: { type: "seasonal", season: "winter" } },
  { id: "first-shared", name: "첫 공동 완등", icon: "🤝", description: "처음으로 친구와 함께 완등하세요", category: "shared", condition: { type: "sharedParticipants", value: 2 } },
  { id: "shared-3", name: "3인 공동 등산", icon: "👥", description: "3명 이상과 공동 완등을 달성하세요", category: "shared", condition: { type: "sharedParticipants", value: 3 } },
];
