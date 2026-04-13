export interface DemoJournal {
  id: string; isDemo: true; mountain_id: number; notes: string; photos: string[];
  weather: string; difficulty: string; duration: string; course_name: string;
  hiked_at: string; visibility: "public"; like_count: number; comment_count: number;
  profile: { nickname: string; avatar_url: string | null };
}
export interface DemoActivityItem {
  id: string; isDemo: true; type: string; message: string; mountain_id: number | null;
  created_at: string; nickname: string;
}
const today = new Date();
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };
const hoursAgo = (n: number) => { const d = new Date(today); d.setHours(d.getHours() - n); return d.toISOString(); };

export const demoJournals: DemoJournal[] = [
  { id: "demo-1", isDemo: true, mountain_id: 1, notes: "백운대 정상에서 본 서울 전경이 정말 장관이었어요!", photos: [], weather: "☀️ 맑음", difficulty: "보통", duration: "3시간 20분", course_name: "백운대 코스", hiked_at: daysAgo(1), visibility: "public", like_count: 12, comment_count: 3, profile: { nickname: "산바람", avatar_url: null } },
  { id: "demo-2", isDemo: true, mountain_id: 6, notes: "설악산 대청봉 일출 감동!", photos: [], weather: "⛅ 구름", difficulty: "어려움", duration: "7시간 30분", course_name: "오색 코스", hiked_at: daysAgo(2), visibility: "public", like_count: 24, comment_count: 7, profile: { nickname: "산바람", avatar_url: null } },
  { id: "demo-3", isDemo: true, mountain_id: 3, notes: "노고단 운해가 환상적!", photos: [], weather: "☀️ 맑음", difficulty: "보통", duration: "2시간 40분", course_name: "노고단 코스", hiked_at: daysAgo(3), visibility: "public", like_count: 18, comment_count: 5, profile: { nickname: "숲속여행자", avatar_url: null } },
];
export const demoActivityFeed: DemoActivityItem[] = [
  { id: "demo-act-1", isDemo: true, type: "summit_claim", message: "산바람님이 북한산 백운대를 정복했습니다! 🏔️", mountain_id: 1, created_at: hoursAgo(2), nickname: "산바람" },
  { id: "demo-act-2", isDemo: true, type: "journal", message: "숲속여행자님이 지리산 등산 기록을 공유했습니다 📝", mountain_id: 3, created_at: hoursAgo(4), nickname: "숲속여행자" },
];
export const demoLeaderboard = [
  { user_id: "demo-user-1", nickname: "산바람", avatar_url: null, count: 47 },
  { user_id: "demo-user-2", nickname: "숲속여행자", avatar_url: null, count: 32 },
];
export const demoGroups = [
  { id: "demo-group-1", name: "서울 주말 등산회", description: "매주 주말 서울 근교 산 등산 모임", member_count: 24, isDemo: true },
  { id: "demo-group-2", name: "100대 명산 도전단", description: "백대명산 완등 목표 모임", member_count: 15, isDemo: true },
];
export const demoFriends = [
  { nickname: "산바람", bio: "매주 산 🏔️", completedCount: 47 },
  { nickname: "숲속여행자", bio: "자연 속 힐링 🌿", completedCount: 32 },
];
export const demoSummitClaims = [
  { id: "demo-sc-1", isDemo: true as const, mountain_id: 1, summit_name: "백운대", nickname: "산바람", avatar_url: null, claimed_at: hoursAgo(2), user_id: "demo-user-1" },
];
export const demoKingOfDay = { user_id: "demo-user-1", nickname: "산바람", avatar_url: null, claim_count: 3 };
export const demoProgress = { completedCount: 23, goalCount: 100, baekduCompleted: 12, baekduTotal: 100, earnedBadges: 7, totalBadges: 20, challengeProgress: 65 };
export const demoFeedItems: any[] = [];
