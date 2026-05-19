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

interface OnboardingFlowProps {
  onComplete: (nickname: string, characterId: string) => void
}

type Scores = Record<Character, number>

interface QuizOption {
  label: string
  scores: Partial<Scores>
}

interface QuizQuestion {
  question: string
  options: QuizOption[]
}

const QUIZZES: QuizQuestion[] = [
  {
    question: '산에 오를 때 가장 먼저 떠오르는 장면은?',
    options: [
      { label: '정상에 깃발이 꽂혀있는 모습', scores: { wandeung: 3, oreumi: 2 } },
      { label: '천천히 주변을 관찰하며 걷는 모습', scores: { dorami: 3 } },
      { label: '예쁜 풍경을 사진에 담는 모습', scores: { pongdang: 3 } },
      { label: '지도에 없는 새로운 길을 찾는 모습', scores: { peggy: 3, oreumi: 1 } },
    ],
  },
  {
    question: '같이 산에 가고 싶은 사람은?',
    options: [
      { label: '혼자가 편해요', scores: { peggy: 2, dorami: 2 } },
      { label: '친구 1~2명과 함께', scores: { gaia: 2, pongdang: 2 } },
      { label: '여럿이 모이는 산악회', scores: { gaia: 3 } },
      { label: '그때그때 달라요', scores: { oreumi: 2, gaia: 1 } },
    ],
  },
  {
    question: '산에서 가장 행복한 순간은?',
    options: [
      { label: '정상에 도달한 순간', scores: { wandeung: 3, oreumi: 2 } },
      { label: '야생화·동물을 발견했을 때', scores: { pongdang: 3, dorami: 1 } },
      { label: '새로운 무언가를 발견했을 때', scores: { dorami: 3 } },
      { label: '함께한 사람들과 웃을 때', scores: { gaia: 3, pongdang: 1 } },
    ],
  },
  {
    question: '등산을 준비할 때 나는?',
    options: [
      { label: '체크리스트가 꼭 있어야 해요', scores: { wandeung: 3 } },
      { label: '장비에 관심이 많아요', scores: { oreumi: 2, pongdang: 1 } },
      { label: '산의 역사·지형이 궁금해요', scores: { dorami: 3 } },
      { label: '내가 가고 싶은 산부터 정해요', scores: { peggy: 3 } },
    ],
  },
  {
    question: '산행 후 가장 먼저 하는 일은?',
    options: [
      { label: '기록 인증 SNS 업로드', scores: { wandeung: 3 } },
      { label: '맛집에서 든든한 식사', scores: { gaia: 3, pongdang: 1 } },
      { label: '노트에 차분히 정리', scores: { dorami: 3 } },
      { label: '혼자 여운을 즐겨요', scores: { peggy: 2, pongdang: 2 } },
    ],
  },
]

const INITIAL_SCORES: Scores = {
  oreumi: 0,
  wandeung: 0,
  dorami: 0,
  pongdang: 0,
  dorong: 0,
  gaia: 0,
  peggy: 0,
}

type Step = 'nickname' | 'quiz' | 'result'

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('nickname')
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [quizIndex, setQuizIndex] = useState(0)
  const [scores, setScores] = useState<Scores>({ ...INITIAL_SCORES })

  const totalSteps = 1 + QUIZZES.length + 1
  const currentStepNum =
    step === 'nickname' ? 1 : step === 'quiz' ? 2 + quizIndex : totalSteps
  const progress = (currentStepNum / totalSteps) * 100

  const topCharacter = useMemo<Character>(() => {
    let best: Character = 'oreumi'
    let bestScore = -Infinity
    ;(Object.keys(scores) as Character[]).forEach((c) => {
      if (scores[c] > bestScore) {
        bestScore = scores[c]
        best = c
      }
    })
    return best
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
    setScores((prev) => {
      const next = { ...prev }
      ;(Object.keys(option.scores) as Character[]).forEach((c) => {
        next[c] = (next[c] ?? 0) + (option.scores[c] ?? 0)
      })
      return next
    })
    if (quizIndex < QUIZZES.length - 1) {
      setQuizIndex((i) => i + 1)
    } else {
      setStep('result')
    }
  }

  const handleComplete = () => {
    onComplete(nickname, topCharacter)
  }

  const meta = CHARACTER_META[topCharacter]

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#FAFBF7',
        padding: '24px 20px',
        fontFamily: '"Noto Sans KR", sans-serif',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ color: '#888', fontSize: 14 }}>
              {quizIndex + 1} / {QUIZZES.length}
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                color: '#222',
                lineHeight: 1.4,
              }}
            >
              {QUIZZES[quizIndex].question}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {QUIZZES[quizIndex].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(opt)}
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
        )}

        {step === 'result' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 16, color: '#666', margin: 0 }}>
              {nickname}님과 가장 잘 맞는 캐릭터는
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#222' }}>
              {meta.name}
            </h2>
            <span
              style={{
                padding: '6px 12px',
                background: meta.tagBg,
                color: meta.tagCol,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 999,
              }}
            >
              {meta.type}
            </span>

            <div style={{ margin: '16px 0' }}>
              <CharacterAnimation character={topCharacter} emotion="normal" size={180} />
            </div>

            <p style={{ fontSize: 15, color: '#555', margin: 0, lineHeight: 1.6 }}>
              {meta.desc}
            </p>

            <button
              onClick={handleComplete}
              style={{
                marginTop: 24,
                width: '100%',
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
              {meta.name}와 함께 시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
