/**
 * OreumAnimation.tsx
 * 완등 앱 - 오름이 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <OreumAnimation emotion="normal" size={160} />
 *   <OreumAnimation emotion={currentEmotion} size={120} onTap={() => console.log('탭!')} />
 *
 * Props:
 *   emotion  - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size     - 숫자 (px), 기본 160
 *   onTap    - 탭 콜백 (선택)
 */

import { useEffect, useRef, useCallback, useState } from 'react'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface OreumAnimationProps {
  emotion?: Emotion
  size?: number
  onTap?: () => void
}

// ─────────────────────────────────────────────
// 각 감정 상태 데이터
// body: [apex_x, apex_y, left_ctrl_x, curve_y, bot_y, right_x, right_ctrl_x]
// h1/h2: [[x,y],[x,y],[x,y]] 삼각형 3꼭짓점
// ─────────────────────────────────────────────
const EMOTION_STATES: Record<Emotion, {
  body: number[]
  gt: string   // 그라디언트 상단색
  gb: string   // 그라디언트 하단색
  h1: [number, number][]
  h2: [number, number][]
  hc1: string  // 머리카락1 색
  hc2: string  // 머리카락2 색
  leaf: number // 가을 왼쪽 잎 투명도
  reCx: number; reCy: number; reRy: number  // 오른쪽 눈 흰자
  leCx: number; leCy: number; leRy: number  // 왼쪽 눈 흰자
  pcy: number  // 눈동자 cy
  cssAnim: string  // 움직임 CSS 클래스명
}> = {
  normal: {
    body:  [100.996, 104.62,  71.7247, 154,     183,     153, 130.267],
    gt: '#E5F393', gb: '#E5F393',
    h1: [[132.451, 104.097], [128.625, 119.609], [118.788, 112.514]],
    h2: [[135.062, 112.624], [132.078, 124.723], [124.406, 119.189]],
    hc1: '#E5F393', hc2: '#E5F393',
    leaf: 0,
    reCx: 110.406, reCy: 156.793, reRy: 9.858,
    leCx: 89.594,  leCy: 156.793, leRy: 9.858,
    pcy: 152.946,
    cssAnim: 'oreumi-float',
  },
  sad: {
    body:  [102.524, 101.872, 72.4245, 152.983, 183,     156, 132.624],
    gt: '#E5F393', gb: '#64C4FF',
    h1: [[150.272, 121.642], [140.551, 135.013], [133.97,  124.385]],
    h2: [[149.415, 130.827], [141.833, 141.255], [136.701, 132.967]],
    hc1: '#8FD3DB', hc2: '#9DD9CF',
    leaf: 0,
    reCx: 112.201, reCy: 155.875, reRy: 10.203,
    leCx: 90.799,  leCy: 155.875, leRy: 10.203,
    pcy: 159.856,
    cssAnim: 'oreumi-droop',
  },
  angry: {
    body:  [102.524, 102,     72.4245, 153.031, 183,     156, 132.624],
    gt: '#E5F393', gb: '#FF696C',
    h1: [[102.504, 89.281],  [108.152, 104.814], [95.664,  104.327]],
    h2: [[109.638, 95.127],  [114.043, 107.241], [104.304, 106.861]],
    hc1: '#FF7676', hc2: '#FF8888',
    leaf: 0,
    reCx: 112.5,   reCy: 155,     reRy: 10,
    leCx: 91,      leCy: 155,     leRy: 10,
    pcy: 151.5,
    cssAnim: 'oreumi-rage',
  },
  autumn: {
    body:  [100.996, 104.65,  71.7247, 154.355, 183.545, 153, 130.267],
    gt: '#FFB25B', gb: '#E5F393',
    h1: [[132.452, 104.124], [128.625, 119.738], [118.789, 112.596]],
    h2: [[135.062, 112.707], [132.078, 124.885], [124.406, 119.315]],
    hc1: '#F9C269', hc2: '#FAC067',
    leaf: 1,
    reCx: 110.407, reCy: 157.167, reRy: 9.922,
    leCx: 89.594,  leCy: 157.167, leRy: 9.922,
    pcy: 153.294,
    cssAnim: 'oreumi-sway',
  },
}

// ─────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpArr = (a: number[], b: number[], t: number) =>
  a.map((v, i) => lerp(v, b[i], t))

const lerpPts = (
  a: [number, number][],
  b: [number, number][],
  t: number
): [number, number][] =>
  a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)])

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

const mkBody = (p: number[]) => {
  const [ax, ay, lcx, cy, by, rx, rcx] = p
  return `M${ax} ${ay}C${lcx} ${ay} 47 ${cy} 47 ${by}H${rx}C${rx} ${cy} ${rcx} ${ay} ${ax} ${ay}Z`
}

const mkHair = (pts: [number, number][]) =>
  `M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}L${pts[2][0]} ${pts[2][1]}Z`

// ─────────────────────────────────────────────
// CSS 인젝션 (컴포넌트 첫 마운트 시 한 번만)
// ─────────────────────────────────────────────
const STYLE_ID = 'oreumi-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes oreumi-float {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-10px); }
    }
    @keyframes oreumi-droop {
      0%,100% { transform: translateY(0px) scaleX(1); }
      40%     { transform: translateY(6px) scaleX(1.03); }
      60%     { transform: translateY(7px) scaleX(1.03); }
    }
    @keyframes oreumi-rage {
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
    @keyframes oreumi-sway {
      0%,100% { transform: rotate(-3deg); }
      50%     { transform: rotate( 3deg); }
    }
    @keyframes oreumi-tap {
      0%   { transform: scale(1) translateY(0); }
      30%  { transform: scale(0.92) translateY(4px); }
      60%  { transform: scale(1.08) translateY(-8px); }
      100% { transform: scale(1) translateY(0); }
    }

    .oreumi-float { animation: oreumi-float 2.4s ease-in-out infinite; transform-origin: center bottom; }
    .oreumi-droop { animation: oreumi-droop 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .oreumi-rage  { animation: oreumi-rage  0.45s linear infinite;     transform-origin: center bottom; }
    .oreumi-sway  { animation: oreumi-sway  2s ease-in-out infinite;   transform-origin: center bottom; }
    .oreumi-tap   { animation: oreumi-tap   0.5s ease-out forwards;    transform-origin: center bottom; }
    .oreumi-idle  { animation: none; }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function OreumAnimation({
  emotion = 'normal',
  size = 160,
  onTap,
}: OreumAnimationProps) {

  // SVG element refs
  const bdRef   = useRef<SVGPathElement>(null)
  const h1Ref   = useRef<SVGPathElement>(null)
  const h2Ref   = useRef<SVGPathElement>(null)
  const alRef   = useRef<SVGPathElement>(null)
  const gs1Ref  = useRef<SVGStopElement>(null)
  const gs2Ref  = useRef<SVGStopElement>(null)
  const reRef   = useRef<SVGEllipseElement>(null)
  const leRef   = useRef<SVGEllipseElement>(null)
  const rpRef   = useRef<SVGEllipseElement>(null)
  const lpRef   = useRef<SVGEllipseElement>(null)

  // 애니메이션 래퍼 ref
  const wrapRef = useRef<HTMLDivElement>(null)

  // 현재/목표 감정 추적
  const curRef  = useRef<Emotion>('normal')
  const rafRef  = useRef<number | null>(null)

  // 탭 상태
  const [isTapping, setIsTapping] = useState(false)

  // 스타일 주입
  useEffect(() => { injectStyles() }, [])

  // SVG 속성 일괄 적용
  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    // 몸통
    bdRef.current?.setAttribute('d', mkBody(lerpArr(a.body, b.body, et)))

    // 그라디언트
    gs1Ref.current?.setAttribute('stop-color', lerpHex(a.gt, b.gt, et))
    gs2Ref.current?.setAttribute('stop-color', lerpHex(a.gb, b.gb, et))

    // 머리카락
    h1Ref.current?.setAttribute('d', mkHair(lerpPts(a.h1, b.h1, et)))
    h2Ref.current?.setAttribute('d', mkHair(lerpPts(a.h2, b.h2, et)))
    h1Ref.current?.setAttribute('fill', lerpHex(a.hc1, b.hc1, et))
    h2Ref.current?.setAttribute('fill', lerpHex(a.hc2, b.hc2, et))

    // 가을 잎
    alRef.current?.setAttribute('opacity', String(lerp(a.leaf, b.leaf, et)))

    // 눈 흰자
    reRef.current?.setAttribute('cx',  String(lerp(a.reCx, b.reCx, et)))
    reRef.current?.setAttribute('cy',  String(lerp(a.reCy, b.reCy, et)))
    reRef.current?.setAttribute('ry',  String(lerp(a.reRy, b.reRy, et)))
    leRef.current?.setAttribute('cx',  String(lerp(a.leCx, b.leCx, et)))
    leRef.current?.setAttribute('cy',  String(lerp(a.leCy, b.leCy, et)))
    leRef.current?.setAttribute('ry',  String(lerp(a.leRy, b.leRy, et)))

    // 눈동자
    rpRef.current?.setAttribute('cy',  String(lerp(a.pcy, b.pcy, et)))
    lpRef.current?.setAttribute('cy',  String(lerp(a.pcy, b.pcy, et)))
  }, [])

  // emotion prop 변경 시 morphing 실행
  useEffect(() => {
    const from = curRef.current
    const to   = emotion

    if (from === to) return

    // 진행 중인 RAF 취소
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    // 래퍼 애니메이션 잠깐 중지
    if (wrapRef.current) wrapRef.current.className = 'oreumi-idle'

    let start: number | null = null
    const DURATION = 600

    const step = (ts: number) => {
      if (!start) start = ts
      const prog = Math.min((ts - start) / DURATION, 1)
      applyMorph(prog, from, to)

      if (prog < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        // 완료 → 해당 감정 움직임 적용
        curRef.current = to
        if (wrapRef.current) {
          wrapRef.current.className = EMOTION_STATES[to].cssAnim
        }
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [emotion, applyMorph])

  // 초기 렌더
  useEffect(() => {
    applyMorph(1, 'normal', emotion)
    if (wrapRef.current) {
      wrapRef.current.className = EMOTION_STATES[emotion].cssAnim
    }
    curRef.current = emotion
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 탭 핸들러
  const handleClick = useCallback(() => {
    onTap?.()
    if (isTapping) return
    setIsTapping(true)
    if (wrapRef.current) wrapRef.current.className = 'oreumi-tap'
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
      style={{ width: size, height: size, cursor: 'pointer', userSelect: 'none' }}
    >
      <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 몸통 그라디언트 */}
            <linearGradient
              id="oreumi-bg"
              x1="100" y1="183" x2="100" y2="102"
              gradientUnits="userSpaceOnUse"
            >
              <stop ref={gs1Ref} offset="0"  stopColor="#E5F393" />
              <stop ref={gs2Ref} offset="1"  stopColor="#E5F393" />
            </linearGradient>

            {/* 가을 왼쪽 잎 그라디언트 (고정) */}
            <linearGradient
              id="oreumi-leaf-g"
              x1="63.69" y1="112.1" x2="68.4" y2="134.05"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#DFB443" />
              <stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 가을 왼쪽 잎 */}
          <path
            ref={alRef}
            d="M63.1503 112.101C59.4183 117.909 56.0376 130.3 72.3704 133.397C75.773 129.132 78.6927 118.902 63.1503 112.101Z"
            fill="url(#oreumi-leaf-g)"
            opacity="0"
          />

          {/* 몸통 */}
          <path ref={bdRef} fill="url(#oreumi-bg)" />

          {/* 눈 흰자 */}
          <ellipse ref={reRef} cx="110.406" cy="156.793" rx="7.26"  ry="9.858" fill="white" />
          <ellipse ref={leRef} cx="89.594"  cy="156.793" rx="7.26"  ry="9.858" fill="white" />

          {/* 눈동자 */}
          <ellipse ref={rpRef} cx="109.68"  cy="152.946" rx="4.598" ry="6.011" fill="#666666" />
          <ellipse ref={lpRef} cx="88.868"  cy="152.946" rx="4.598" ry="6.011" fill="#666666" />

          {/* 코 */}
          <path
            d="M98.9814 170.985C94.9058 170.955 91.618 168.769 91.638 166.104C91.658 163.438 94.978 161.301 99.054 161.331C103.129 161.361 106.417 163.546 106.397 166.212C106.377 168.878 103.057 171.015 98.9814 170.985Z"
            fill="#FF696C"
          />

          {/* 머리카락 (몸통 위 레이어) */}
          <path ref={h1Ref} fill="#E5F393" />
          <path ref={h2Ref} fill="#E5F393" />
        </svg>
      </div>
    </div>
  )
}
