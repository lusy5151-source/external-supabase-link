/**
 * DoramiAnimation.tsx
 * 완등 앱 - 도라미 캐릭터 애니메이션 컴포넌트
 *
 * 사용법:
 *   <DoramiAnimation emotion="normal" size={160} />
 *   <DoramiAnimation emotion={currentEmotion} size={120} onTap={() => {}} />
 *
 * Props:
 *   emotion     - 'normal' | 'sad' | 'angry' | 'autumn'  (기본: 'normal')
 *   size        - 숫자 (px), 기본 160
 *   stageWidth  - 굴러다닐 너비 (px), 기본 300 (normal일 때만 사용)
 *   onTap       - 탭 콜백 (선택)
 *
 * 도라미 특징:
 *   - 돌 캐릭터 → 기본: 바닥을 굴러다님
 *   - 그림자 면, 주근깨 위치 고정 (색상만 변함)
 *   - 형태 변화 없음, 그라디언트 색상만 변화
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type Emotion = 'normal' | 'sad' | 'angry' | 'autumn'

interface DoramiAnimationProps {
  emotion?: Emotion
  size?: number
  stageWidth?: number
  onTap?: () => void
}

// ─────────────────────────────────────────────
// 감정 상태 데이터
// ─────────────────────────────────────────────
const EMOTION_STATES: Record<Emotion, {
  bodyTop:   string   // 몸통 그라디언트 상단
  bodyBot:   string   // 몸통 그라디언트 하단
  pupilCy:   number   // 눈동자 cy (시무룩이면 아래로)
  freckle:   string   // 주근깨 색상
  leaves:    boolean  // 가을 낙엽 여부
  cssAnim:   string   // 움직임 CSS 클래스
  showShock: boolean  // 화남 충격파 여부
}> = {
  normal: {
    bodyTop: '#979797', bodyBot: '#979797',
    pupilCy: 108.291, freckle: '#5D5D5D',
    leaves: false, cssAnim: 'dorami-roll', showShock: false,
  },
  sad: {
    bodyTop: '#979797', bodyBot: '#0A3D55',
    pupilCy: 111.604, freckle: '#C6DBF0',
    leaves: false, cssAnim: 'dorami-droop', showShock: false,
  },
  angry: {
    bodyTop: '#313131', bodyBot: '#E84C4C',
    pupilCy: 108.291, freckle: '#D30000',
    leaves: false, cssAnim: 'dorami-stomp', showShock: true,
  },
  autumn: {
    bodyTop: '#979797', bodyBot: '#CE8434',
    pupilCy: 108.291, freckle: '#FFB120',
    leaves: true, cssAnim: 'dorami-sway', showShock: false,
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
const STYLE_ID = 'dorami-anim-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    /* 기본: 바닥을 굴러다님 — 이동 방향과 회전 방향 일치 */
    @keyframes dorami-roll {
      0%   { transform: translateX(-55px) rotate(0deg);   }
      50%  { transform: translateX( 55px) rotate(260deg); }
      100% { transform: translateX(-55px) rotate(0deg);   }
    }
    @keyframes dorami-droop {
      0%,100% { transform: translateY(0px) scaleX(1)    scaleY(1);    }
      40%     { transform: translateY(6px) scaleX(1.05) scaleY(0.95); }
      60%     { transform: translateY(7px) scaleX(1.06) scaleY(0.94); }
    }
    @keyframes dorami-stomp {
      0%,100% { transform: translateY(0px)    scaleX(1)    scaleY(1);    }
      25%     { transform: translateY(-18px)  scaleX(1)    scaleY(1);    }
      45%     { transform: translateY(5px)    scaleX(1.14) scaleY(0.80); }
      60%     { transform: translateY(0px)    scaleX(1)    scaleY(1);    }
    }
    @keyframes dorami-sway {
      0%,100% { transform: rotate(-3deg); }
      50%     { transform: rotate( 3deg); }
    }
    @keyframes dorami-tap {
      0%   { transform: scale(1)    translateY(0)    rotate(0deg);  }
      30%  { transform: scale(0.9)  translateY(4px)  rotate(0deg);  }
      60%  { transform: scale(1.1)  translateY(-6px) rotate(20deg); }
      100% { transform: scale(1)    translateY(0)    rotate(0deg);  }
    }
    @keyframes dorami-shock {
      0%   { width: 0;     height: 0;    opacity: 0.7; }
      100% { width: 130px; height: 22px; opacity: 0;   }
    }

    .dorami-roll  { animation: dorami-roll  3s   ease-in-out infinite; transform-origin: center center; }
    .dorami-droop { animation: dorami-droop 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .dorami-stomp { animation: dorami-stomp 0.6s ease-in-out infinite; transform-origin: center bottom; }
    .dorami-sway  { animation: dorami-sway  2s   ease-in-out infinite; transform-origin: center bottom; }
    .dorami-tap   { animation: dorami-tap   0.5s ease-out    forwards; transform-origin: center bottom; }
    .dorami-idle  { animation: none; }

    .dorami-shock-wave {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(232, 76, 76, 0.25);
      pointer-events: none;
      opacity: 0;
    }
    .dorami-shocking .dorami-shock-wave {
      animation: dorami-shock 0.6s ease-out infinite;
    }
  `
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DoramiAnimation({
  emotion = 'normal',
  size = 160,
  stageWidth,
  onTap,
}: DoramiAnimationProps) {

  // SVG refs
  const ds1Ref = useRef<SVGStopElement>(null)
  const ds2Ref = useRef<SVGStopElement>(null)
  const rpRef  = useRef<SVGEllipseElement>(null)
  const lpRef  = useRef<SVGEllipseElement>(null)
  const f1Ref  = useRef<SVGCircleElement>(null)
  const f2Ref  = useRef<SVGCircleElement>(null)
  const f3Ref  = useRef<SVGCircleElement>(null)
  const f4Ref  = useRef<SVGCircleElement>(null)
  const f5Ref  = useRef<SVGCircleElement>(null)
  const f6Ref  = useRef<SVGCircleElement>(null)
  const dl1Ref = useRef<SVGPathElement>(null)
  const dl2Ref = useRef<SVGPathElement>(null)
  const dl3Ref = useRef<SVGPathElement>(null)

  const wrapRef  = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const curRef   = useRef<Emotion>('normal')
  const rafRef   = useRef<number | null>(null)

  const [isTapping, setIsTapping] = useState(false)

  useEffect(() => { injectStyles() }, [])

  const applyMorph = useCallback((t: number, from: Emotion, to: Emotion) => {
    const a = EMOTION_STATES[from]
    const b = EMOTION_STATES[to]
    const et = ease(Math.max(0, Math.min(1, t)))

    // 몸통 그라디언트
    ds1Ref.current?.setAttribute('stop-color', lerpHex(a.bodyTop, b.bodyTop, et))
    ds2Ref.current?.setAttribute('stop-color', lerpHex(a.bodyBot, b.bodyBot, et))

    // 눈동자
    const pcy = lerp(a.pupilCy, b.pupilCy, et)
    rpRef.current?.setAttribute('cy', String(pcy))
    lpRef.current?.setAttribute('cy', String(pcy))

    // 주근깨 색상
    const fc = lerpHex(a.freckle, b.freckle, et)
    ;[f1Ref, f2Ref, f3Ref, f4Ref, f5Ref, f6Ref].forEach((r) =>
      r.current?.setAttribute('fill', fc)
    )

    // 가을 낙엽
    const lo = lerp(a.leaves ? 1 : 0, b.leaves ? 1 : 0, et)
    ;[dl1Ref, dl2Ref, dl3Ref].forEach((r) =>
      r.current?.setAttribute('opacity', String(lo))
    )
  }, [])

  useEffect(() => {
    const from = curRef.current
    const to   = emotion
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (wrapRef.current) wrapRef.current.className = 'dorami-idle'
    stageRef.current?.classList.remove('dorami-shocking')

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
        if (EMOTION_STATES[to].showShock) {
          stageRef.current?.classList.add('dorami-shocking')
        }
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [emotion, applyMorph])

  // 초기 렌더
  useEffect(() => {
    applyMorph(1, 'normal', emotion)
    if (wrapRef.current) {
      wrapRef.current.className = EMOTION_STATES[emotion].cssAnim
    }
    if (EMOTION_STATES[emotion].showShock) {
      stageRef.current?.classList.add('dorami-shocking')
    }
    curRef.current = emotion
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 탭 핸들러
  const handleClick = useCallback(() => {
    onTap?.()
    if (isTapping) return
    setIsTapping(true)
    if (wrapRef.current) wrapRef.current.className = 'dorami-tap'
    setTimeout(() => {
      setIsTapping(false)
      if (wrapRef.current) {
        wrapRef.current.className = EMOTION_STATES[curRef.current].cssAnim
      }
    }, 520)
  }, [isTapping, onTap])

  // normal일 때는 굴러다닐 공간이 필요해서 stageWidth 적용
  const containerWidth = emotion === 'normal' ? (stageWidth ?? Math.max(size * 2, 300)) : size

  return (
    <div
      ref={stageRef}
      onClick={handleClick}
      style={{
        width: containerWidth,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* 화남 충격파 */}
      <div className="dorami-shock-wave" />

      <div ref={wrapRef}>
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dorami-g" x1="99.5" y1="65" x2="99.5" y2="173.6" gradientUnits="userSpaceOnUse">
              <stop ref={ds1Ref} offset="0" stopColor="#979797" />
              <stop ref={ds2Ref} offset="1" stopColor="#979797" />
            </linearGradient>
            <linearGradient id="dorami-lg1" x1="154.6" y1="79.8" x2="132.4" y2="93"   gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="dorami-lg2" x1="107.8" y1="44"   x2="113.8" y2="69.1" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
            <linearGradient id="dorami-lg3" x1="67.1"  y1="33"   x2="57.5"  y2="48.6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DFB443" /><stop offset="1" stopColor="#FF4D50" />
            </linearGradient>
          </defs>

          {/* 몸통 (돌) */}
          <path
            d="M99.5485 65L137.032 77.708L165.097 119.298L153.179 157.692L99.5485 173.595L53.1987 157.692L34 119.298L53.1987 80.9034L99.5485 65Z"
            fill="url(#dorami-g)"
          />

          {/* 눈 흰자 */}
          <ellipse cx="65.062" cy="108.291" rx="8.56"  ry="10.517" fill="white" />
          <ellipse cx="87.075" cy="108.291" rx="8.56"  ry="10.517" fill="white" />

          {/* 눈동자 */}
          <ellipse ref={rpRef} cx="68.486" cy="108.291" rx="5.136" ry="6.604" fill="#666666" />
          <ellipse ref={lpRef} cx="90.254" cy="108.291" rx="5.381" ry="6.604" fill="#666666" />

          {/* 그림자 면 (고정 — 변형 없음) */}
          <path
            d="M112.244 137.752C115.913 136.076 129.186 141.428 137.326 138.994C145.466 136.56 151.47 151.81 147.928 154.326C144.386 156.842 116.127 163.265 108.931 166.99C101.735 170.716 108.575 139.429 112.244 137.752Z"
            fill="#5D5D5D"
          />
          <path
            d="M61.1719 144.086C63.8388 142.288 85.1178 150.604 95.2288 148.564C105.34 146.524 100.282 166.013 97.4783 168.314C94.6745 170.616 55.5231 156.719 54.7944 153.955C54.0657 151.192 58.5049 145.885 61.1719 144.086Z"
            fill="#5D5D5D"
          />

          {/* 주근깨 (위치 고정, 색상만 감정에 따라 변함) */}
          <circle ref={f1Ref} cx="48.186"  cy="113.917" r="2.935" fill="#5D5D5D" />
          <circle ref={f2Ref} cx="106.886" cy="118.32"  r="1.468" fill="#5D5D5D" />
          <circle ref={f3Ref} cx="98.570"  cy="127.124" r="2.935" fill="#5D5D5D" />
          <circle ref={f4Ref} cx="113.245" cy="126.146" r="4.892" fill="#5D5D5D" />
          <circle ref={f5Ref} cx="58.703"  cy="124.434" r="2.201" fill="#5D5D5D" />
          <circle ref={f6Ref} cx="47.941"  cy="122.966" r="2.690" fill="#5D5D5D" />

          {/* 가을 낙엽 (opacity로 fade in/out) */}
          <path ref={dl1Ref} d="M154.38 79.2041C146.678 77.2767 131.935 78.1551 134.573 97.0883C140.472 99.2251 152.692 98.6398 154.38 79.2041Z" fill="url(#dorami-lg1)" opacity="0" />
          <path ref={dl2Ref} d="M107.139 44.0137C103.027 50.8044 99.5199 65.1512 118.389 68.2126C122.17 63.2059 125.214 51.3568 107.139 44.0137Z"   fill="url(#dorami-lg2)" opacity="0" />
          <path ref={dl3Ref} d="M66.8273 32.7387C61.3556 34.0495 52.3767 39.4302 60.2356 50.4665C64.643 49.8775 72.1318 45.5075 66.8273 32.7387Z"    fill="url(#dorami-lg3)" opacity="0" />
        </svg>
      </div>
    </div>
  )
}
