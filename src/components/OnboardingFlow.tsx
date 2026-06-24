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
import { shareText } from '@/lib/nativeShare'

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

// 퀴즈 데이터/타입/결과는 공통 모듈에서 가져온다 (CharacterSelectionPage와 공유)
export {
  QUIZZES,
  CHARACTER_RESULT,
  TIE_BREAK_ORDER,
  INITIAL_SCORES,
  computeTopCharacter,
} from '@/lib/characterQuiz'
export type { Scores, QuizOption, QuizQuestion } from '@/lib/characterQuiz'

import {
  QUIZZES,
  CHARACTER_RESULT,
  INITIAL_SCORES,
  computeTopCharacter,
  type Scores,
  type QuizOption,
} from '@/lib/characterQuiz'

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

  const topCharacter = useMemo<Character>(() => computeTopCharacter(scores), [scores])

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

  const handleShareResult = async () => {
    const result = await shareText({
      title: `나의 완등 캐릭터는 ${meta.name}`,
      text: `${nickname || '나'}님과 가장 잘 맞는 완등 캐릭터는 ${meta.name}!\n${meta.type} · ${meta.desc}${quote ? `\n“${quote}”` : ''}\n\n너도 완등 캐릭터 테스트 해볼래?`,
      url: 'https://wandeung.com',
      dialogTitle: '캐릭터 결과 공유',
    })

    if (result === 'copied') toast.success('캐릭터 결과 링크를 복사했어요')
    else if (result === 'unsupported') toast.error('공유를 시작하지 못했어요')
  }

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

              {quote && (
                <p
                  style={{
                    fontSize: 14,
                    color: '#5a5a5a',
                    margin: '6px 8px 0',
                    lineHeight: 1.55,
                    fontStyle: 'italic',
                    opacity: 0,
                    animation: 'ob-fadeInUp 0.5s 0.85s forwards',
                  }}
                >
                  “{quote}”
                </p>
              )}

              <button
                onClick={handleShareResult}
                type="button"
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '13px 16px',
                  fontSize: 15,
                  fontWeight: 700,
                  color: theme.primary,
                  background: 'rgba(255,255,255,0.72)',
                  border: `1px solid ${theme.primary}33`,
                  borderRadius: 14,
                  cursor: 'pointer',
                  opacity: 0,
                  animation: 'ob-fadeInUp 0.5s 0.9s forwards',
                }}
              >
                캐릭터 결과 공유하기
              </button>

              <button
                onClick={handleComplete}
                disabled={saving}
                style={{
                  marginTop: 8,
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
