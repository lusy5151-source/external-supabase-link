/**
 * PeggyAnimation.tsx
 * 완등 앱 - 페기 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <PeggyAnimation emotion="normal" size={160} />
 *   <PeggyAnimation emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   emotion  - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size     - 숫자 (px), 기본 160
 *   onTap    - 탭 콜백 (선택)
 *
 * 페기 특징:
 *   - 산에 버려진 쓰레기 모티브, 삐죽삐죽 별 모양
 *   - 빌런이지만 속은 여린 캐릭터
 *   - 기본: 위협적인 흔들림 (menace)
 *   - 화남: 삐죽삐죽 가시 진동 (spike)
 *   - 시무룩: 입 모양이 아래로 처짐 (mouth swap)
 *   - 가을: 느슨하게 살랑 + 낙엽 파티클
 *   - 비대칭 눈 (타원 + 삼각형) 고정
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface PeggyAnimationProps {
  emotion?: Emotion
  size?: number
  onTap?: () => void
}

// ─────────────────────────────────────────────
// 감정 상태 데이터
// ─────────────────────────────────────────────
const EMOTION_STATES: Record<Emotion, {
  bodyCenter: string   // radial gradient 중심 색
  bodyOuter:  string   // radial gradient 외곽 색
  hornColor:  string   // 뿔 색상
  sadMouth:   boolean  // 시무룩 입 여부
  leaf:       boolean  // 가을 낙엽 여부
  cssAnim:    string   // 움직임 CSS 클래스
}> = {
  normal: {
    bodyCenter: '#373737', bodyOuter: '#373737',
    hornColor: '#373737',
    sadMouth: false, leaf: false,
    cssAnim: 'peggy-menace',
  },
  sad: {
    bodyCenter: '#373737', bodyOuter: '#373737',
    hornColor: '#373737',
    sadMouth: true, leaf: false,
    cssAnim: 'peggy-slouch',
  },
  angry: {
    bodyCenter: '#FC0000', bodyOuter: '#4E0606',
    hornColor: '#640505',
    sadMouth: false, leaf: false,
    cssAnim: 'peggy-spike',
  },
  autumn: {
    bodyCenter: '#FF7C1F', bodyOuter: '#994A13',
    hornColor: '#EB731D',
    sadMouth: false, leaf: true,
    cssAnim: 'peggy-sway',
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
const STYLE_ID = 'peggy-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    /* 기본: 빌런스러운 위협적인 흔들림 */
    @keyframes peggy-menace {
      0%,100% { transform: rotate(-1.5deg) translateY(0px);   }
      50%     { transform: rotate( 1.5deg) translateY(-5px);  }
    }
    /* 시무룩: 속이 여려서 축 처짐 */
    @keyframes peggy-slouch {
      0%,100% { transform: translateY(0px)  scaleX(1)    scaleY(1);    }
      45%     { transform: translateY(7px)  scaleX(1.06) scaleY(0.94); }
      60%     { transform: translateY(8px)  scaleX(1.07) scaleY(0.93); }
    }
    /* 화남: 삐죽삐죽 가시 진동 */
    @keyframes peggy-spike {
      0%,100% { transform: scale(1, 1)       rotate(0deg);    }
      12%     { transform: scale(1.07, 0.94) rotate(-2.5deg); }
      25%     { transform: scale(0.94, 1.07) rotate( 2.5deg); }
      37%     { transform: scale(1.08, 0.93) rotate(-3deg);   }
      50%     { transform: scale(0.93, 1.08) rotate( 3deg);   }
      62%     { transform: scale(1.06, 0.95) rotate(-2deg);   }
      75%     { transform: scale(0.95, 1.06) rotate( 2deg);   }
      87%     { transform: scale(1.04, 0.97) rotate(-1deg);   }
    }
    /* 가을: 느슨하게 살랑살랑 */
    @keyframes peggy-sway {
      0%,100% { transform: rotate(-2deg); }
      50%     { transform: rotate( 2deg); }
    }
    /* 탭 리액션 */
    @keyframes peggy-tap {
      0%   { transform: scale(1)    rotate(0deg);   }
      20%  { transform: scale(1.12) rotate(-5deg);  }
      40%  { transform: scale(0.92) rotate( 5deg);  }
      60%  { transform: scale(1.08) rotate(-3deg);  }
      80%  { transform: scale(0.96) rotate( 2deg);  }
      100% { transform: scale(1)    rotate(0deg);   }
    }
    /* 낙엽 파티클 */
    @keyframes peggy-leaf1 {
      0%   { transform: translateY(-20px) rotate(0deg)   translateX(0px);  opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(520deg) translateX(28px); opacity: 0; }
    }
    @keyframes peggy-leaf2 {
      0%   { transform: translateY(-20px) rotate(0deg)    translateX(0px);   opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(-360deg) translateX(-22px); opacity: 0; }
    }
    @keyframes peggy-leaf3 {
      0%   { transform: translateY(-30px) rotate(0deg)   translateX(0px);  opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateY(200px) rotate(580deg) translateX(16px); opacity: 0; }
    }

    .peggy-menace { animation: peggy-menace 2.5s ease-in-out infinite; transform-origin: center center; }
    .peggy-slouch { animation: peggy-slouch 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .peggy-spike  { animation: peggy-spike  0.45s ease-in-out infinite; transform-origin: center center; }
    .peggy-sway   { animation: peggy-sway   2.5s ease-in-out infinite; transform-origin: center bottom; }
    .peggy-tap    { animation: peggy-tap    0.5s ease-out    forwards; transform-origin: center center; }
    .peggy-idle   { animation: none; }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 낙엽 파티클
// ─────────────────────────────────────────────
const LEAF_COLORS = ['#FF7C1F', '#DFB443', '#FF4D50', '#994A13', '#FFAC26', '#555555']
const LEAF_ANIMS  = ['peggy-leaf1', 'peggy-leaf2', 'peggy-leaf3']

function createLeaf(container: HTMLDivElement) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
  const sz = 10 + Math.floor(Math.random() * 8)
  el.innerHTML = `<svg width="${sz}" height="${sz}" viewBox="0 0 16 16"><path d="M14 1C7 0.5 1 4.5 3.5 10.5C6 7 12.5 7.5 14 1Z" fill="${color}"/></svg>`
  el.style.left  = `${Math.random() * 75 + 8}%`
  el.style.top   = '0'
  const dur = 2.5 + Math.random() * 2
  el.style.animation = `${LEAF_ANIMS[Math.floor(Math.random() * 3)]} ${dur}s ease-in forwards`
  container.appendChild(el)
  setTimeout(() => el.remove(), dur * 1000 + 200)
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function PeggyAnimation({
  emotion = 'normal',
  size = 160,
  onTap,
}: PeggyAnimationProps) {

  // SVG refs
  const ps1Ref  = useRef<SVGStopElement>(null)
  const ps2Ref  = useRef<SVGStopElement>(null)
  const hornRef = useRef<SVGPathElement>(null)
  // 입 (기본/화남)
  const mnRef   = useRef<SVGPathElement>(null)
  // 입 (시무룩)
  const msRef   = useRef<SVGPathElement>(null)
  // 이빨 (기본/화남)
  const tnRef   = useRef<SVGPathElement>(null)
  // 이빨 (시무룩)
  const tsRef   = useRef<SVGPathElement>(null)
  // 가을 낙엽 원본
  const fl1Ref  = useRef<SVGPathElement>(null)
  const fl2Ref  = useRef<SVGPathElement>(null)
  const fl3Ref  = useRef<SVGPathElement>(null)
  const fl4Ref  = useRef<SVGPathElement>(null)

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
    }, 480)
  }, [])

  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    // 몸통 radial gradient
    ps1Ref.current?.setAttribute('stop-color', lerpHex(a.bodyCenter, b.bodyCenter, et))
    ps2Ref.current?.setAttribute('stop-color', lerpHex(a.bodyOuter,  b.bodyOuter,  et))

    // 뿔 색상
    hornRef.current?.setAttribute('fill', lerpHex(a.hornColor, b.hornColor, et))

    // 입 전환 (opacity cross-fade)
    const sadOp = lerp(a.sadMouth ? 1 : 0, b.sadMouth ? 1 : 0, et)
    mnRef.current?.setAttribute('opacity', String(1 - sadOp))
    msRef.current?.setAttribute('opacity', String(sadOp))
    tnRef.current?.setAttribute('opacity', String(1 - sadOp))
    tsRef.current?.setAttribute('opacity', String(sadOp))

    // 가을 낙엽
    const lo = lerp(a.leaf ? 1 : 0, b.leaf ? 1 : 0, et)
    ;[fl1Ref, fl2Ref, fl3Ref, fl4Ref].forEach((r) =>
      r.current?.setAttribute('opacity', String(lo))
    )
  }, [])

  useEffect(() => {
    const from = curRef.current
    const to   = emotion
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (wrapRef.current) wrapRef.current.className = 'peggy-idle'
    stopLeaves()

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
    if (wrapRef.current) wrapRef.current.className = 'peggy-tap'
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
            <radialGradient id="peggy-g" cx="50%" cy="50%" r="55%">
              <stop ref={ps1Ref} offset="0%"   stopColor="#373737" />
              <stop ref={ps2Ref} offset="100%" stopColor="#373737" />
            </radialGradient>
            <linearGradient id="peggy-lg1" x1="157.5" y1="85.9" x2="135.4" y2="99.2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="peggy-lg2" x1="122.2" y1="70.3" x2="128.2" y2="95.4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="peggy-lg3" x1="86.1" y1="72" x2="76.5" y2="87.6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="peggy-lg4" x1="55.4" y1="94.1" x2="71" y2="103.7" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 몸통 (삐죽삐죽 별/쓰레기 모양) */}
          <path
            d="M100 61L135.043 90.0015L190 101.87L156.7 131.663L155.623 168L127.628 146.738L44.3769 168L43.3 131.663L10 101.87L54.5436 108.131L100 61Z"
            fill="url(#peggy-g)"
          />

          {/* 뿔 (왼쪽 위 삐죽이) */}
          <path
            ref={hornRef}
            d="M77.261 92.8528L50.3852 78.382L74.7148 62.4352L77.261 92.8528Z"
            fill="#373737"
          />

          {/* 오른쪽 눈 (타원 - 비대칭) */}
          <ellipse cx="121" cy="111" rx="6" ry="6.627" fill="#D9D9D9" />
          <ellipse cx="119.5" cy="109.5" rx="2.5" ry="2.5" fill="black" />

          {/* 왼쪽 눈 (삼각형 - 비대칭) */}
          <path d="M100 103L107 117H93L100 103Z" fill="#D9D9D9" />
          <circle cx="100.5" cy="112" r="2.5" fill="black" />

          {/* 입 — 기본/화남 (위로 커브) */}
          <path
            ref={mnRef}
            d="M88.1977 126.128C88.4314 125.933 88.7789 125.964 88.9743 126.197C91.6532 129.393 100.158 135.9 112.449 135.9C112.753 135.9 113 136.146 113 136.45C113 136.754 112.753 137 112.449 137C99.7798 137 90.9813 130.306 88.1284 126.903C87.9331 126.67 87.9641 126.323 88.1977 126.128Z"
            fill="#FF696C"
            opacity="1"
          />
          {/* 입 — 시무룩 (아래로 처짐) */}
          <path
            ref={msRef}
            d="M88.0076 126.585C88.0348 126.888 88.3021 127.112 88.6051 127.086C92.7598 126.725 103.373 128.15 112.054 136.851C112.269 137.066 112.617 137.067 112.832 136.853C113.048 136.638 113.047 136.29 112.832 136.074C103.884 127.105 92.9317 125.605 88.507 125.989C88.2041 126.015 87.9805 126.282 88.0076 126.585Z"
            fill="#FF696C"
            opacity="0"
          />

          {/* 이빨 — 기본/화남 */}
          <path
            ref={tnRef}
            d="M91.2632 129L94 130.485V136L90 135.576L91.2632 129Z"
            fill="#FFAC26"
            opacity="1"
          />
          {/* 이빨 — 시무룩 */}
          <path
            ref={tsRef}
            d="M96.658 127.796L93.6184 127.121L90 131.283L93.2972 133.587L96.658 127.796Z"
            fill="#FFAC26"
            opacity="0"
          />

          {/* 가을 낙엽 원본 (opacity fade) */}
          <path ref={fl1Ref} d="M157.335 85.3574C149.634 83.43 134.891 84.3084 137.529 103.242C143.427 105.378 155.647 104.793 157.335 85.3574Z" fill="url(#peggy-lg1)" opacity="0" />
          <path ref={fl2Ref} d="M121.543 70.3647C117.43 77.1555 113.923 91.5023 132.793 94.5637C136.574 89.557 139.617 77.7078 121.543 70.3647Z"   fill="url(#peggy-lg2)" opacity="0" />
          <path ref={fl3Ref} d="M85.8273 71.7387C80.3556 73.0495 71.3767 78.4302 79.2356 89.4665C83.643 88.8775 91.1318 84.5075 85.8273 71.7387Z"    fill="url(#peggy-lg3)" opacity="0" />
          <path ref={fl4Ref} d="M55.1056 94.3759C56.4055 99.8502 61.7682 108.84 72.8201 101.003C72.24 96.5944 67.885 89.0969 55.1056 94.3759Z"        fill="url(#peggy-lg4)" opacity="0" />
        </svg>
      </div>
    </div>
  )
}
