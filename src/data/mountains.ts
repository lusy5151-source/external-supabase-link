export interface TrailInfo {
  name: string;
  distance: string;
  duration: string;
  startingPoint: string;
}

export interface Mountain {
  id: number;
  name: string;
  nameKo: string;
  height: number;
  region: string;
  lat: number;
  lng: number;
  difficulty: string;
  description: string;
  is_baekdu: boolean;
  trails: TrailInfo[];
}

export const mountains: Mountain[] = [
  { id: 1, name: "Bukhansan", nameKo: "북한산", height: 836, region: "서울·경기", lat: 37.6584, lng: 126.9780, difficulty: "보통", description: "서울 도심에서 가장 가까운 국립공원", is_baekdu: true, trails: [{ name: "백운대 코스", distance: "3.4km", duration: "2시간", startingPoint: "북한산성 탐방지원센터" }] },
  { id: 2, name: "Hallasan", nameKo: "한라산", height: 1950, region: "제주", lat: 33.3617, lng: 126.5292, difficulty: "어려움", description: "대한민국 최고봉", is_baekdu: true, trails: [{ name: "성판악 코스", distance: "9.6km", duration: "4시간 30분", startingPoint: "성판악 탐방로" }] },
  { id: 3, name: "Jirisan", nameKo: "지리산", height: 1915, region: "경남", lat: 35.3372, lng: 127.7306, difficulty: "어려움", description: "한국 최초의 국립공원", is_baekdu: true, trails: [{ name: "천왕봉 코스", distance: "10.7km", duration: "5시간", startingPoint: "중산리 탐방로" }] },
  { id: 4, name: "Seoraksan", nameKo: "설악산", height: 1708, region: "강원", lat: 38.1194, lng: 128.4656, difficulty: "어려움", description: "한국의 대표적인 산악 경관", is_baekdu: true, trails: [{ name: "대청봉 코스", distance: "8.4km", duration: "5시간", startingPoint: "오색 탐방로" }] },
  { id: 5, name: "Dobongsan", nameKo: "도봉산", height: 740, region: "서울·경기", lat: 37.6972, lng: 127.0153, difficulty: "보통", description: "서울 북부의 대표 산", is_baekdu: true, trails: [{ name: "신선대 코스", distance: "3.2km", duration: "2시간", startingPoint: "도봉탐방지원센터" }] },
  { id: 6, name: "Gwanaksan", nameKo: "관악산", height: 632, region: "서울·경기", lat: 37.4431, lng: 126.9639, difficulty: "보통", description: "서울 남부의 명산", is_baekdu: true, trails: [{ name: "연주대 코스", distance: "3.0km", duration: "1시간 30분", startingPoint: "관악산공원 입구" }] },
  { id: 7, name: "Chiaksan", nameKo: "치악산", height: 1288, region: "강원", lat: 37.3694, lng: 128.0500, difficulty: "어려움", description: "강원도 원주의 명산", is_baekdu: true, trails: [{ name: "비로봉 코스", distance: "5.8km", duration: "3시간", startingPoint: "구룡사 입구" }] },
  { id: 8, name: "Songnisan", nameKo: "속리산", height: 1058, region: "충북", lat: 36.5428, lng: 127.8594, difficulty: "보통", description: "충북의 명산 속리산", is_baekdu: true, trails: [{ name: "천왕봉 코스", distance: "4.5km", duration: "2시간 30분", startingPoint: "법주사 입구" }] },
  { id: 9, name: "Deogyusan", nameKo: "덕유산", height: 1614, region: "전북", lat: 35.8519, lng: 127.7456, difficulty: "보통", description: "겨울 설경이 아름다운 산", is_baekdu: true, trails: [{ name: "향적봉 코스", distance: "3.2km", duration: "1시간 30분", startingPoint: "무주리조트 곤돌라" }] },
  { id: 10, name: "Gyeryongsan", nameKo: "계룡산", height: 845, region: "충남", lat: 36.3433, lng: 127.2056, difficulty: "보통", description: "풍수지리의 명산", is_baekdu: true, trails: [{ name: "천황봉 코스", distance: "3.5km", duration: "2시간", startingPoint: "동학사 입구" }] },
];
