/**
 * WandeungAnimation.tsx
 * 완등 앱 - 완등이 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <WandeungAnimation emotion="normal" size={160} />
 *   <WandeungAnimation emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   emotion  - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size     - 숫자 (px), 기본 160
 *   onTap    - 탭 콜백 (선택)
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface WandeungAnimationProps {
  emotion?: Emotion
  size?: number
  onTap?: () => void
}

// ─────────────────────────────────────────────
// 감정 상태 데이터
// 완등이는 path 형태 고정 → 그라디언트 색상 + 눈동자만 변화
// ─────────────────────────────────────────────
const EMOTION_STATES: Record<Emotion, {
  bodyTop1: string  // 봉우리1 그라디언트 상단
  bodyBot1: string  // 봉우리1 그라디언트 하단
  bodyTop2: string  // 봉우리2 그라디언트 상단
  bodyBot2: string  // 봉우리2 그라디언트 하단
  pupilCy:  number  // 눈동자 cy
  leaves:   boolean // 가을 낙엽 여부
  cssAnim:  string  // 움직임 CSS 클래스
}> = {
  normal: {
    bodyTop1: '#C7D66D', bodyBot1: '#C7D66D',
    bodyTop2: '#C7D66D', bodyBot2: '#C7D66D',
    pupilCy: 110.696, leaves: false,
    cssAnim: 'wandeung-float',
  },
  sad: {
    bodyTop1: '#C7D66D', bodyBot1: '#4C98B4',
    bodyTop2: '#C7D66D', bodyBot2: '#4C98B4',
    pupilCy: 118.749, leaves: false,
    cssAnim: 'wandeung-droop',
  },
  angry: {
    bodyTop1: '#EB5053', bodyBot1: '#C7D66D',
    bodyTop2: '#EB5053', bodyBot2: '#C7D66D',
    pupilCy: 110.696, leaves: false,
    cssAnim: 'wandeung-rage',
  },
  autumn: {
    bodyTop1: '#C7D66D', bodyBot1: '#EEA16A',
    bodyTop2: '#C7D66D', bodyBot2: '#EEA16A',
    pupilCy: 110.696, leaves: true,
    cssAnim: 'wandeung-sway',
  },
}

// ─────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpHex = (c1: string, c2: string, t: number): string => {
  const h = (s: string) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = h(c1)
  const [r2, g2, b2] = h(c2)
  return (
    '#' +
    [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
  )
}

const ease = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2

// ─────────────────────────────────────────────
// CSS 인젝션
// ─────────────────────────────────────────────
const STYLE_ID = 'wandeung-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes wandeung-float {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-10px); }
    }
    @keyframes wandeung-droop {
      0%,100% { transform: translateY(0px) scaleX(1); }
      40%     { transform: translateY(7px) scaleX(1.04); }
      60%     { transform: translateY(8px) scaleX(1.04); }
    }
    @keyframes wandeung-rage {
      0%,100% { transform: translate(0,0) rotate(0deg); }
      10%     { transform: translate(-4px, 2px) rotate(-2deg); }
      20%     { transform: translate( 4px,-2px) rotate( 2deg); }
      30%     { transform: translate(-3px, 3px) rotate(-1.5deg); }
      40%     { transform: translate( 3px,-3px) rotate( 1.5deg); }
      50%     { transform: translate(-4px, 1px) rotate(-2deg); }
      60%     { transform: translate( 4px, 2px) rotate( 2deg); }
      70%     { transform: translate(-2px,-2px) rotate(-1deg); }
      80%     { transform: translate( 2px, 3px) rotate( 1deg); }
      90%     { transform: translate(-3px,-1px) rotate(-1.5deg); }
    }
    @keyframes wandeung-sway {
      0%,100% { transform: rotate(-2.5deg); }
      50%     { transform: rotate( 2.5deg); }
    }
    @keyframes wandeung-tap {
      0%   { transform: scale(1) translateY(0); }
      30%  { transform: scale(0.92) translateY(4px); }
      60%  { transform: scale(1.08) translateY(-8px); }
      100% { transform: scale(1) translateY(0); }
    }
    @keyframes wandeung-leaf-fall {
      0%   { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(540deg) translateX(30px); opacity: 0; }
    }
    @keyframes wandeung-leaf-fall2 {
      0%   { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(-400deg) translateX(-20px); opacity: 0; }
    }
    @keyframes wandeung-leaf-fall3 {
      0%   { transform: translateY(-30px) rotate(0deg) translateX(0); opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateY(200px) rotate(600deg) translateX(15px); opacity: 0; }
    }

    .wandeung-float { animation: wandeung-float 2.4s ease-in-out infinite; transform-origin: center bottom; }
    .wandeung-droop { animation: wandeung-droop 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .wandeung-rage  { animation: wandeung-rage   0.45s linear infinite;    transform-origin: center bottom; }
    .wandeung-sway  { animation: wandeung-sway   2s ease-in-out infinite;  transform-origin: center bottom; }
    .wandeung-tap   { animation: wandeung-tap    0.5s ease-out forwards;   transform-origin: center bottom; }
    .wandeung-idle  { animation: none; }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 낙엽 파티클 생성
// ─────────────────────────────────────────────
const LEAF_COLORS = ['#DFB443', '#FF8844', '#FF4D50', '#E8963C', '#FFB25B']
const LEAF_ANIMS  = ['wandeung-leaf-fall', 'wandeung-leaf-fall2', 'wandeung-leaf-fall3']

function createFallingLeaf(container: HTMLDivElement) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
  el.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18"><path d="M14 1C7.5 0.5 1.5 4.5 4 11C6 8 12.5 8 14 1Z" fill="${color}"/></svg>`
  el.style.left = `${Math.random() * 80 + 5}%`
  el.style.top  = '0'
  const dur = 2.5 + Math.random() * 2
  el.style.animation = `${LEAF_ANIMS[Math.floor(Math.random() * 3)]} ${dur}s ease-in forwards`
  container.appendChild(el)
  setTimeout(() => el.remove(), dur * 1000 + 300)
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function WandeungAnimation({
  emotion = 'normal',
  size = 160,
  onTap,
}: WandeungAnimationProps) {

  // SVG refs
  const ws1tRef = useRef<SVGStopElement>(null)
  const ws1bRef = useRef<SVGStopElement>(null)
  const ws2tRef = useRef<SVGStopElement>(null)
  const ws2bRef = useRef<SVGStopElement>(null)
  const rpRef   = useRef<SVGEllipseElement>(null)
  const lpRef   = useRef<SVGEllipseElement>(null)
  const l1Ref   = useRef<SVGPathElement>(null)
  const l2Ref   = useRef<SVGPathElement>(null)
  const l3Ref   = useRef<SVGPathElement>(null)

  const wrapRef      = useRef<HTMLDivElement>(null)
  const leafBoxRef   = useRef<HTMLDivElement>(null)
  const leafInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const curRef       = useRef<Emotion>('normal')
  const rafRef       = useRef<number | null>(null)

  const [isTapping, setIsTapping] = useState(false)

  useEffect(() => { injectStyles() }, [])

  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    ws1tRef.current?.setAttribute('stop-color', lerpHex(a.bodyTop1, b.bodyTop1, et))
    ws1bRef.current?.setAttribute('stop-color', lerpHex(a.bodyBot1, b.bodyBot1, et))
    ws2tRef.current?.setAttribute('stop-color', lerpHex(a.bodyTop2, b.bodyTop2, et))
    ws2bRef.current?.setAttribute('stop-color', lerpHex(a.bodyBot2, b.bodyBot2, et))

    const pcy = lerp(a.pupilCy, b.pupilCy, et)
    rpRef.current?.setAttribute('cy', String(pcy))
    lpRef.current?.setAttribute('cy', String(pcy))

    const leafOp = lerp(a.leaves ? 1 : 0, b.leaves ? 1 : 0, et)
    l1Ref.current?.setAttribute('opacity', String(leafOp))
    l2Ref.current?.setAttribute('opacity', String(leafOp))
    l3Ref.current?.setAttribute('opacity', String(leafOp))
  }, [])

  const stopLeaves = useCallback(() => {
    if (leafInterval.current) {
      clearInterval(leafInterval.current)
      leafInterval.current = null
    }
  }, [])

  const startLeaves = useCallback(() => {
    if (leafInterval.current || !leafBoxRef.current) return
    createFallingLeaf(leafBoxRef.current)
    leafInterval.current = setInterval(() => {
      if (leafBoxRef.current) createFallingLeaf(leafBoxRef.current)
    }, 400)
  }, [])

  useEffect(() => {
    const from = curRef.current
    const to   = emotion
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (wrapRef.current) wrapRef.current.className = 'wandeung-idle'
    if (to !== 'autumn') stopLeaves()

    let start: number | null = null
    const DURATION = 600

    const step = (ts: number) => {
      if (!start) start = ts
      const prog = Math.min((ts - start) / DURATION, 1)
      applyMorph(prog, from, to)

      if (prog < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        curRef.current = to
        if (wrapRef.current) {
          wrapRef.current.className = EMOTION_STATES[to].cssAnim
        }
        if (to === 'autumn') startLeaves()
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [emotion, applyMorph, startLeaves, stopLeaves])

  // 초기 렌더
  useEffect(() => {
    applyMorph(1, 'normal', emotion)
    if (wrapRef.current) {
      wrapRef.current.className = EMOTION_STATES[emotion].cssAnim
    }
    curRef.current = emotion
    if (emotion === 'autumn') startLeaves()
    return () => stopLeaves()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 탭 핸들러
  const handleClick = useCallback(() => {
    onTap?.()
    if (isTapping) return
    setIsTapping(true)
    if (wrapRef.current) wrapRef.current.className = 'wandeung-tap'
    setTimeout(() => {
      setIsTapping(false)
      if (wrapRef.current) {
        wrapRef.current.className = EMOTION_STATES[curRef.current].cssAnim
      }
    }, 520)
  }, [isTapping, onTap])

  return (
    <div
      onClick={handleClick}
      style={{
        width: size,
        height: size,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* 낙엽 파티클 컨테이너 */}
      <div
        ref={leafBoxRef}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          borderRadius: 8,
        }}
      />

      <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 왼쪽 봉우리 그라디언트 */}
            <linearGradient id="wandeung-g1" x1="99.7" y1="69" x2="99.7" y2="174" gradientUnits="userSpaceOnUse">
              <stop ref={ws1tRef} offset="0" stopColor="#C7D66D" />
              <stop ref={ws1bRef} offset="1" stopColor="#C7D66D" />
            </linearGradient>
            {/* 오른쪽 봉우리 그라디언트 */}
            <linearGradient id="wandeung-g2" x1="99.7" y1="69" x2="99.7" y2="174" gradientUnits="userSpaceOnUse">
              <stop ref={ws2tRef} offset="0" stopColor="#C7D66D" />
              <stop ref={ws2bRef} offset="1" stopColor="#C7D66D" />
            </linearGradient>
            {/* 낙엽 그라디언트 (원본 고정) */}
            <linearGradient id="wandeung-lg1" x1="153.3" y1="89.4" x2="134" y2="100.9" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="wandeung-lg2" x1="112.6" y1="58.3" x2="117.9" y2="80.1" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="wandeung-lg3" x1="77.3" y1="48.8" x2="68.9" y2="62.3" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 왼쪽 큰 봉우리 */}
          <path
            d="M79.4839 75.7201C84.7342 66.76 97.6986 66.76 102.949 75.7201L148.55 153.541C153.855 162.595 147.319 173.983 136.817 173.983H45.6154C35.1138 173.983 28.5777 162.595 33.8829 153.541L79.4839 75.7201Z"
            fill="url(#wandeung-g1)"
          />
          {/* 오른쪽 작은 봉우리 */}
          <path
            d="M113.575 99.978C118.648 90.2095 132.636 90.2095 137.71 99.978L165.852 154.165C170.548 163.205 163.98 174 153.785 174H97.4993C87.3041 174 80.7366 163.205 85.4319 154.165L113.575 99.978Z"
            fill="url(#wandeung-g2)"
          />

          {/* 눈 흰자 */}
          <ellipse cx="95.163" cy="114.857" rx="8.113" ry="10.953" fill="white" />
          <ellipse cx="71.92"  cy="114.857" rx="8.113" ry="10.953" fill="white" />

          {/* 눈동자 */}
          <ellipse ref={rpRef} cx="94.506" cy="110.696" rx="5.263" ry="6.791" fill="#666666" />
          <ellipse ref={lpRef} cx="71.263" cy="110.696" rx="5.263" ry="6.791" fill="#666666" />

          {/* 코 */}
          <path
            d="M82.5813 131.026C78.0256 130.993 74.3505 128.536 74.3728 125.54C74.3952 122.544 78.1064 120.142 82.6621 120.176C87.2178 120.209 90.8928 122.666 90.8705 125.662C90.8482 128.658 87.137 131.06 82.5813 131.026Z"
            fill="#FF696C"
          />

          {/* 주근깨 (고정 — 애니메이션 없음) */}
          <circle cx="101.51"  cy="127.166" r="2"   fill="#E3F47C" />
          <circle cx="59.512"  cy="123.163" r="2"   fill="#E3F47C" />
          <circle cx="63.012"  cy="127.766" r="1.6" fill="#E3F47C" />
          <circle cx="108.407" cy="124.664" r="2"   fill="#E3F47C" />
          <circle cx="106.76"  cy="130.669" r="1.5" fill="#E3F47C" />
          <circle cx="57.453"  cy="130.368" r="1.3" fill="#E3F47C" />

          {/* 가을 낙엽 원본 (opacity로 fade in/out) */}
          <path ref={l1Ref} d="M153.163 88.9197C146.466 87.2435 133.645 88.0074 135.938 104.472C141.068 106.331 151.695 105.822 153.163 88.9197Z" fill="url(#wandeung-lg1)" opacity="0" />
          <path ref={l2Ref} d="M112.081 58.317C108.505 64.2224 105.455 76.6988 121.864 79.361C125.152 75.0071 127.799 64.7027 112.081 58.317Z"   fill="url(#wandeung-lg2)" opacity="0" />
          <path ref={l3Ref} d="M77.0246 48.512C72.2662 49.6519 64.458 54.3312 71.2922 63.9286C75.1251 63.4164 81.6375 59.6161 77.0246 48.512Z"    fill="url(#wandeung-lg3)" opacity="0" />
        </svg>
      </div>
    </div>
  )
}
