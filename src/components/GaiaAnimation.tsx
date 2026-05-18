/**
 * GaiaAnimation.tsx
 * 완등 앱 - 가이아 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <GaiaAnimation emotion="normal" size={160} />
 *   <GaiaAnimation emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   emotion  - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size     - 숫자 (px), 기본 160
 *   onTap    - 탭 콜백 (선택)
 *
 * 가이아 특징:
 *   - 대지 모티브, 세 개의 산 봉우리 구조
 *   - 우아하고 느린 움직임 (3~3.5s 주기)
 *   - 기본: 대지의 숨결 (gentle breathe)
 *   - 화남: 지진 진동 (quake)
 *   - 가을: 낙엽 내리기 파티클
 *   - 눈썹 장식, 주근깨 고정
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface GaiaAnimationProps {
  emotion?: Emotion
  size?: number
  onTap?: () => void
}

// ─────────────────────────────────────────────
// 감정 상태 데이터
// ─────────────────────────────────────────────
const EMOTION_STATES: Record<Emotion, {
  bodyTop:  string   // 세 봉우리 공통 그라디언트 상단
  bodyBot:  string   // 세 봉우리 공통 그라디언트 하단
  pupilCy:  number   // 눈동자 cy
  leaf:     boolean  // 가을 낙엽 여부
  cssAnim:  string   // 움직임 CSS 클래스
}> = {
  normal: {
    bodyTop: '#C7D66D', bodyBot: '#C7D66D',
    pupilCy: 123.189, leaf: false,
    cssAnim: 'gaia-breathe',
  },
  sad: {
    bodyTop: '#C7D66D', bodyBot: '#8DD6F0',
    pupilCy: 129.501, leaf: false,
    cssAnim: 'gaia-sink',
  },
  angry: {
    bodyTop: '#FF696C', bodyBot: '#C7D66D',
    pupilCy: 123.189, leaf: false,
    cssAnim: 'gaia-quake',
  },
  autumn: {
    bodyTop: '#C7D66D', bodyBot: '#FFB987',
    pupilCy: 123.189, leaf: true,
    cssAnim: 'gaia-sway',
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
const STYLE_ID = 'gaia-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    /* 기본: 대지의 숨결 — 느리고 우아하게 */
    @keyframes gaia-breathe {
      0%,100% { transform: translateY(0px)   scaleX(1)    scaleY(1);    }
      40%     { transform: translateY(-7px)  scaleX(1.01) scaleY(0.99); }
      60%     { transform: translateY(-6px)  scaleX(1.01) scaleY(0.99); }
    }
    /* 시무룩: 대지가 부드럽게 내려앉음 */
    @keyframes gaia-sink {
      0%,100% { transform: translateY(0px)  scaleX(1)    scaleY(1);    }
      45%     { transform: translateY(7px)  scaleX(1.03) scaleY(0.97); }
      60%     { transform: translateY(8px)  scaleX(1.04) scaleY(0.96); }
    }
    /* 화남: 대지의 진동 — 웅장하게 */
    @keyframes gaia-quake {
      0%,100% { transform: translate(0px, 0px)    rotate(0deg);     }
      15%     { transform: translate(-5px,  1px)  rotate(-0.8deg);  }
      30%     { transform: translate( 5px, -1px)  rotate( 0.8deg);  }
      45%     { transform: translate(-4px,  2px)  rotate(-0.6deg);  }
      60%     { transform: translate( 4px, -2px)  rotate( 0.6deg);  }
      75%     { transform: translate(-4px,  1px)  rotate(-0.5deg);  }
      90%     { transform: translate( 3px, -1px)  rotate( 0.5deg);  }
    }
    /* 가을: 우아하게 살랑살랑 */
    @keyframes gaia-sway {
      0%,100% { transform: rotate(-2deg); }
      50%     { transform: rotate( 2deg); }
    }
    /* 탭 리액션 */
    @keyframes gaia-tap {
      0%   { transform: scale(1)    translateY(0px);  }
      30%  { transform: scale(0.94) translateY(5px);  }
      65%  { transform: scale(1.06) translateY(-7px); }
      100% { transform: scale(1)    translateY(0px);  }
    }
    /* 낙엽 파티클 */
    @keyframes gaia-leaf1 {
      0%   { transform: translateY(-20px) rotate(0deg)   translateX(0px);  opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(520deg) translateX(28px); opacity: 0; }
    }
    @keyframes gaia-leaf2 {
      0%   { transform: translateY(-20px) rotate(0deg)    translateX(0px);   opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(-360deg) translateX(-22px); opacity: 0; }
    }
    @keyframes gaia-leaf3 {
      0%   { transform: translateY(-30px) rotate(0deg)   translateX(0px);  opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateY(200px) rotate(580deg) translateX(16px); opacity: 0; }
    }

    .gaia-breathe { animation: gaia-breathe 3.5s ease-in-out infinite; transform-origin: center bottom; }
    .gaia-sink    { animation: gaia-sink    3.2s ease-in-out infinite; transform-origin: center bottom; }
    .gaia-quake   { animation: gaia-quake   0.7s ease-in-out infinite; transform-origin: center center; }
    .gaia-sway    { animation: gaia-sway    3s   ease-in-out infinite; transform-origin: center bottom; }
    .gaia-tap     { animation: gaia-tap     0.5s ease-out    forwards; transform-origin: center bottom; }
    .gaia-idle    { animation: none; }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 낙엽 파티클
// ─────────────────────────────────────────────
const LEAF_COLORS = ['#C7D66D', '#A8BB52', '#FFB987', '#DFB443', '#FF8844', '#FF4D50']
const LEAF_ANIMS  = ['gaia-leaf1', 'gaia-leaf2', 'gaia-leaf3']

function createLeaf(container: HTMLDivElement) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
  const sz = 12 + Math.floor(Math.random() * 8)
  el.innerHTML = `<svg width="${sz}" height="${sz}" viewBox="0 0 16 16"><path d="M14 1C7 0.5 1 4.5 3.5 10.5C6 7 12.5 7.5 14 1Z" fill="${color}"/></svg>`
  el.style.left  = `${Math.random() * 75 + 8}%`
  el.style.top   = '0'
  const dur = 3 + Math.random() * 2
  el.style.animation = `${LEAF_ANIMS[Math.floor(Math.random() * 3)]} ${dur}s ease-in forwards`
  container.appendChild(el)
  setTimeout(() => el.remove(), dur * 1000 + 200)
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function GaiaAnimation({
  emotion = 'normal',
  size = 160,
  onTap,
}: GaiaAnimationProps) {

  // 봉우리 그라디언트 stop refs (3개 봉우리 × 상하 2개)
  const gs1tRef = useRef<SVGStopElement>(null)
  const gs1bRef = useRef<SVGStopElement>(null)
  const gs2tRef = useRef<SVGStopElement>(null)
  const gs2bRef = useRef<SVGStopElement>(null)
  const gs3tRef = useRef<SVGStopElement>(null)
  const gs3bRef = useRef<SVGStopElement>(null)

  const rpRef  = useRef<SVGEllipseElement>(null)
  const lpRef  = useRef<SVGEllipseElement>(null)
  const gl1Ref = useRef<SVGPathElement>(null)
  const gl2Ref = useRef<SVGPathElement>(null)
  const gl3Ref = useRef<SVGPathElement>(null)

  const wrapRef  = useRef<HTMLDivElement>(null)
  const pboxRef  = useRef<HTMLDivElement>(null)
  const curRef   = useRef<Emotion>('normal')
  const rafRef   = useRef<number | null>(null)
  const leafRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isTapping, setIsTapping] = useState(false)

  useEffect(() => { injectStyles() }, [])

  const stopLeaves = useCallback(() => {
    if (leafRef.current) { clearInterval(leafRef.current); leafRef.current = null }
  }, [])

  const startLeaves = useCallback(() => {
    if (leafRef.current || !pboxRef.current) return
    createLeaf(pboxRef.current)
    leafRef.current = setInterval(() => {
      if (pboxRef.current) createLeaf(pboxRef.current)
    }, 500)
  }, [])

  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    const gt = lerpHex(a.bodyTop, b.bodyTop, et)
    const gb = lerpHex(a.bodyBot, b.bodyBot, et)

    // 세 봉우리 모두 같은 색상 적용
    ;[gs1tRef, gs2tRef, gs3tRef].forEach((r) =>
      r.current?.setAttribute('stop-color', gt)
    )
    ;[gs1bRef, gs2bRef, gs3bRef].forEach((r) =>
      r.current?.setAttribute('stop-color', gb)
    )

    const pcy = lerp(a.pupilCy, b.pupilCy, et)
    rpRef.current?.setAttribute('cy', String(pcy))
    lpRef.current?.setAttribute('cy', String(pcy))

    const lo = lerp(a.leaf ? 1 : 0, b.leaf ? 1 : 0, et)
    ;[gl1Ref, gl2Ref, gl3Ref].forEach((r) =>
      r.current?.setAttribute('opacity', String(lo))
    )
  }, [])

  useEffect(() => {
    const from = curRef.current
    const to   = emotion
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (wrapRef.current) wrapRef.current.className = 'gaia-idle'
    stopLeaves()

    let start: number | null = null
    const DURATION = 700  // 가이아는 전환도 느리게

    const step = (ts: number) => {
      if (!start) start = ts
      const prog = Math.min((ts - start) / DURATION, 1)
      applyMorph(prog, from, to)

      if (prog < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        curRef.current = to
        if (wrapRef.current) wrapRef.current.className = EMOTION_STATES[to].cssAnim
        if (EMOTION_STATES[to].leaf) startLeaves()
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [emotion, applyMorph, startLeaves, stopLeaves])

  // 초기 렌더
  useEffect(() => {
    applyMorph(1, 'normal', emotion)
    if (wrapRef.current) wrapRef.current.className = EMOTION_STATES[emotion].cssAnim
    if (EMOTION_STATES[emotion].leaf) startLeaves()
    curRef.current = emotion
    return () => stopLeaves()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 탭 핸들러
  const handleClick = useCallback(() => {
    onTap?.()
    if (isTapping) return
    setIsTapping(true)
    if (wrapRef.current) wrapRef.current.className = 'gaia-tap'
    setTimeout(() => {
      setIsTapping(false)
      if (wrapRef.current) wrapRef.current.className = EMOTION_STATES[curRef.current].cssAnim
    }, 520)
  }, [isTapping, onTap])

  return (
    <div
      onClick={handleClick}
      style={{
        width: size, height: size,
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 낙엽 파티클 컨테이너 */}
      <div
        ref={pboxRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
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
            {/* 봉우리 1 그라디언트 */}
            <linearGradient id="gaia-g1" x1="99.6" y1="84.4" x2="99.6" y2="182" gradientUnits="userSpaceOnUse">
              <stop ref={gs1tRef} offset="0" stopColor="#C7D66D" />
              <stop ref={gs1bRef} offset="1" stopColor="#C7D66D" />
            </linearGradient>
            {/* 봉우리 2 그라디언트 */}
            <linearGradient id="gaia-g2" x1="99.6" y1="84.4" x2="99.6" y2="182" gradientUnits="userSpaceOnUse">
              <stop ref={gs2tRef} offset="0" stopColor="#C7D66D" />
              <stop ref={gs2bRef} offset="1" stopColor="#C7D66D" />
            </linearGradient>
            {/* 봉우리 3 그라디언트 */}
            <linearGradient id="gaia-g3" x1="99.6" y1="84.4" x2="99.6" y2="182" gradientUnits="userSpaceOnUse">
              <stop ref={gs3tRef} offset="0" stopColor="#C7D66D" />
              <stop ref={gs3bRef} offset="1" stopColor="#C7D66D" />
            </linearGradient>
            {/* 낙엽 그라디언트 (고정) */}
            <linearGradient id="gaia-lg1" x1="152.5" y1="95.9" x2="130.4" y2="109.2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="gaia-lg2" x1="95.2" y1="35.3" x2="101.2" y2="60.4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="gaia-lg3" x1="73.1" y1="69" x2="63.5" y2="84.6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 봉우리 1 (가운데 큰 것) */}
          <path
            d="M87.524 90.6827C92.3974 82.3551 104.431 82.3551 109.305 90.6828L151.632 163.011C156.556 171.425 150.489 182.01 140.742 182.01H56.0869C46.3392 182.01 40.2723 171.425 45.1966 163.011L87.524 90.6827Z"
            fill="url(#gaia-g1)"
          />
          {/* 봉우리 2 (오른쪽) */}
          <path
            d="M119.168 113.228C123.877 104.149 136.86 104.149 141.57 113.228L167.692 163.59C172.05 171.992 165.954 182.026 156.491 182.026H104.246C94.7827 182.026 88.6868 171.992 93.045 163.59L119.168 113.228Z"
            fill="url(#gaia-g2)"
          />
          {/* 봉우리 3 (왼쪽 작은 것) */}
          <path
            d="M49.769 123.634C53.1473 115.931 62.4614 115.931 65.8397 123.634L84.5794 166.367C87.7059 173.496 83.3328 182.01 76.5441 182.01H39.0647C32.2759 182.01 27.9028 173.496 31.0293 166.367L49.769 123.634Z"
            fill="url(#gaia-g3)"
          />

          {/* 눈 흰자 */}
          <ellipse cx="102.078" cy="127.058" rx="7.531" ry="10.179" fill="white" />
          <ellipse cx="80.504"  cy="127.058" rx="7.531" ry="10.179" fill="white" />

          {/* 눈동자 */}
          <ellipse ref={rpRef} cx="101.467" cy="123.189" rx="4.885" ry="6.311" fill="#666666" />
          <ellipse ref={lpRef} cx="79.893"  cy="123.189" rx="4.885" ry="6.311" fill="#666666" />

          {/* 코 */}
          <path
            d="M90.399 142.085C86.1704 142.054 82.7591 139.771 82.7799 136.986C82.8006 134.201 86.2453 131.969 90.474 132C94.7027 132.032 98.1139 134.314 98.0932 137.099C98.0725 139.884 94.6277 142.116 90.399 142.085Z"
            fill="#FF696C"
          />

          {/* 눈썹 장식 (고정 — 변형 없음) */}
          <path
            d="M71.3446 113.214C72.7693 117.489 75.5385 117.45 78.7558 117.857C78.7558 117.857 76.8693 119.678 74.9833 119.057C73.0972 118.436 71.7517 116.61 71.3446 113.214Z"
            fill="#666666"
          />
          <path
            d="M93.1552 113.214C94.5799 117.489 97.3491 117.45 100.566 117.857C100.566 117.857 98.6799 119.678 96.7939 119.057C94.9078 118.436 93.5623 116.61 93.1552 113.214Z"
            fill="#666666"
          />

          {/* 주근깨 (고정) */}
          <circle cx="71.548"  cy="140.291" r="1.849" fill="#E3F47C" />
          <circle cx="112.661" cy="140.291" r="1.849" fill="#E3F47C" />

          {/* 가을 낙엽 원본 (opacity로 fade in/out) */}
          <path ref={gl1Ref} d="M152.336 95.3574C144.634 93.43 129.891 94.3084 132.529 113.242C138.428 115.378 150.648 114.793 152.336 95.3574Z"   fill="url(#gaia-lg1)" opacity="0" />
          <path ref={gl2Ref} d="M94.5427 35.3647C90.4304 42.1555 86.9232 56.5023 105.793 59.5637C109.574 54.557 112.617 42.7078 94.5427 35.3647Z"    fill="url(#gaia-lg2)" opacity="0" />
          <path ref={gl3Ref} d="M72.8273 68.7387C67.3556 70.0495 58.3767 75.4302 66.2356 86.4665C70.643 85.8775 78.1318 81.5075 72.8273 68.7387Z"    fill="url(#gaia-lg3)" opacity="0" />
        </svg>
      </div>
    </div>
  )
}
