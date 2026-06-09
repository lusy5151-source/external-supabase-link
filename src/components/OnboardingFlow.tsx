/**
 * OnboardingFlow.tsx
 * 완등 앱 - 닉네임 입력 + 캐릭터 추천 퀴즈 온보딩 플로우
 *
 * 사용법:
 *   <OnboardingFlow onComplete={(nickname, characterId) => { ... }} />
 */

import { useMemo, useState } from 'react'
import CharacterAnimation, {
  type Character,
  CHARACTER_META,
} from './CharacterAnimation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// 캐릭터별 테마 (그라디언트 / 버튼 컬러)
export const CHARACTER_THEME: Record<Character, {
  gradient: string
  primary: string
  shadow: string
}> = {
  oreumi:   { gradient: 'linear-gradient(160deg,#E6F1FB 0%,#F7FBFF 60%,#FFFFFF 100%)', primary: '#5BA8E0', shadow: '0 12px 28px -10px rgba(91,168,224,0.55)' },
  wandeung: { gradient: 'linear-gradient(160deg,#EAF3DE 0%,#F6FAEC 60%,#FFFFFF 100%)', primary: '#A8C66B', shadow: '0 12px 28px -10px rgba(168,198,107,0.6)' },
  dorami:   { gradient: 'linear-gradient(160deg,#F1EFE8 0%,#FAF8F2 60%,#FFFFFF 100%)', primary: '#9C8E6E', shadow: '0 12px 28px -10px rgba(156,142,110,0.55)' },
  pongdang: { gradient: 'linear-gradient(160deg,#EEEDFE 0%,#F7F6FE 60%,#FFFFFF 100%)', primary: '#8B7FE0', shadow: '0 12px 28px -10px rgba(139,127,224,0.55)' },
  dorong:   { gradient: 'linear-gradient(160deg,#E0F5FF 0%,#F2FAFF 60%,#FFFFFF 100%)', primary: '#5BB8D6', shadow: '0 12px 28px -10px rgba(91,184,214,0.55)' },
  gaia:     { gradient: 'linear-gradient(160deg,#EAF3DE 0%,#F6FAEC 60%,#FFFFFF 100%)', primary: '#6FA044', shadow: '0 12px 28px -10px rgba(111,160,68,0.55)' },
  peggy:    { gradient: 'linear-gradient(160deg,#FAECE7 0%,#FEF6F2 60%,#FFFFFF 100%)', primary: '#D97A4F', shadow: '0 12px 28px -10px rgba(217,122,79,0.55)' },
}

export const CONFETTI_COLORS = ['#FFD166','#EF476F','#06D6A0','#118AB2','#C7D66D','#F78C6B']

interface OnboardingFlowProps {
  onComplete: (nickname: string, characterId: string) => void
}

export type Scores = Record<Character, number>

export interface QuizOption {
  label: string
  scores: Partial<Scores>
}

export interface QuizQuestion {
  question: string
  options: QuizOption[]
}

export const QUIZZES: QuizQuestion[] = [
  {
    question: '산에 오르는 가장 큰 이유는?',
    options: [
      { label: '정상을 정복하고 기록을 남기려고', scores: { wandeung: 1 } },
      { label: '복잡한 머리를 비우고 쉬려고', scores: { pongdang: 1 } },
      { label: '멋진 풍경과 명산을 보려고', scores: { gaia: 1 } },
      { label: '그냥… 한번 가보고 싶어서', scores: { oreumi: 1 } },
    ],
  },
  {
    question: '산행 전 나의 모습은?',
    options: [
      { label: '날씨·장비·코스 꼼꼼히 점검', scores: { dorami: 1 } },
      { label: '일단 가서 부딪혀 본다', scores: { oreumi: 1 } },
      { label: '코스 역사랑 정보부터 찾아본다', scores: { gaia: 1 } },
      { label: '간식이랑 쉴 자리부터 챙긴다', scores: { pongdang: 1 } },
    ],
  },
  {
    question: '산에서 제일 신경 쓰이는 건?',
    options: [
      { label: '정상까지 남은 시간', scores: { wandeung: 1 } },
      { label: '바닥에 떨어진 쓰레기', scores: { peggy: 1 } },
      { label: '길과 안전', scores: { dorami: 1 } },
      { label: '눈앞의 경치', scores: { gaia: 1 } },
    ],
  },
  {
    question: '등산 후 SNS에 올린다면?',
    options: [
      { label: '정상 인증샷 + 완등 기록', scores: { wandeung: 1 } },
      { label: '쓰레기 줍기 인증 한 컷', scores: { peggy: 1 } },
      { label: '능선·운해 풍경 사진', scores: { gaia: 1 } },
      { label: '쉼터에서 먹은 간식', scores: { pongdang: 1 } },
    ],
  },
  {
    question: '나에게 산이란?',
    options: [
      { label: '정복할 도전', scores: { wandeung: 1 } },
      { label: '쉬어가는 쉼터', scores: { pongdang: 1 } },
      { label: '함께 지키는 터전', scores: { peggy: 1 } },
      { label: '설레는 첫걸음', scores: { oreumi: 1 } },
    ],
  },
  {
    question: '등산 코스를 고른다면?',
    options: [
      { label: '최단 시간 정상 코스', scores: { wandeung: 1 } },
      { label: '안전하고 정비 잘 된 코스', scores: { dorami: 1 } },
      { label: '계곡 끼고 도는 둘레길', scores: { pongdang: 1 } },
      { label: '명산의 대표 코스', scores: { gaia: 1 } },
    ],
  },
  {
    question: '일행 사이에서 나는?',
    options: [
      { label: '앞장서서 끌어주는 리더', scores: { wandeung: 1 } },
      { label: '뒤에서 안전 챙기는 사람', scores: { dorami: 1 } },
      { label: '분위기 풀고 쉬자는 사람', scores: { pongdang: 1 } },
      { label: '\u2018쓰레기 줍고 가자\u2019는 사람', scores: { peggy: 1 } },
    ],
  },
  {
    question: '정상에 도착하면?',
    options: [
      { label: '바로 인증샷 찍고 다음 산 계획', scores: { wandeung: 1 } },
      { label: '한참 앉아서 풍경 감상', scores: { gaia: 1 } },
      { label: '신나서 폴짝폴짝', scores: { oreumi: 1 } },
      { label: '쓰레기 없나 한 바퀴 둘러보기', scores: { peggy: 1 } },
    ],
  },
]

// 결과 카드 텍스트 (이름/타입/설명/quote) — 색상 등 나머지는 CHARACTER_META 유지
export const CHARACTER_RESULT: Partial<Record<Character, { name: string; type: string; desc: string; quote: string }>> = {
  wandeung: {
    name: '완등이',
    type: '정상 정복가',
    desc: '끝을 봐야 직성이 풀리는 당신. 깃발을 꽂아야 하루가 완성돼요.',
    quote: '올랐으면 인증까지. 기록이 남아야 진짜 완등이지!',
  },
  oreumi: {
    name: '오름이',
    type: '새싹 등산러',
    desc: '산이 아직 설레는 당신. 높지 않아도, 천천히여도 괜찮아요.',
    quote: '이 산 진짜 정상 맞아…? 그래도 같이 가요!',
  },
  pongdang: {
    name: '퐁당이',
    type: '힐링 산책러',
    desc: '정상보다 쉼이 좋은 당신. 산은 경쟁이 아니라 회복이니까.',
    quote: '잠깐 쉬었다 가. 계곡 물소리 듣고 가자.',
  },
  dorami: {
    name: '도라미',
    type: '든든한 지킴이',
    desc: '준비 없인 안 오르는 당신. 말은 없어도 안전은 챙겨요.',
    quote: '…(끄덕) 체크리스트는 봤지?',
  },
  gaia: {
    name: '가이아',
    type: '산을 아는 자',
    desc: '풍경과 산의 시간을 음미하는 당신. 명산이 당신을 기다려요.',
    quote: '정상은 도착점이 아니라, 산을 읽는 자리야.',
  },
  peggy: {
    name: '페기',
    type: '클린 하이커',
    desc: '산을 지키는 당신. 가져온 만큼 산이 깨끗해져요.',
    quote: '버려두고 가지 마. 산은 깨끗해야 산이지.',
  },
}

// 동점 시 우선순위 (희소 캐릭터 우선)
export const TIE_BREAK_ORDER: Character[] = ['dorami', 'oreumi', 'peggy', 'gaia', 'pongdang', 'wandeung']

export const INITIAL_SCORES: Scores = {
  oreumi: 0,
  wandeung: 0,
  dorami: 0,
  pongdang: 0,
  dorong: 0,
  gaia: 0,
  peggy: 0,
}

type Step = 'nickname' | 'quiz' | 'result'

export function QuizPanel({

  index,
  onSelect,
  style,
}: {
  index: number
  onSelect: (opt: QuizOption) => void
  style?: React.CSSProperties
}) {
  const q = QUIZZES[index]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, ...style }}>
      <div style={{ color: '#888', fontSize: 14 }}>
        {index + 1} / {QUIZZES.length}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#222', lineHeight: 1.4 }}>
        {q.question}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(opt)}
            style={{
              padding: '16px 18px',
              fontSize: 15,
              textAlign: 'left',
              color: '#222',
              background: '#FFF',
              border: '1px solid #E5E5E5',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#C7D66D'
              e.currentTarget.style.background = '#FAFBF0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E5E5'
              e.currentTarget.style.background = '#FFF'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('nickname')
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [quizIndex, setQuizIndex] = useState(0)
  const [scores, setScores] = useState<Scores>({ ...INITIAL_SCORES })
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const totalSteps = 1 + QUIZZES.length + 1
  const currentStepNum =
    step === 'nickname' ? 1 : step === 'quiz' ? 2 + quizIndex : totalSteps
  const progress = (currentStepNum / totalSteps) * 100

  const topCharacter = useMemo<Character>(() => {
    let bestScore = -Infinity
    ;(Object.keys(scores) as Character[]).forEach((c) => {
      if (scores[c] > bestScore) bestScore = scores[c]
    })
    // 동점 처리: TIE_BREAK_ORDER에서 가장 앞선 캐릭터 우선
    for (const c of TIE_BREAK_ORDER) {
      if ((scores[c] ?? 0) === bestScore) return c
    }
    return 'oreumi'
  }, [scores])

  const handleNicknameNext = () => {
    const trimmed = nickname.trim()
    if (trimmed.length < 2 || trimmed.length > 12) {
      setNicknameError('닉네임은 2~12자로 입력해주세요')
      return
    }
    setNicknameError('')
    setNickname(trimmed)
    setStep('quiz')
  }

  const handleOptionSelect = (option: QuizOption) => {
    if (outgoingIndex !== null) return
    setScores((prev) => {
      const next = { ...prev }
      ;(Object.keys(option.scores) as Character[]).forEach((c) => {
        next[c] = (next[c] ?? 0) + (option.scores[c] ?? 0)
      })
      return next
    })
    const currentIdx = quizIndex
    if (currentIdx < QUIZZES.length - 1) {
      setOutgoingIndex(currentIdx)
      setQuizIndex(currentIdx + 1)
      window.setTimeout(() => setOutgoingIndex(null), 320)
    } else {
      setStep('result')
    }
  }

  const handleComplete = async () => {
    if (saving) return
    if (!user?.id) {
      toast.error('로그인 정보를 찾을 수 없어요')
      return
    }
    setSaving(true)
    try {
      // NOTE: character_id intentionally not saved here.
      // Quiz result is only a recommendation — user manually confirms on CharacterSelectionPage.
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname,
          is_onboarded: true,
        })
        .eq('user_id', user.id)
      if (error) console.log('update error:', error)
      onComplete(nickname, topCharacter)
    } catch (err: any) {
      console.error('[OnboardingFlow] profile update failed', err)
      toast.error(err?.message || '저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const baseMeta = CHARACTER_META[topCharacter]
  const resultText = CHARACTER_RESULT[topCharacter]
  const meta = { ...baseMeta, ...(resultText ? { name: resultText.name, type: resultText.type, desc: resultText.desc } : {}) }
  const quote = resultText?.quote
  const theme = CHARACTER_THEME[topCharacter]

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: step === 'result' ? theme.gradient : '#FAFBF7',
        padding: '24px 20px',
        fontFamily: '"Noto Sans KR", sans-serif',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.6s ease',
      }}
    >
      {/* 진행바 */}
      <div
        style={{
          height: 6,
          background: '#EAEAEA',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#C7D66D',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 480,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {step === 'nickname' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#222' }}>
                반가워요!
              </h2>
              <p style={{ fontSize: 16, color: '#666', marginTop: 8 }}>
                완등에서 사용할 닉네임을 알려주세요.
              </p>
            </div>
            <div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 (2~12자)"
                maxLength={12}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 16,
                  border: `1px solid ${nicknameError ? '#E84C4C' : '#DDD'}`,
                  borderRadius: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {nicknameError && (
                <p style={{ color: '#E84C4C', fontSize: 13, marginTop: 8 }}>
                  {nicknameError}
                </p>
              )}
            </div>
            <button
              onClick={handleNicknameNext}
              style={{
                marginTop: 'auto',
                padding: '16px',
                fontSize: 16,
                fontWeight: 600,
                color: '#222',
                background: '#C7D66D',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
              }}
            >
              다음
            </button>
          </div>
        )}

        {step === 'quiz' && (
          <div style={{ position: 'relative', overflow: 'hidden', flex: 1 }}>
            <style>{`
              @keyframes ob-slideInRight { from{transform:translateX(100%);opacity:0.4} to{transform:translateX(0);opacity:1} }
              @keyframes ob-slideOutLeft { from{transform:translateX(0);opacity:1} to{transform:translateX(-100%);opacity:0.4} }
            `}</style>
            {outgoingIndex !== null && (
              <QuizPanel
                key={`out-${outgoingIndex}`}
                index={outgoingIndex}
                onSelect={() => {}}
                style={{
                  position: 'absolute',
                  inset: 0,
                  animation: 'ob-slideOutLeft 0.3s ease forwards',
                  pointerEvents: 'none',
                }}
              />
            )}
            <QuizPanel
              key={`in-${quizIndex}`}
              index={quizIndex}
              onSelect={handleOptionSelect}
              style={{
                position: 'relative',
                animation: outgoingIndex !== null ? 'ob-slideInRight 0.3s ease forwards' : undefined,
              }}
            />
          </div>
        )}

        {step === 'result' && (
          <>
            {/* keyframes */}
            <style>{`
              @keyframes ob-fadeInUp { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
              @keyframes ob-charPop { 0%{opacity:0;transform:scale(0)} 100%{opacity:1;transform:scale(1)} }
              @keyframes ob-starPop { 0%{opacity:0;transform:scale(0) rotate(0deg)} 60%{opacity:1;transform:scale(1.2) rotate(20deg)} 100%{opacity:0.85;transform:scale(1) rotate(0deg)} }
              @keyframes ob-confetti { 0%{transform:translateY(-40px) rotate(0deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0.9} }
              @keyframes ob-btnPulse { 0%,100%{box-shadow:0 12px 28px -10px var(--ob-shadow,rgba(0,0,0,0.2))} 50%{box-shadow:0 18px 36px -10px var(--ob-shadow,rgba(0,0,0,0.35))} }
            `}</style>

            {/* 색종이 confetti */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const left = (i * 8.3 + (i % 3) * 4) % 100
                const delay = (i % 6) * 0.25
                const duration = 2.6 + (i % 4) * 0.4
                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
                const w = 8 + (i % 3) * 3
                const h = 12 + (i % 2) * 4
                return (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      top: -20,
                      left: `${left}%`,
                      width: w,
                      height: h,
                      background: color,
                      borderRadius: 2,
                      animation: `ob-confetti ${duration}s ${delay}s linear forwards`,
                    }}
                  />
                )
              })}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  color: '#5a5a5a',
                  margin: 0,
                  opacity: 0,
                  animation: 'ob-fadeInUp 0.5s 0s forwards',
                }}
              >
                {nickname}님과 가장 잘 맞는 캐릭터는
              </p>

              {/* 캐릭터 + 반짝이 */}
              <div
                style={{
                  position: 'relative',
                  width: 220,
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px 0 4px',
                  opacity: 0,
                  animation: 'ob-charPop 0.7s 0.15s cubic-bezier(.34,1.56,.64,1) forwards',
                }}
              >
                <CharacterAnimation character={topCharacter} emotion="normal" size={180} />
                <span
                  style={{
                    position: 'absolute', top: -12, left: 8, fontSize: 18,
                    opacity: 0, animation: 'ob-starPop 1s 0.9s ease-out forwards',
                  }}
                >✨</span>
                <span
                  style={{
                    position: 'absolute', top: -8, right: 12, fontSize: 16,
                    opacity: 0, animation: 'ob-starPop 1s 1.1s ease-out forwards',
                  }}
                >⭐</span>
                <span
                  style={{
                    position: 'absolute', bottom: 8, right: -8, fontSize: 16,
                    opacity: 0, animation: 'ob-starPop 1s 1.3s ease-out forwards',
                  }}
                >💫</span>
              </div>

              <h2
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  margin: 0,
                  color: '#1f1f1f',
                  opacity: 0,
                  animation: 'ob-fadeInUp 0.5s 0.45s forwards',
                }}
              >
                {meta.name}
              </h2>

              <span
                style={{
                  padding: '6px 14px',
                  background: meta.tagBg,
                  color: meta.tagCol,
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 999,
                  opacity: 0,
                  animation: 'ob-fadeInUp 0.5s 0.6s forwards',
                }}
              >
                {meta.type}
              </span>

              <p
                style={{
                  fontSize: 15,
                  color: '#444',
                  margin: '4px 8px 0',
                  lineHeight: 1.6,
                  opacity: 0,
                  animation: 'ob-fadeInUp 0.5s 0.75s forwards',
                }}
              >
                {meta.desc}
              </p>

              <button
                onClick={handleComplete}
                disabled={saving}
                style={{
                  marginTop: 24,
                  width: '100%',
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  background: theme.primary,
                  border: 'none',
                  borderRadius: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: 0,
                  ['--ob-shadow' as any]: theme.shadow,
                  boxShadow: theme.shadow,
                  animation: saving
                    ? 'ob-fadeInUp 0.5s 0.9s forwards'
                    : 'ob-fadeInUp 0.5s 0.9s forwards, ob-btnPulse 2.2s 1.6s ease-in-out infinite',
                  filter: saving ? 'grayscale(0.3) brightness(0.95)' : 'none',
                  transition: 'filter 0.2s',
                }}
              >
                {saving ? '저장 중...' : `${meta.name}와 함께 시작하기`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
