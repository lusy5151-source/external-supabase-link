/**
 * characterQuiz.ts
 * 캐릭터 매칭 퀴즈 공통 모듈 — OnboardingFlow & CharacterSelectionPage가 함께 사용한다.
 *
 * 도롱이(dorong)는 직접 선택 전용 — 퀴즈 매칭 결과에는 등장하지 않는다.
 */

import type { Character } from "@/components/CharacterAnimation";

export type Scores = Record<Character, number>;

export interface QuizOption {
  label: string;
  scores: Partial<Scores>;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export const INITIAL_SCORES: Scores = {
  oreumi: 0,
  wandeung: 0,
  dorami: 0,
  pongdang: 0,
  dorong: 0,
  gaia: 0,
  peggy: 0,
};

export const QUIZZES: QuizQuestion[] = [
  {
    question: "산에 오르는 가장 큰 이유는?",
    options: [
      { label: "정상을 정복하고 기록을 남기려고", scores: { wandeung: 1 } },
      { label: "복잡한 머리를 비우고 쉬려고", scores: { pongdang: 1 } },
      { label: "멋진 풍경과 명산을 보려고", scores: { gaia: 1 } },
      { label: "그냥… 한번 가보고 싶어서", scores: { oreumi: 1 } },
    ],
  },
  {
    question: "산행 전 나의 모습은?",
    options: [
      { label: "날씨·장비·코스 꼼꼼히 점검", scores: { dorami: 1 } },
      { label: "일단 가서 부딪혀 본다", scores: { oreumi: 1 } },
      { label: "코스 역사랑 정보부터 찾아본다", scores: { gaia: 1 } },
      { label: "간식이랑 쉴 자리부터 챙긴다", scores: { pongdang: 1 } },
    ],
  },
  {
    question: "산에서 제일 신경 쓰이는 건?",
    options: [
      { label: "정상까지 남은 시간", scores: { wandeung: 1 } },
      { label: "바닥에 떨어진 쓰레기", scores: { peggy: 1 } },
      { label: "길과 안전", scores: { dorami: 1 } },
      { label: "눈앞의 경치", scores: { gaia: 1 } },
    ],
  },
  {
    question: "등산 후 SNS에 올린다면?",
    options: [
      { label: "정상 인증샷 + 완등 기록", scores: { wandeung: 1 } },
      { label: "쓰레기 줍기 인증 한 컷", scores: { peggy: 1 } },
      { label: "능선·운해 풍경 사진", scores: { gaia: 1 } },
      { label: "쉼터에서 먹은 간식", scores: { pongdang: 1 } },
    ],
  },
  {
    question: "나에게 산이란?",
    options: [
      { label: "정복할 도전", scores: { wandeung: 1 } },
      { label: "쉬어가는 쉼터", scores: { pongdang: 1 } },
      { label: "함께 지키는 터전", scores: { peggy: 1 } },
      { label: "설레는 첫걸음", scores: { oreumi: 1 } },
    ],
  },
  {
    question: "등산 코스를 고른다면?",
    options: [
      { label: "최단 시간 정상 코스", scores: { wandeung: 1 } },
      { label: "안전하고 정비 잘 된 코스", scores: { dorami: 1 } },
      { label: "계곡 끼고 도는 둘레길", scores: { pongdang: 1 } },
      { label: "명산의 대표 코스", scores: { gaia: 1 } },
    ],
  },
  {
    question: "일행 사이에서 나는?",
    options: [
      { label: "앞장서서 끌어주는 리더", scores: { wandeung: 1 } },
      { label: "뒤에서 안전 챙기는 사람", scores: { dorami: 1 } },
      { label: "분위기 풀고 쉬자는 사람", scores: { pongdang: 1 } },
      { label: "\u2018쓰레기 줍고 가자\u2019는 사람", scores: { peggy: 1 } },
    ],
  },
  {
    question: "정상에 도착하면?",
    options: [
      { label: "바로 인증샷 찍고 다음 산 계획", scores: { wandeung: 1 } },
      { label: "한참 앉아서 풍경 감상", scores: { gaia: 1 } },
      { label: "신나서 폴짝폴짝", scores: { oreumi: 1 } },
      { label: "쓰레기 없나 한 바퀴 둘러보기", scores: { peggy: 1 } },
    ],
  },
];

export const CHARACTER_RESULT: Partial<
  Record<Character, { name: string; type: string; desc: string; quote: string }>
> = {
  wandeung: {
    name: "완등이",
    type: "정상 정복가",
    desc: "끝을 봐야 직성이 풀리는 당신. 깃발을 꽂아야 하루가 완성돼요.",
    quote: "올랐으면 인증까지. 기록이 남아야 진짜 완등이지!",
  },
  oreumi: {
    name: "오름이",
    type: "새싹 등산러",
    desc: "산이 아직 설레는 당신. 높지 않아도, 천천히여도 괜찮아요.",
    quote: "이 산 진짜 정상 맞아…? 그래도 같이 가요!",
  },
  pongdang: {
    name: "퐁당이",
    type: "힐링 산책러",
    desc: "정상보다 쉼이 좋은 당신. 산은 경쟁이 아니라 회복이니까.",
    quote: "잠깐 쉬었다 가. 계곡 물소리 듣고 가자.",
  },
  dorami: {
    name: "도라미",
    type: "든든한 지킴이",
    desc: "준비 없인 안 오르는 당신. 말은 없어도 안전은 챙겨요.",
    quote: "…(끄덕) 체크리스트는 봤지?",
  },
  gaia: {
    name: "가이아",
    type: "산을 아는 자",
    desc: "풍경과 산의 시간을 음미하는 당신. 명산이 당신을 기다려요.",
    quote: "정상은 도착점이 아니라, 산을 읽는 자리야.",
  },
  peggy: {
    name: "페기",
    type: "클린 하이커",
    desc: "산을 지키는 당신. 가져온 만큼 산이 깨끗해져요.",
    quote: "버려두고 가지 마. 산은 깨끗해야 산이지.",
  },
};

// 동점 시 우선순위 (희소 캐릭터 우선). dorong은 퀴즈 매칭 대상 아님.
export const TIE_BREAK_ORDER: Character[] = [
  "dorami",
  "oreumi",
  "peggy",
  "gaia",
  "pongdang",
  "wandeung",
];

export function computeTopCharacter(scores: Scores): Character {
  let bestScore = -Infinity;
  (Object.keys(scores) as Character[]).forEach((c) => {
    if (c === "dorong") return; // 퀴즈 매칭에서 제외
    if (scores[c] > bestScore) bestScore = scores[c];
  });
  for (const c of TIE_BREAK_ORDER) {
    if ((scores[c] ?? 0) === bestScore) return c;
  }
  return "oreumi";
}
