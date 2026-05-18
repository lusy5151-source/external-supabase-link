/**
 * DorongAnimation.tsx
 * 완등 앱 - 도롱이 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <DorongAnimation emotion="normal" size={160} />
 *   <DorongAnimation emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   emotion  - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size     - 숫자 (px), 기본 160
 *   onTap    - 탭 콜백 (선택)
 *
 * 도롱이 특징:
 *   - 물방울 캐릭터 → 기본: 똑똑 떨어지는 모션
 *   - 화남: 부글부글 솟구치는 모션
 *   - 가을: 낙엽 내리기 파티클
 *   - 내부 반사 라인 색상도 감정에 따라 변함
 *   - 눈 흰자 없이 눈동자만 있는 구조
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface DorongAnimationProps {
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
  reflectCol: string   // 내부 반사 라인 색상
  leaf:       boolean  // 가을 낙엽 여부
  cssAnim:    string   // 움직임 CSS 클래스
}> = {
  normal: {
    bodyTop: '#8DD6F0', bodyBot: '#8DD6F0',
    reflectCol: '#B5E6F8',
    leaf: false, cssAnim: 'dorong-drip',
  },
  sad: {
    bodyTop: '#8DD6F0', bodyBot: '#3D8CA8',
    reflectCol: '#B5E6F8',
    leaf: false, cssAnim: 'dorong-droop',
  },
  angry: {
    bodyTop: '#FF696C', bodyBot: '#8DD6F0',
    reflectCol: '#B5E6F8',
    leaf: false, cssAnim: 'dorong-rage',
  },
  autumn: {
    bodyTop: '#FFBE90', bodyBot: '#F3EC67',
    reflectCol: '#ffffff',
    leaf: true, cssAnim: 'dorong-sway',
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
const STYLE_ID = 'dorong-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    /* 기본: 똑똑 떨어지는 물방울 */
    @keyframes dorong-drip {
      0%,100% { transform: translateY(0px)    scaleX(1)    scaleY(1);    }
      20%     { transform: translateY(-10px)  scaleX(0.94) scaleY(1.06); }
      55%     { transform: translateY(6px)    scaleX(1.10) scaleY(0.90); }
      70%     { transform: translateY(-3px)   scaleX(0.97) scaleY(1.03); }
      85%     { transform: translateY(2px)    scaleX(1.03) scaleY(0.97); }
    }
    /* 시무룩: 천천히 흘러내림 */
    @keyframes dorong-droop {
      0%,100% { transform: translateY(0px)  scaleX(1)    scaleY(1);    }
      40%     { transform: translateY(8px)  scaleX(1.07) scaleY(0.93); }
      60%     { transform: translateY(9px)  scaleX(1.08) scaleY(0.92); }
    }
    /* 화남: 부들부들 + 위로 솟구침 */
    @keyframes dorong-rage {
      0%,100% { transform: translate(0px, 0px)    rotate(0deg);   }
      10%     { transform: translate(-3px, -6px)  rotate(-3deg);  }
      20%     { transform: translate( 3px, -10px) rotate( 3deg);  }
      30%     { transform: translate(-2px, -6px)  rotate(-2deg);  }
      40%     { transform: translate( 2px, -8px)  rotate( 2deg);  }
      50%     { transform: translate(-3px, -4px)  rotate(-3deg);  }
      60%     { transform: translate( 3px, -7px)  rotate( 3deg);  }
      70%     { transform: translate(-2px, -5px)  rotate(-2deg);  }
      80%     { transform: translate( 2px, -8px)  rotate( 2deg);  }
      90%     { transform: translate(-2px, -4px)  rotate(-1deg);  }
    }
    /* 가을: 살랑살랑 */
    @keyframes dorong-sway {
      0%,100% { transform: rotate(-3deg); }
      50%     { transform: rotate( 3deg); }
    }
    /* 탭 리액션 */
    @keyframes dorong-tap {
      0%   { transform: scale(1)    translateY(0px)   scaleX(1);    }
      25%  { transform: scale(0.88) translateY(6px)   scaleX(1.14); }
      60%  { transform: scale(1.12) translateY(-10px) scaleX(0.90); }
      100% { transform: scale(1)    translateY(0px)   scaleX(1);    }
    }
    /* 낙엽 파티클 */
    @keyframes dorong-leaf1 {
      0%   { transform: translateY(-20px) rotate(0deg)   translateX(0px);  opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(540deg) translateX(25px); opacity: 0; }
    }
    @keyframes dorong-leaf2 {
      0%   { transform: translateY(-20px) rotate(0deg)    translateX(0px);   opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(220px) rotate(-380deg) translateX(-20px); opacity: 0; }
    }
    @keyframes dorong-leaf3 {
      0%   { transform: translateY(-30px) rotate(0deg)   translateX(0px);  opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateY(200px) rotate(580deg) translateX(15px); opacity: 0; }
    }

    .dorong-drip  { animation: dorong-drip  2.2s ease-in-out infinite; transform-origin: center bottom; }
    .dorong-droop { animation: dorong-droop 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .dorong-rage  { animation: dorong-rage  0.5s ease-in-out infinite; transform-origin: center center; }
    .dorong-sway  { animation: dorong-sway  2s   ease-in-out infinite; transform-origin: center bottom; }
    .dorong-tap   { animation: dorong-tap   0.5s ease-out    forwards; transform-origin: center bottom; }
    .dorong-idle  { animation: none; }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 낙엽 파티클
// ─────────────────────────────────────────────
const LEAF_COLORS = ['#DFB443', '#FF8844', '#FF4D50', '#E8963C', '#FFBE90']
const LEAF_ANIMS  = ['dorong-leaf1', 'dorong-leaf2', 'dorong-leaf3']

function createLeaf(container: HTMLDivElement) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
  el.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15"><path d="M12 1C6.5 0.5 1.5 4 3.5 9.5C5.5 6.5 11 7 12 1Z" fill="${color}"/></svg>`
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
export default function DorongAnimation({
  emotion = 'normal',
  size = 160,
  onTap,
}: DorongAnimationProps) {

  // SVG refs
  const ds1Ref = useRef<SVGStopElement>(null)
  const ds2Ref = useRef<SVGStopElement>(null)
  const rlRef  = useRef<SVGPathElement>(null)
  const alRef  = useRef<SVGPathElement>(null)

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
    }, 420)
  }, [])

  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    ds1Ref.current?.setAttribute('stop-color', lerpHex(a.bodyTop, b.bodyTop, et))
    ds2Ref.current?.setAttribute('stop-color', lerpHex(a.bodyBot, b.bodyBot, et))
    rlRef.current?.setAttribute('stroke', lerpHex(a.reflectCol, b.reflectCol, et))
    alRef.current?.setAttribute('opacity', String(lerp(a.leaf ? 1 : 0, b.leaf ? 1 : 0, et)))
  }, [])

  useEffect(() => {
    const from = curRef.current
    const to   = emotion
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (wrapRef.current) wrapRef.current.className = 'dorong-idle'
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
    if (wrapRef.current) wrapRef.current.className = 'dorong-tap'
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
            <linearGradient id="dorong-g" x1="100" y1="43" x2="100" y2="156.4" gradientUnits="userSpaceOnUse">
              <stop ref={ds1Ref} offset="0" stopColor="#8DD6F0" />
              <stop ref={ds2Ref} offset="1" stopColor="#8DD6F0" />
            </linearGradient>
            <linearGradient id="dorong-lg" x1="69.7" y1="57" x2="81.1" y2="80.2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 몸통 (물방울) */}
          <path
            d="M74.6281 147.255C48.382 128.098 76.865 69.7697 94.3872 43C108.43 60.0688 133.486 98.9794 135.77 117.415C139.015 143.608 107.436 171.2 74.6281 147.255Z"
            fill="url(#dorong-g)"
          />

          {/* 눈동자 (흰자 없는 구조) */}
          <ellipse cx="114.01" cy="99.482" rx="4.118" ry="5.295" fill="#666666" />
          <ellipse cx="95.771" cy="99.482" rx="4.118" ry="5.295" fill="#666666" />

          {/* 내부 반사 라인 (색상이 감정에 따라 변함) */}
          <path
            ref={rlRef}
            d="M75.7672 96.54C70.2759 109.386 65.0592 137.313 88.1226 146.256"
            stroke="#B5E6F8"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* 코/볼 */}
          <ellipse cx="106.362" cy="109.778" rx="6.472" ry="5.001" fill="#FF696C" />

          {/* 가을 낙엽 (opacity로 fade in/out) */}
          <path
            ref={alRef}
            d="M69.0768 57.1514C66.5501 64.6774 66.2672 79.444 85.3492 78.3023C87.943 72.5896 88.3198 60.3617 69.0768 57.1514Z"
            fill="url(#dorong-lg)"
            opacity="0"
          />
        </svg>
      </div>
    </div>
  )
}
