/**
 * PongdangAnimation.tsx
 * 완등 앱 - 퐁당이 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <PongdangAnimation emotion="normal" size={160} />
 *   <PongdangAnimation emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   emotion  - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size     - 숫자 (px), 기본 160
 *   onTap    - 탭 콜백 (선택)
 *
 * 퐁당이 특징:
 *   - 물방울 캐릭터 → 기본: 찰랑찰랑 흐르는 모션
 *   - 화남: 보글보글 끓는 버블 파티클
 *   - 가을: 낙엽 내리기 파티클
 *   - 내부 반사 라인 색상도 감정에 따라 변함
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface PongdangAnimationProps {
  emotion?: Emotion
  size?: number
  onTap?: () => void
}

// ─────────────────────────────────────────────
// 감정 상태 데이터
// ─────────────────────────────────────────────
const EMOTION_STATES: Record<Emotion, {
  bodyTop:    string   // 몸통 그라디언트 상단
  bodyBot:    string   // 몸통 그라디언트 하단
  pupilCy:    number   // 눈동자 cy
  reflectCol: string   // 내부 반사 라인 색상
  leaf:       boolean  // 가을 낙엽 여부
  bubbles:    boolean  // 화남 버블 여부
  cssAnim:    string   // 움직임 CSS 클래스
}> = {
  normal: {
    bodyTop: '#C2B6DE', bodyBot: '#C2B6DE',
    pupilCy: 101.636, reflectCol: '#E0D3FF',
    leaf: false, bubbles: false,
    cssAnim: 'pongdang-flow',
  },
  sad: {
    bodyTop: '#C2B6DE', bodyBot: '#2A5EA2',
    pupilCy: 110.739, reflectCol: '#818EFB',
    leaf: false, bubbles: false,
    cssAnim: 'pongdang-droop',
  },
  angry: {
    bodyTop: '#FF7676', bodyBot: '#C2B6DE',
    pupilCy: 101.636, reflectCol: '#FFB0A0',
    leaf: false, bubbles: true,
    cssAnim: 'pongdang-boil',
  },
  autumn: {
    bodyTop: '#C2B6DE', bodyBot: '#F9AA71',
    pupilCy: 101.636, reflectCol: '#FFE6C2',
    leaf: true, bubbles: false,
    cssAnim: 'pongdang-sway',
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
const STYLE_ID = 'pongdang-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    /* 기본: 물처럼 찰랑찰랑 */
    @keyframes pongdang-flow {
      0%,100% { transform: translateY(0px)   scaleX(1)    scaleY(1);    }
      20%     { transform: translateY(-7px)  scaleX(0.95) scaleY(1.05); }
      50%     { transform: translateY(4px)   scaleX(1.05) scaleY(0.95); }
      75%     { transform: translateY(-4px)  scaleX(0.97) scaleY(1.03); }
    }
    /* 시무룩: 축 처지며 흘러내림 */
    @keyframes pongdang-droop {
      0%,100% { transform: translateY(0px)  scaleX(1)    scaleY(1);    }
      40%     { transform: translateY(7px)  scaleX(1.06) scaleY(0.94); }
      60%     { transform: translateY(8px)  scaleX(1.07) scaleY(0.93); }
    }
    /* 화남: 보글보글 끓기 */
    @keyframes pongdang-boil {
      0%,100% { transform: scaleX(1)    scaleY(1)    translateY(0px);  }
      15%     { transform: scaleX(1.04) scaleY(0.96) translateY(3px);  }
      30%     { transform: scaleX(0.96) scaleY(1.04) translateY(-4px); }
      50%     { transform: scaleX(1.03) scaleY(0.97) translateY(2px);  }
      70%     { transform: scaleX(0.97) scaleY(1.03) translateY(-3px); }
      85%     { transform: scaleX(1.02) scaleY(0.98) translateY(2px);  }
    }
    /* 가을: 살랑살랑 */
    @keyframes pongdang-sway {
      0%,100% { transform: rotate(-3deg); }
      50%     { transform: rotate( 3deg); }
    }
    /* 탭 리액션 */
    @keyframes pongdang-tap {
      0%   { transform: scale(1)    translateY(0px)  scaleX(1);    }
      25%  { transform: scale(0.88) translateY(5px)  scaleX(1.12); }
      60%  { transform: scale(1.12) translateY(-8px) scaleX(0.92); }
      100% { transform: scale(1)    translateY(0px)  scaleX(1);    }
    }
    /* 버블 파티클 */
    @keyframes pongdang-bubble {
      0%   { transform: translateY(0px)   scale(1);   opacity: 0;   }
      10%  { opacity: 0.8; }
      80%  { opacity: 0.5; }
      100% { transform: translateY(-80px) scale(0.3); opacity: 0;   }
    }
    /* 낙엽 파티클 */
    @keyframes pongdang-leaf1 {
      0%   { transform: translateY(-20px) rotate(0deg)   translateX(0px);   opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(540deg) translateX(30px);  opacity: 0; }
    }
    @keyframes pongdang-leaf2 {
      0%   { transform: translateY(-20px) rotate(0deg)    translateX(0px);  opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(-400deg) translateX(-20px); opacity: 0; }
    }
    @keyframes pongdang-leaf3 {
      0%   { transform: translateY(-30px) rotate(0deg)   translateX(0px);  opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateY(200px) rotate(600deg) translateX(15px); opacity: 0; }
    }

    .pongdang-flow  { animation: pongdang-flow  3s   ease-in-out infinite; transform-origin: center bottom; }
    .pongdang-droop { animation: pongdang-droop 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .pongdang-boil  { animation: pongdang-boil  0.5s ease-in-out infinite; transform-origin: center center; }
    .pongdang-sway  { animation: pongdang-sway  2s   ease-in-out infinite; transform-origin: center bottom; }
    .pongdang-tap   { animation: pongdang-tap   0.5s ease-out    forwards; transform-origin: center bottom; }
    .pongdang-idle  { animation: none; }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 파티클 생성 함수
// ─────────────────────────────────────────────
const BUBBLE_COLORS = [
  'rgba(255,120,120,0.7)',
  'rgba(255,160,100,0.7)',
  'rgba(255,100,100,0.6)',
]
const LEAF_COLORS = ['#DFB443', '#FF8844', '#FF4D50', '#E8963C', '#C2B6DE']
const LEAF_ANIMS  = ['pongdang-leaf1', 'pongdang-leaf2', 'pongdang-leaf3']

function createBubble(container: HTMLDivElement) {
  const el = document.createElement('div')
  const size = 4 + Math.random() * 8
  const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]
  el.style.cssText = [
    'position:absolute',
    'border-radius:50%',
    'pointer-events:none',
    'opacity:0',
    `width:${size}px`,
    `height:${size}px`,
    `background:${color}`,
    `left:${30 + Math.random() * 40}%`,
    `bottom:${20 + Math.random() * 20}%`,
  ].join(';')
  const dur = 0.8 + Math.random() * 0.8
  el.style.animation = `pongdang-bubble ${dur}s ease-in forwards`
  container.appendChild(el)
  setTimeout(() => el.remove(), dur * 1000 + 100)
}

function createLeaf(container: HTMLDivElement) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
  el.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M13 1C7 0.5 1.5 4 3.5 10C5.5 7 11.5 7 13 1Z" fill="${color}"/></svg>`
  el.style.left  = `${Math.random() * 70 + 10}%`
  el.style.top   = '0'
  const dur = 2.5 + Math.random() * 2
  el.style.animation = `${LEAF_ANIMS[Math.floor(Math.random() * 3)]} ${dur}s ease-in forwards`
  container.appendChild(el)
  setTimeout(() => el.remove(), dur * 1000 + 200)
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function PongdangAnimation({
  emotion = 'normal',
  size = 160,
  onTap,
}: PongdangAnimationProps) {

  // SVG refs
  const ps1Ref  = useRef<SVGStopElement>(null)
  const ps2Ref  = useRef<SVGStopElement>(null)
  const rpRef   = useRef<SVGEllipseElement>(null)
  const lpRef   = useRef<SVGEllipseElement>(null)
  const rl1Ref  = useRef<SVGPathElement>(null)
  const rl2Ref  = useRef<SVGPathElement>(null)
  const pl1Ref  = useRef<SVGPathElement>(null)

  const wrapRef    = useRef<HTMLDivElement>(null)
  const pboxRef    = useRef<HTMLDivElement>(null)
  const curRef     = useRef<Emotion>('normal')
  const rafRef     = useRef<number | null>(null)
  const bubbleRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const leafRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isTapping, setIsTapping] = useState(false)

  useEffect(() => { injectStyles() }, [])

  const stopBubbles = useCallback(() => {
    if (bubbleRef.current) { clearInterval(bubbleRef.current); bubbleRef.current = null }
  }, [])

  const stopLeaves = useCallback(() => {
    if (leafRef.current) { clearInterval(leafRef.current); leafRef.current = null }
  }, [])

  const startBubbles = useCallback(() => {
    if (bubbleRef.current || !pboxRef.current) return
    createBubble(pboxRef.current)
    bubbleRef.current = setInterval(() => {
      if (pboxRef.current) createBubble(pboxRef.current)
    }, 200)
  }, [])

  const startLeaves = useCallback(() => {
    if (leafRef.current || !pboxRef.current) return
    createLeaf(pboxRef.current)
    leafRef.current = setInterval(() => {
      if (pboxRef.current) createLeaf(pboxRef.current)
    }, 450)
  }, [])

  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    ps1Ref.current?.setAttribute('stop-color', lerpHex(a.bodyTop, b.bodyTop, et))
    ps2Ref.current?.setAttribute('stop-color', lerpHex(a.bodyBot, b.bodyBot, et))

    const pcy = lerp(a.pupilCy, b.pupilCy, et)
    rpRef.current?.setAttribute('cy', String(pcy))
    lpRef.current?.setAttribute('cy', String(pcy))

    const rc = lerpHex(a.reflectCol, b.reflectCol, et)
    rl1Ref.current?.setAttribute('stroke', rc)
    rl2Ref.current?.setAttribute('stroke', rc)

    pl1Ref.current?.setAttribute('opacity', String(lerp(a.leaf ? 1 : 0, b.leaf ? 1 : 0, et)))
  }, [])

  useEffect(() => {
    const from = curRef.current
    const to   = emotion
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (wrapRef.current) wrapRef.current.className = 'pongdang-idle'
    stopBubbles(); stopLeaves()

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
        if (wrapRef.current) wrapRef.current.className = EMOTION_STATES[to].cssAnim
        if (EMOTION_STATES[to].bubbles) startBubbles()
        if (EMOTION_STATES[to].leaf)    startLeaves()
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [emotion, applyMorph, startBubbles, startLeaves, stopBubbles, stopLeaves])

  // 초기 렌더
  useEffect(() => {
    applyMorph(1, 'normal', emotion)
    if (wrapRef.current) wrapRef.current.className = EMOTION_STATES[emotion].cssAnim
    if (EMOTION_STATES[emotion].bubbles) startBubbles()
    if (EMOTION_STATES[emotion].leaf)    startLeaves()
    curRef.current = emotion
    return () => { stopBubbles(); stopLeaves() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 탭 핸들러
  const handleClick = useCallback(() => {
    onTap?.()
    if (isTapping) return
    setIsTapping(true)
    if (wrapRef.current) wrapRef.current.className = 'pongdang-tap'
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
      {/* 파티클 컨테이너 (버블 + 낙엽) */}
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
            <linearGradient id="pongdang-g" x1="100" y1="51" x2="100" y2="173" gradientUnits="userSpaceOnUse">
              <stop ref={ps1Ref} offset="0" stopColor="#C2B6DE" />
              <stop ref={ps2Ref} offset="1" stopColor="#C2B6DE" />
            </linearGradient>
            <linearGradient id="pongdang-lg" x1="102" y1="38.6" x2="102" y2="64.4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 몸통 (물방울) */}
          <path
            d="M91.669 65.5444C97.2524 59.6347 132.927 36.0023 117.303 65.5444C101.678 95.0865 154.302 131.578 167.119 150.646C179.936 169.713 165.774 173 154.302 173H54.6702C43.198 173 26.762 163.146 28.0739 138.525C29.3859 113.904 86.0856 71.4541 91.669 65.5444Z"
            fill="url(#pongdang-g)"
          />

          {/* 눈 흰자 */}
          <ellipse cx="96.684" cy="106.187" rx="8.863" ry="11.977" fill="white" />
          <ellipse cx="71.293" cy="106.187" rx="8.863" ry="11.977" fill="white" />

          {/* 눈동자 */}
          <ellipse ref={rpRef} cx="95.965" cy="101.636" rx="5.749" ry="7.426" fill="#666666" />
          <ellipse ref={lpRef} cx="70.574" cy="101.636" rx="5.749" ry="7.426" fill="#666666" />

          {/* 코 */}
          <path
            d="M82.9387 123.869C77.962 123.832 73.9472 121.146 73.9716 117.869C73.996 114.592 78.0502 111.966 83.027 112.003C88.0038 112.04 92.0184 114.726 91.994 118.002C91.9697 121.279 87.9155 123.905 82.9387 123.869Z"
            fill="#FF696C"
          />

          {/* 내부 반사 라인 (색상이 감정에 따라 변함) */}
          <path ref={rl1Ref} d="M52.8832 114.013C45.1912 122.298 34.3909 143.022 52.726 159.646" stroke="#E0D3FF" strokeWidth="8" strokeLinecap="round" />
          <path ref={rl2Ref} d="M96.0288 160.963L151.123 160.963" stroke="#E0D3FF" strokeWidth="8" strokeLinecap="round" />

          {/* 가을 낙엽 (opacity로 fade in/out) */}
          <path
            ref={pl1Ref}
            d="M101.544 38.4319C95.9489 44.0636 89.1626 57.1815 106.781 64.5992C111.634 60.6234 117.382 49.8239 101.544 38.4319Z"
            fill="url(#pongdang-lg)"
            opacity="0"
          />
        </svg>
      </div>
    </div>
  )
}
