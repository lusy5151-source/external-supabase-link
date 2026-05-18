/**
 * CharacterAnimation.tsx
 * 완등 앱 - 캐릭터 통합 애니메이션 컴포넌트
 *
 * 사용법:
 *   <CharacterAnimation character="oreumi" emotion="normal" size={160} />
 *   <CharacterAnimation character={userCharacter} emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   character  - 'oreumi' | 'wandeung' | 'dorami' | 'pongdang' | 'dorong' | 'gaia' | 'peggy'
 *   emotion    - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size       - 숫자 (px), 기본 160
 *   stageWidth - 굴러다닐 너비 (dorami normal 전용, 기본 300)
 *   onTap      - 탭 콜백 (선택)
 *
 * ─────────────────────────────────────────────
 * 감정 자동 결정 예시 (profiles + 앱 상태 연동):
 *
 *   const emotion = useMemo<Emotion>(() => {
 *     if (summitCertFailed)                    return 'angry'   // 정상 인증 실패
 *     if (planCancelled)                       return 'sad'     // 등산 계획 취소
 *     const m = new Date().getMonth() + 1
 *     if (m >= 9 && m <= 11)                   return 'autumn'  // 가을 시즌
 *     return 'normal'
 *   }, [summitCertFailed, planCancelled])
 *
 * ─────────────────────────────────────────────
 * Supabase 연동:
 *   profiles 테이블의 character_id 컬럼값을 character prop에 그대로 넣으면 됩니다.
 *   예: SELECT character_id FROM profiles WHERE id = auth.uid()
 */

import OreumAnimation    from './OreumAnimation'
import WandeungAnimation from './WandeungAnimation'
import DoramiAnimation   from './DoramiAnimation'
import PongdangAnimation from './PongdangAnimation'
import DorongAnimation   from './DorongAnimation'
import GaiaAnimation     from './GaiaAnimation'
import PeggyAnimation    from './PeggyAnimation'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
export type Character =
  | 'oreumi'
  | 'wandeung'
  | 'dorami'
  | 'pongdang'
  | 'dorong'
  | 'gaia'
  | 'peggy'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

// ─────────────────────────────────────────────
// 캐릭터 메타데이터 (온보딩 선택 화면 등에 활용)
// ─────────────────────────────────────────────
export const CHARACTER_META: Record<Character, {
  name:   string
  type:   string         // 등산 스타일 유형
  desc:   string
  tagBg:  string
  tagCol: string
}> = {
  oreumi:   { name: '오름이',  type: '도전형', desc: '새로운 봉우리에 언제나 도전해요',    tagBg: '#E6F1FB', tagCol: '#185FA5' },
  wandeung: { name: '완등이',  type: '목표형', desc: '정상을 향해 묵묵히 한 걸음씩',       tagBg: '#EAF3DE', tagCol: '#3B6D11' },
  dorami:   { name: '도라미',  type: '탐구형', desc: '산의 지형을 꿰뚫어 보는 지식 탐구가', tagBg: '#F1EFE8', tagCol: '#5F5E5A' },
  pongdang: { name: '퐁당이',  type: '감성형', desc: '구름처럼 자유롭게 산을 유영해요',    tagBg: '#EEEDFE', tagCol: '#3C3489' },
  dorong:   { name: '도롱이',  type: '자유형', desc: '똑똑 떨어지듯 가볍게 산을 즐겨요',   tagBg: '#E0F5FF', tagCol: '#1A7A9F' },
  gaia:     { name: '가이아',  type: '우아형', desc: '대지처럼 묵직하고 우아하게',          tagBg: '#EAF3DE', tagCol: '#3B6D11' },
  peggy:    { name: '페기',    type: '개척형', desc: '아무도 안 간 길을 먼저 개척해요',     tagBg: '#FAECE7', tagCol: '#993C1D' },
}

// ─────────────────────────────────────────────
// 등산 스타일 → 캐릭터 추천 매핑
// (온보딩에서 등산스타일 선택 후 자동 추천에 사용)
// ─────────────────────────────────────────────
export const STYLE_TO_CHARACTER: Record<string, Character> = {
  '정상 정복':   'oreumi',
  '목표 달성':   'wandeung',
  '트레킹 탐방': 'dorami',
  '감성 힐링':   'pongdang',
  '가볍게 산책': 'dorong',
  '자연 감상':   'gaia',
  '새로운 루트': 'peggy',
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface CharacterAnimationProps {
  character:   Character
  emotion?:    Emotion
  size?:       number
  stageWidth?: number   // dorami normal 전용
  onTap?:      () => void
}

// ─────────────────────────────────────────────
// 통합 컴포넌트
// ─────────────────────────────────────────────
export default function CharacterAnimation({
  character,
  emotion = 'normal',
  size = 160,
  stageWidth,
  onTap,
}: CharacterAnimationProps) {

  const props = { emotion, size, onTap }

  switch (character) {
    case 'oreumi':
      return <OreumAnimation    {...props} />

    case 'wandeung':
      return <WandeungAnimation {...props} />

    case 'dorami':
      return <DoramiAnimation   {...props} stageWidth={stageWidth} />

    case 'pongdang':
      return <PongdangAnimation {...props} />

    case 'dorong':
      return <DorongAnimation   {...props} />

    case 'gaia':
      return <GaiaAnimation     {...props} />

    case 'peggy':
      return <PeggyAnimation    {...props} />

    default:
      return <OreumAnimation    {...props} />
  }
}
