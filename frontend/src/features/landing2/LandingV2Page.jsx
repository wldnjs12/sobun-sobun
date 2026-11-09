import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { calcPerPersonPrice } from '../pod/podUtils.js'
import styles from './LandingV2.module.css'

/**
 * 시연용 랜딩 페이지 2번째 버전 (/intro2) — "궁금해서 계속 내리게" 만드는 화려한 버전.
 * 1번째 버전(/intro, features/landing)은 정보 위주로 그대로 두고, 이쪽은 움직임으로 관심을 끈다.
 *
 * 라이브러리 없이 React + CSS만 쓴다:
 *   - 스크롤 위치 → CSS 변수(--p)로 넘겨서 CSS가 움직임을 계산 (React 다시 그리기를 줄이려고)
 *   - 화면에 들어올 때 → IntersectionObserver
 *   - 마우스 위치 → CSS 변수(--mx, --my)
 * "움직임 줄이기" 설정을 켠 사람에게는 애니메이션을 끄고 최종 상태를 바로 보여준다.
 *
 * 숫자는 팀 문서 근거만: 설문 88·79·56% = PRODUCT_SPEC 2절, 단가 격차 30~53% = features/02-pod.md.
 * 예시 금액은 앱과 같은 calcPerPersonPrice로 계산한다.
 */

const DEMO = { total: 21990, rate: 0.05, people: 3 }
const SOLO_PRICE = calcPerPersonPrice(DEMO.total, DEMO.rate, 1)
const SHARE_PRICE = calcPerPersonPrice(DEMO.total, DEMO.rate, DEMO.people)

const HOOK_ITEMS = ['화장지 30롤', '생수 24병', '세탁세제 4개입', '물티슈 10팩', '키친타월 12롤']
const MARQUEE_TOP = ['화장지', '생수 2L', '샴푸', '세탁세제', '수세미', '라면', '쓰레기봉투', '바디워시']
const MARQUEE_BOTTOM = ['미개봉 그대로', '같은 건물만', '수수료 0원', '비대면 픽업', '영수증 자동 인식', '익명 커뮤니티', '실시간 참여', '수고비 5%']

const STORY = [
  { kicker: '01 · 문제', title: '싸서 샀는데,', accent: '너무 많아요', body: '대용량과 소포장의 단가 차이는 품목별 30~53%. 그런데 30롤은 혼자 쓰기엔 끝이 안 보여요.' },
  { kicker: '02 · 소분', title: '같은 건물 이웃 셋이', accent: '10롤씩 나누면', body: '포장을 뜯지 않고, 묶음 단위 그대로. 위생 걱정도, 소분 봉투도 필요 없어요.' },
  { kicker: '03 · 결과', title: '대용량 가격 그대로,', accent: '필요한 만큼만', body: '혼자 다 사면 내야 할 금액이 이웃과 나누는 순간 3분의 1로. 대표 수고비 5%까지 포함한 금액이에요.' },
]

const FEATURES = [
  { icon: 'apartment', color: 'blue', title: '같은 건물만', body: '주소로 한 번, 행동할 때 GPS로 또 한 번. 다른 건물 사람은 링크로 들어와도 못 봐요.' },
  { icon: 'inventory_2', color: 'orange', title: '미개봉 나눔', body: '화장지는 10롤씩, 생수는 6병 한 팩씩. 뜯지 않은 단위로만 나눠요.' },
  { icon: 'document_scanner', color: 'yellow', title: '영수증 정산', body: '찍으면 금액을 읽고 1인 금액을 계산. 송금 링크로 [보냈어요]까지.' },
  { icon: 'visibility_off', color: 'blue', title: '얼굴 안 봐도 OK', body: '대표가 공동현관 앞에 두면 미개봉인지 보고 [수령 완료]. 커뮤니티에선 "이웃 1, 2"로만.' },
]

const STATS = [
  { value: 88, suffix: '%', label: '대용량을 샀다가\n다 못 쓰고 버린 경험' },
  { value: 79, suffix: '%', label: '최근 한 달 안에\n버린 경험' },
  { value: 56, suffix: '%', label: '공동구매를 망설이는 이유 1위\n낯선 이웃과의 접촉 부담' },
]

export default function LandingV2Page() {
  const reduceMotion = usePrefersReducedMotion()
  useReveal()
  const tour = useAutoTour(!reduceMotion)

  return (
    <div className={`${styles.page} ${reduceMotion ? styles.calm : ''}`}>
      <ScrollProgressBar />
      <TourToggle tour={tour} />
      <TopNav />
      <Hero reduceMotion={reduceMotion} />
      <Marquee />
      <StorySlider reduceMotion={reduceMotion} />
      <LiveSync reduceMotion={reduceMotion} />
      <Stats reduceMotion={reduceMotion} />
      <Features />
      <Finale />
      <footer className={styles.footer}>
        <span>
          <img src="/logo.svg" alt="" /> 소분소분
        </span>
        <span>팀 뿌리 · MOONG TechThon 2026</span>
      </footer>
    </div>
  )
}

/* ───────────── 페이지 자동 넘김 (발표용) ───────────── */
/**
 * 섹션마다 정해진 시간만큼 머문 뒤 다음 섹션으로 부드럽게 내려가고, 마지막 다음엔 맨 위로 돌아가 계속 반복한다.
 * 발표자가 직접 스크롤·터치·키보드를 쓰면 RESUME_MS 동안 멈췄다가, 그때 보고 있는 섹션부터 다시 이어간다.
 * 슬라이드 섹션(story)은 3장 × 5초를 다 보여줄 수 있게 15초 머문다.
 */
const TOUR = [
  { id: 'top', ms: 7000 },
  { id: 'story', ms: 15500 },
  { id: 'live', ms: 8000 },
  { id: 'stats', ms: 6000 },
  { id: 'features', ms: 6000 },
  { id: 'finale', ms: 7000 },
]
const RESUME_MS = 12000

function useAutoTour(allowed) {
  const [enabled, setEnabled] = useState(allowed)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)
  const resumeTimer = useRef(0)

  // 지금 화면 위쪽 40% 지점에 걸친 섹션이 몇 번째인지
  const currentIndex = () => {
    const line = window.scrollY + window.innerHeight * 0.4
    let found = 0
    TOUR.forEach((t, i) => {
      const el = document.getElementById(t.id)
      if (el && el.getBoundingClientRect().top + window.scrollY <= line) found = i
    })
    return found
  }

  // 사람이 직접 움직이면 잠깐 멈춤
  useEffect(() => {
    if (!enabled) return undefined
    const onUser = () => {
      setPaused(true)
      clearTimeout(resumeTimer.current)
      resumeTimer.current = setTimeout(() => {
        setIndex(currentIndex())
        setPaused(false)
      }, RESUME_MS)
    }
    const onKey = (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) onUser()
    }
    window.addEventListener('wheel', onUser, { passive: true })
    window.addEventListener('touchmove', onUser, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onUser)
      window.removeEventListener('touchmove', onUser)
      window.removeEventListener('keydown', onKey)
      clearTimeout(resumeTimer.current)
    }
  }, [enabled])

  // 지금 섹션에서 정해진 시간이 지나면 다음 섹션으로
  useEffect(() => {
    if (!enabled || paused) return undefined
    const timerId = setTimeout(() => {
      const next = (index + 1) % TOUR.length
      const el = document.getElementById(TOUR[next].id)
      if (el) window.scrollTo({ top: next === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' })
      setIndex(next)
    }, TOUR[index].ms)
    return () => clearTimeout(timerId)
  }, [enabled, paused, index])

  const toggle = () => {
    if (!enabled) {
      setIndex(currentIndex()) // 다시 켜면 지금 보는 섹션부터
      setPaused(false)
    }
    setEnabled(!enabled)
  }

  return { enabled, paused, index, toggle }
}

/** 오른쪽 아래 자동 넘김 켜기/끄기 버튼. 켜져 있으면 지금 섹션에 머무는 시간만큼 테두리가 차오른다 */
function TourToggle({ tour }) {
  const { enabled, paused, index, toggle } = tour
  const running = enabled && !paused
  return (
    <button type="button" className={`${styles.tourToggle} ${running ? styles.tourOn : ''}`} onClick={toggle}>
      {running && <span key={index} className={styles.tourFill} style={{ animationDuration: `${TOUR[index].ms}ms` }} />}
      <Icon name={enabled ? (paused ? 'pause_circle' : 'autoplay') : 'play_circle'} size={18} />
      {enabled ? (paused ? '잠깐 멈춤' : `자동 넘김 ${index + 1}/${TOUR.length}`) : '자동 넘김 켜기'}
    </button>
  )
}

/* ───────────── 맨 위 진행 막대 ───────────── */
function ScrollProgressBar() {
  const barRef = useRef(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      barRef.current?.style.setProperty('--progress', max > 0 ? String(window.scrollY / max) : '0')
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return <div ref={barRef} className={styles.progressBar} aria-hidden="true" />
}

function TopNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <span className={styles.navBrand}>
        <img src="/logo.svg" alt="" /> 소분소분
      </span>
      <Link to="/" className={styles.navCta}>
        앱 열기 <Icon name="north_east" size={16} />
      </Link>
    </nav>
  )
}

/* ───────────── 1. 히어로 ───────────── */
function Hero({ reduceMotion }) {
  const heroRef = useRef(null)

  // 마우스를 따라다니는 빛
  const onMouseMove = (e) => {
    const rect = heroRef.current.getBoundingClientRect()
    heroRef.current.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    heroRef.current.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  return (
    <header id="top" ref={heroRef} className={styles.hero} onMouseMove={onMouseMove}>
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroSpot} aria-hidden="true" />
      <div className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
      <div className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
      <div className={`${styles.blob} ${styles.blobC}`} aria-hidden="true" />
      <Particles />

      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <span className={styles.heroBadge}>
            <span className={styles.liveDot} /> 같은 건물 이웃 공동구매
          </span>
          <h1 className={styles.heroTitle}>
            <span className={styles.line}>
              <span style={{ '--d': '0.1s' }}>그 많은</span>
            </span>
            <span className={styles.line}>
              <span style={{ '--d': '0.25s' }} className={styles.scrambleSlot}>
                <ScrambleText words={HOOK_ITEMS} paused={reduceMotion} />
              </span>
            </span>
            <span className={styles.line}>
              <span style={{ '--d': '0.4s' }} className={styles.heroQuestion}>
                혼자 다 쓸 수 있어요?
              </span>
            </span>
          </h1>
          <p className={styles.heroSub}>
            대용량은 싸지만 너무 많고, 둘 곳도 없죠.
            <br />
            <strong>엘리베이터 거리의 이웃</strong>과 나누면 이야기가 달라져요.
          </p>
          <div className={styles.heroCtas}>
            <MagneticLink to="/" className={styles.ctaPrimary}>
              우리 건물 팟 보러 가기 <Icon name="arrow_forward" size={20} />
            </MagneticLink>
            <a href="#story" className={styles.ctaGhost}>
              <Icon name="south" size={18} /> 어떻게 나누냐고요?
            </a>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.orbit}>
            <span className={styles.orbitItem} style={{ '--i': 0 }}><Icon name="layers" size={28} /></span>
            <span className={styles.orbitItem} style={{ '--i': 1 }}><Icon name="water_drop" size={28} /></span>
            <span className={styles.orbitItem} style={{ '--i': 2 }}><Icon name="sanitizer" size={28} /></span>
            <span className={styles.orbitItem} style={{ '--i': 3 }}><Icon name="local_laundry_service" size={28} /></span>
            <span className={styles.orbitItem} style={{ '--i': 4 }}><Icon name="ramen_dining" size={28} /></span>
          </div>
          <RoundBlock />
          <div className={styles.priceChip}>
            <span>1인당</span>
            <s>{SOLO_PRICE.toLocaleString()}원</s>
            <Icon name="arrow_forward" size={16} />
            <strong>{SHARE_PRICE.toLocaleString()}원</strong>
          </div>
        </div>
      </div>

      <a href="#story" className={styles.scrollCue} aria-label="아래로 스크롤">
        <span className={styles.mouse}>
          <span />
        </span>
        스크롤해서 나눠보기
      </a>
    </header>
  )
}

/**
 * 히어로의 둥근 블록. 둥근 사각형 판 LAYERS장을 두께 방향으로 겹쳐 쌓는다 (CSS는 .layer 설명 참고).
 *   t: 0(뒤) ~ 1(앞) 위치, s: 크기(앞뒤 가장자리 BEVEL장은 원 모양 곡선으로 조금씩 작게 → 둥글게 깎인 모서리),
 *   light: 가장자리일수록 밝게
 */
const LAYERS = 56
const BEVEL = 9
const BLOCK_LAYERS = Array.from({ length: LAYERS }, (_, i) => {
  const t = i / (LAYERS - 1)
  const fromEdge = Math.min(i, LAYERS - 1 - i) // 앞뒤 끝에서 몇 번째 판인지
  const k = Math.max(0, (BEVEL - fromEdge) / BEVEL) // 끝일수록 1
  const s = 0.9 + 0.1 * Math.sqrt(1 - k * k) // 원 곡선: 끝판 0.9 → 안쪽 1
  return { t, s, light: Math.max(0, 0.55 * k + 0.08) }
})

function RoundBlock() {
  return (
    <div className={styles.cubeScene}>
      <div className={styles.cubeFloat}>
        <div className={styles.cube}>
          {BLOCK_LAYERS.map((l, i) => (
            <span key={i} className={styles.layer} style={{ '--t': l.t, '--s': l.s, '--light': l.light }} />
          ))}
          <div className={`${styles.blockFace} ${styles.blockFront}`}>
            <img src="/logo.svg" alt="" />
          </div>
          <div className={`${styles.blockFace} ${styles.blockBack}`}>
            <strong>30</strong>
            <span>롤 → 10롤씩 셋</span>
          </div>
        </div>
      </div>
      <div className={styles.cubeShadow} />
    </div>
  )
}

/** 떠다니는 작은 빛 알갱이 (위치·속도는 처음 한 번만 정해서 다시 그려도 그대로) */
function Particles() {
  const [dots] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 8 + Math.random() * 10,
      delay: -Math.random() * 18,
      drift: (Math.random() - 0.5) * 120,
    })),
  )
  return (
    <div className={styles.particles} aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            '--drift': `${d.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * 글자가 마구 섞였다가 한 글자씩 제자리를 찾아가며 다음 단어로 바뀌는 효과.
 * 섞이는 동안 보여줄 글자는 아래 SCRAMBLE_CHARS에서 무작위로 고른다.
 */
const SCRAMBLE_CHARS = '소분■▲●◆0123456789+÷'
function ScrambleText({ words, paused }) {
  const [text, setText] = useState(words[0])
  useEffect(() => {
    if (paused) return undefined
    let index = 0
    let frameTimer = 0
    const cycle = setInterval(() => {
      index = (index + 1) % words.length
      const target = words[index]
      let step = 0
      const totalSteps = 14
      clearInterval(frameTimer)
      frameTimer = setInterval(() => {
        step += 1
        const settled = Math.floor((step / totalSteps) * target.length)
        const next = target
          .split('')
          .map((ch, i) => {
            if (i < settled || ch === ' ') return ch
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          })
          .join('')
        setText(next)
        if (step >= totalSteps) {
          clearInterval(frameTimer)
          setText(target)
        }
      }, 45)
    }, 2600)
    return () => {
      clearInterval(cycle)
      clearInterval(frameTimer)
    }
  }, [words, paused])
  return <span className={styles.scramble}>{text}</span>
}

/** 마우스를 가까이 대면 버튼이 살짝 끌려오는 링크 */
function MagneticLink({ to, className, children }) {
  const ref = useRef(null)
  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    ref.current.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`
  }
  const onLeave = () => {
    ref.current.style.transform = ''
  }
  return (
    <Link ref={ref} to={to} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </Link>
  )
}

/* ───────────── 2. 흐르는 띠 ───────────── */
function Marquee() {
  return (
    <section className={styles.marquee} aria-label="소분소분에서 나누는 것들">
      <div className={styles.marqueeRow}>
        <div className={styles.marqueeTrack}>
          {[...MARQUEE_TOP, ...MARQUEE_TOP].map((item, i) => (
            <span key={i} className={styles.marqueeItem}>
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className={`${styles.marqueeRow} ${styles.marqueeRowAlt}`}>
        <div className={`${styles.marqueeTrack} ${styles.marqueeReverse}`}>
          {[...MARQUEE_BOTTOM, ...MARQUEE_BOTTOM].map((item, i) => (
            <span key={i} className={styles.marqueeWord}>
              {item} <i>·</i>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────── 3. 좌우로 넘기는 이야기 (문제 → 소분 → 결과) ───────────── */
/**
 * 왼쪽 글은 좌우로 미끄러지고, 오른쪽 그림은 슬라이드에 맞춰 모양이 바뀐다.
 * 그림은 --p(0~1) 하나로 움직인다: 0 = 30롤 한 덩어리 → 0.58 = 10롤씩 세 덩어리 → 1 = 1인 금액까지 내려감.
 * 슬라이드가 바뀌면 --p를 목표값까지 부드럽게 옮긴다(tween).
 *
 * 넘기는 방법: 끌기(마우스/손가락, 섹션 어디든) · 위쪽 막대 · 키보드 ←→.
 * 화면에 보이는 동안 5초마다 자동으로 넘어가고 마지막 장 다음엔 처음으로 돌아가 계속 반복한다.
 * 끄는 동안만 멈추고, 직접 넘기면 5초 타이머가 처음부터 다시 시작된다.
 */
const SLIDE_TARGET_P = [0.05, 0.58, 1]
const AUTOPLAY_MS = 5000
const SWIPE_THRESHOLD = 60 // 이만큼(px) 이상 끌어야 넘어간다

function StorySlider({ reduceMotion }) {
  const stageRef = useRef(null)
  const progressRef = useRef(SLIDE_TARGET_P[0])
  const dragRef = useRef(null) // 끄는 중이면 { startX, pointerId, captured }
  const viewportRef = useRef(null)
  const [settleKey, setSettleKey] = useState(0) // 덜 끌고 놓았을 때 그림을 되돌리는 신호
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(SLIDE_TARGET_P[0])
  const [dragX, setDragX] = useState(0)
  const [visible, sectionRef] = useInViewLive(0.4)

  const count = STORY.length
  const go = useCallback((next) => setStep(((next % count) + count) % count), [count])
  const settle = () => setSettleKey((k) => k + 1)

  // 화면에 새로 들어올 때마다(자동 넘김으로 도착할 때 포함) 첫 장 "문제"부터 다시 보여준다
  useEffect(() => {
    if (visible) setStep(0)
  }, [visible])

  // 슬라이드가 바뀌면 그림 진행값(--p)을 목표까지 0.9초 동안 옮긴다
  useEffect(() => {
    const target = SLIDE_TARGET_P[step]
    const apply = (value) => {
      progressRef.current = value
      stageRef.current?.style.setProperty('--p', value.toFixed(4))
      setProgress(value)
    }
    if (reduceMotion) {
      apply(target)
      return undefined
    }
    const from = progressRef.current
    const start = performance.now()
    const duration = 900
    let frame = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 // 천천히-빠르게-천천히
      apply(from + (target - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [step, reduceMotion, settleKey])

  // 자동 넘김: 화면에 보이는 동안 5초마다 계속 반복(마지막 → 처음). 직접 끄는 동안만 잠깐 멈춘다
  const autoplay = visible && !reduceMotion && dragX === 0
  useEffect(() => {
    if (!autoplay) return undefined
    const timerId = setTimeout(() => go(step + 1), AUTOPLAY_MS)
    return () => clearTimeout(timerId)
  }, [autoplay, step, go])

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button, a')) return // 점·링크를 누를 땐 끌기로 보지 않음
    dragRef.current = { startX: e.clientX, pointerId: e.pointerId, captured: false }
  }
  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    // 조금이라도 움직이면 그때부터 포인터를 붙잡아서, 섹션 밖으로 나가도 끌기가 이어지게 한다
    if (!drag.captured && Math.abs(dx) > 4) {
      e.currentTarget.setPointerCapture(drag.pointerId)
      drag.captured = true
    }
    setDragX(dx)
    // 그림도 손을 따라: 끈 거리만큼 이웃 슬라이드의 모양 쪽으로 미리 바뀐다
    const width = viewportRef.current?.offsetWidth || 400
    const neighbor = dx < 0 ? Math.min(step + 1, count - 1) : Math.max(step - 1, 0)
    const t = Math.min(1, Math.abs(dx) / width)
    const preview = SLIDE_TARGET_P[step] + (SLIDE_TARGET_P[neighbor] - SLIDE_TARGET_P[step]) * t
    progressRef.current = preview
    stageRef.current?.style.setProperty('--p', preview.toFixed(4))
    setProgress(preview)
  }
  const endDrag = () => {
    if (!dragRef.current) return
    // 끝에서 더 끌면(첫 장에서 오른쪽, 마지막 장에서 왼쪽) 넘기지 않고 제자리로
    if (dragX <= -SWIPE_THRESHOLD && step < count - 1) go(step + 1)
    else if (dragX >= SWIPE_THRESHOLD && step > 0) go(step - 1)
    else settle(step) // 덜 끌었으면 그림을 원래 모양으로 되돌린다
    dragRef.current = null
    setDragX(0)
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') go(step + 1)
    if (e.key === 'ArrowLeft') go(step - 1)
  }

  // 3번째 슬라이드에서 금액이 혼자 가격 → 나눈 가격으로 내려간다
  const priceT = Math.min(1, Math.max(0, (progress - 0.6) / 0.35))
  const eased = 1 - Math.pow(1 - priceT, 3)
  const shownPrice = Math.round(SOLO_PRICE - (SOLO_PRICE - SHARE_PRICE) * eased)

  return (
    <section
      id="story"
      ref={sectionRef}
      className={styles.story}
    >
      {/* 섹션 어디를 잡고 끌어도 넘어간다 (글 영역·그림 영역 모두) */}
      <div
        className={`${styles.storySticky} ${styles.storyDragArea} ${dragX ? styles.storyDragging : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={styles.storyText}>
          <div className={styles.storyControls}>
            <div className={styles.storyDots} role="tablist" aria-label="이야기 단계">
              {STORY.map((s, i) => (
                <button
                  key={s.kicker}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={s.kicker}
                  className={`${styles.storyDot} ${i < step ? styles.storyDotDone : ''} ${i === step ? styles.storyDotOn : ''}`}
                  onClick={() => go(i)}
                >
                  {/* 지금 슬라이드의 막대는 5초 동안 차오른다 — 다 차면 다음으로. key로 매번 처음부터 다시 */}
                  {i === step && (
                    <span key={step} className={`${styles.storyDotFill} ${autoplay ? '' : styles.storyDotFillPaused}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={viewportRef}
            className={styles.storyViewport}
            role="region"
            aria-roledescription="carousel"
            aria-label="소분소분 이야기 — 좌우로 넘겨보세요"
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            <div className={styles.storyTrack} style={{ transform: `translateX(calc(${-step * 100}% + ${dragX}px))` }}>
              {STORY.map((s, i) => (
                <article key={s.kicker} className={`${styles.storySlide} ${i === step ? styles.storySlideOn : ''}`} aria-hidden={i !== step}>
                  <span className={styles.storyKicker}>{s.kicker}</span>
                  <h2 className={styles.storyTitle}>
                    {s.title}
                    <br />
                    <span>{s.accent}</span>
                  </h2>
                  <p className={styles.storyBody}>{s.body}</p>
                </article>
              ))}
            </div>
          </div>
          <span className={styles.storyHint}>
            <Icon name="swipe" size={16} /> 마우스나 손가락으로 옆으로 끌어서 넘겨보세요
          </span>
        </div>

        <div ref={stageRef} className={styles.storyStage} aria-hidden="true">
          <div className={styles.stageGlow} />
          <div className={styles.packs}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.pack} style={{ '--i': i }}>
                {/* 뜯지 않은 상자: 사람마다 색이 다른 봉인 테이프 + 품목 하나 + "미개봉" 표시 */}
                <div className={styles.packBox}>
                  <span className={styles.packTape} />
                  <div className={styles.rollStack}>
                    <ToiletRoll />
                    <ToiletRoll />
                    <ToiletRoll />
                  </div>
                  <span className={styles.packSeal}>
                    <Icon name="verified" size={12} filled /> 미개봉
                  </span>
                </div>
                <span className={styles.packLabel}>10롤</span>
                <span className={styles.packOwner}>{i === 0 ? '대표' : `이웃 ${i}`}</span>
              </div>
            ))}
            <span className={styles.bigNumber}>30</span>
          </div>
          <div className={styles.priceMeter}>
            <span className={styles.priceMeterLabel}>{step < 2 ? '혼자 다 사면' : '이웃과 나누면 1인'}</span>
            <strong className={styles.priceMeterValue}>
              {shownPrice.toLocaleString()}
              <small>원</small>
            </strong>
            <span className={styles.priceMeterNote}>예시 · 영수증 {DEMO.total.toLocaleString()}원 + 수고비 5%</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * CSS로 그린 휴지 롤 1개 (이모지·이미지 없이). 세워 둔 원기둥을 세 조각으로 그린다:
 *   몸통(좌우 명암으로 둥글게) + 아랫면 타원 + 윗면 타원(흰 휴지 → 갈색 심지 → 가운데 구멍)
 */
function ToiletRoll() {
  return (
    <span className={styles.roll}>
      <span className={styles.rollBottom} />
      <span className={styles.rollBody} />
      <span className={styles.rollTop} />
    </span>
  )
}

/* ───────────── 4. 실시간 참여: 두 화면이 동시에 바뀐다 ───────────── */
/**
 * 앱의 실제 동작 그대로: 이웃이 [참여하기]를 누르면 같은 팟을 보는 모든 화면(대표 포함)의 인원·1인 금액이
 * 새로고침 없이 동시에 바뀐다(WebSocket). 시연 대본의 "화면 A(대표) · 화면 B(이웃)" 장면과 같다.
 * 건물 지도·호수·푸시 알림·픽업 PIN처럼 앱에 없는 것은 보여주지 않는다 (PRODUCT_SPEC D23·D27, 호수는 본인만).
 *
 * 순서(2.4초마다): 1명(대표만) → 이웃 화면에서 [참여하기] 탭 → 2명 → 다른 이웃 참여 → 3명(모집 완료) → 처음으로
 */
const LIVE_POD = { title: '코스트코 화장지 30롤', unit: '10롤씩', target: 3 }

function LiveSync({ reduceMotion }) {
  const [count, setCount] = useState(reduceMotion ? LIVE_POD.target : 1)
  const [tapping, setTapping] = useState(false)
  const [visible, ref] = useInView(0.3)

  useEffect(() => {
    if (!visible || reduceMotion) return undefined
    let tapTimer = 0
    let current = 1 // setCount 안에서 다른 상태를 바꾸지 않으려고 지금 인원을 따로 들고 있는다
    setCount(1)
    const timerId = setInterval(() => {
      if (current === 1) {
        // 이웃 화면의 [참여하기]를 누르는 모습(물결)을 보여주면서 인원을 늘린다
        setTapping(true)
        tapTimer = setTimeout(() => setTapping(false), 500)
      }
      current = current >= LIVE_POD.target ? 1 : current + 1
      setCount(current)
    }, 2400)
    return () => {
      clearInterval(timerId)
      clearTimeout(tapTimer)
    }
  }, [visible, reduceMotion])

  return (
    <section id="live" ref={ref} className={styles.building}>
      <div className={styles.buildingInner}>
        <div className={styles.buildingCopy}>
          <span className={`${styles.sectionKicker} ${styles.reveal}`}>실시간 참여</span>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`}>
            참여하는 순간,
            <br />
            <span className={styles.gradientText}>모든 화면이 함께</span>
          </h2>
          <p className={`${styles.sectionBody} ${styles.reveal}`}>
            이웃이 [참여하기]를 누르면 대표와 다른 이웃의 화면에서도 인원과 1인 금액이 새로고침 없이 바로 바뀌어요. 그리고 이 팟은{' '}
            <strong>우리 건물 사람에게만</strong> 보여요.
          </p>
          <ul className={`${styles.checkList} ${styles.reveal}`}>
            <li>
              <Icon name="my_location" size={20} /> 팟을 열고 참여할 때마다 GPS로 한 번 더 확인
            </li>
            <li>
              <Icon name="block" size={20} /> 다른 건물 사람은 링크로 들어와도 접근 불가
            </li>
            <li>
              <Icon name="lock_person" size={20} /> 호수는 나만 보고, 이웃에겐 "이웃 1, 2"로만
            </li>
          </ul>
        </div>

        <div className={styles.syncStage} aria-hidden="true">
          <div className={styles.syncPhones}>
            <MiniPhone label="대표 화면" icon="person" count={count} />
            <div className={styles.syncLink}>
              <span key={count} className={styles.syncPulse} />
              <Icon name="sync_alt" size={22} />
            </div>
            <MiniPhone label="이웃 화면" icon="group" count={count} neighbor tapping={tapping} />
          </div>
          <div className={styles.blockedCard}>
            <span className={styles.blockedIcon}>
              <Icon name="visibility_off" size={18} />
            </span>
            <div>
              <strong>다른 건물 이웃에게는</strong>
              <span>이 팟이 목록에 보이지 않아요</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** 실시간 섹션의 작은 휴대폰 한 대. 대표 화면과 이웃 화면이 같은 count를 받아 동시에 바뀐다 */
function MiniPhone({ label, icon, count, neighbor = false, tapping = false }) {
  const full = count >= LIVE_POD.target
  const joined = !neighbor || count >= 2 // 이웃 화면은 2명째부터 "참여함"
  const price = calcPerPersonPrice(DEMO.total, DEMO.rate, count)
  return (
    <div className={styles.miniWrap}>
      <span className={styles.miniLabel}>
        <Icon name={icon} size={14} /> {label}
      </span>
      <div className={styles.mini}>
        <div className={styles.miniScreen}>
          <div className={styles.miniHead}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} /> 실시간
            </span>
            <span className={styles.liveUnit}>{LIVE_POD.unit}</span>
          </div>
          <strong className={styles.liveTitle}>{LIVE_POD.title}</strong>
          <div className={styles.liveSeats}>
            {Array.from({ length: LIVE_POD.target }, (_, i) => (
              <span key={i} className={i < count ? styles.liveSeatOn : ''}>
                {i === 0 ? '대표' : i < count ? `이웃 ${i}` : '빈자리'}
              </span>
            ))}
          </div>
          <div className={styles.liveRow}>
            <span>
              참여 <b>{count}</b>/{LIVE_POD.target}명
            </span>
            <span className={full ? styles.liveFull : styles.liveOpen}>{full ? '모집 완료' : '모집중'}</span>
          </div>
          <div className={styles.liveBar}>
            <span style={{ width: `${(count / LIVE_POD.target) * 100}%` }} />
          </div>
          <div className={styles.livePrice}>
            <span>지금 1인당</span>
            <strong key={count}>{price.toLocaleString()}원</strong>
          </div>
          <div className={`${styles.miniButton} ${joined ? styles.miniButtonDone : ''} ${tapping ? styles.miniButtonTap : ''}`}>
            {neighbor ? (joined ? '참여했어요' : '참여하기') : full ? '모집 마감하기' : '모집 중이에요'}
            {tapping && <span className={styles.tapRipple} />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── 5. 숫자가 올라가는 통계 ───────────── */
function Stats({ reduceMotion }) {
  const [visible, ref] = useInView(0.35)
  return (
    <section id="stats" ref={ref} className={styles.stats}>
      <span className={`${styles.sectionKicker} ${styles.center} ${styles.reveal}`}>자취생 43명에게 물었어요</span>
      <h2 className={`${styles.sectionTitle} ${styles.center} ${styles.reveal}`}>
        다들 <span className={styles.gradientText}>버리고 있었어요</span>
      </h2>
      <div className={styles.statRow}>
        {STATS.map((s) => (
          <TiltCard key={s.label} className={styles.statCard}>
            <CountUp value={s.value} active={visible} instant={reduceMotion} suffix={s.suffix} className={styles.statNumber} />
            <p className={styles.statLabel}>{s.label}</p>
            <div className={styles.statRing} style={{ '--v': visible ? s.value : 0 }} />
          </TiltCard>
        ))}
      </div>
      <p className={styles.statSource}>출처: 인하대 인근 자취생 43명 설문 (팀 자체 조사)</p>
    </section>
  )
}

function CountUp({ value, active, instant, suffix, className }) {
  const [shown, setShown] = useState(instant ? value : 0)
  useEffect(() => {
    if (!active) return undefined
    if (instant) {
      setShown(value)
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const duration = 1600
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 4)))) // 처음엔 빠르게, 끝에서 천천히
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, instant, value])
  return (
    <strong className={className}>
      {shown}
      <small>{suffix}</small>
    </strong>
  )
}

/** 마우스 위치에 따라 3D로 살짝 기울고, 마우스 아래에 빛이 따라오는 카드 */
function TiltCard({ className, children }) {
  const ref = useRef(null)
  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    ref.current.style.setProperty('--rx', `${(0.5 - y) * 12}deg`)
    ref.current.style.setProperty('--ry', `${(x - 0.5) * 14}deg`)
    ref.current.style.setProperty('--mx', `${x * 100}%`)
    ref.current.style.setProperty('--my', `${y * 100}%`)
  }
  const onLeave = () => {
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }
  return (
    <div ref={ref} className={`${styles.tilt} ${styles.reveal} ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  )
}

/* ───────────── 6. 기능 카드 ───────────── */
function Features() {
  return (
    <section id="features" className={styles.features}>
      <span className={`${styles.sectionKicker} ${styles.center} ${styles.reveal}`}>그래서 이렇게 만들었어요</span>
      <h2 className={`${styles.sectionTitle} ${styles.center} ${styles.reveal}`}>
        공동구매가 망하는 이유를
        <br />
        <span className={styles.gradientText}>구조로 없앴어요</span>
      </h2>
      <div className={styles.featureGrid}>
        {FEATURES.map((f, i) => (
          <TiltCard key={f.title} className={`${styles.featureCard} ${styles[`feature_${f.color}`]}`}>
            <span className={styles.featureNum}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.featureIcon}>
              <Icon name={f.icon} size={30} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </TiltCard>
        ))}
      </div>
    </section>
  )
}

/* ───────────── 7. 마지막 CTA ───────────── */
function Finale() {
  const [burst, setBurst] = useState(0)
  const [pieces] = useState(() =>
    Array.from({ length: 26 }, (_, i) => ({
      id: i,
      angle: (360 / 26) * i + Math.random() * 10,
      distance: 120 + Math.random() * 120,
      color: ['#006194', '#fd933d', '#f9bd22', '#93ccff', '#ffffff'][i % 5],
      rotate: Math.random() * 720,
    })),
  )
  return (
    <section id="finale" className={styles.finale}>
      <div className={styles.finaleAurora} aria-hidden="true" />
      <div className={styles.finaleInner}>
        <div className={`${styles.bmRow} ${styles.reveal}`}>
          <span>
            참여 수수료 <strong>0원</strong>
          </span>
          <span>
            대표 수고비 <strong>5%</strong>
          </span>
          <span>
            수익은 <strong>제휴 마트</strong>에서
          </span>
        </div>
        <h2 className={`${styles.finaleTitle} ${styles.reveal}`}>
          우리 건물 첫 팟,
          <br />
          <span>당신이 열어보세요.</span>
        </h2>
        <p className={`${styles.finaleBody} ${styles.reveal}`}>대용량 가격 그대로, 필요한 만큼만. 이웃이 엘리베이터 거리에 있어요.</p>
        <div className={styles.finaleCtaWrap} onMouseEnter={() => setBurst((b) => b + 1)}>
          {/* burst 값이 바뀔 때마다 key가 바뀌어 색종이 애니메이션이 처음부터 다시 터진다 */}
          <div key={burst} className={`${styles.confetti} ${burst ? styles.confettiGo : ''}`} aria-hidden="true">
            {pieces.map((p) => (
              <span
                key={p.id}
                style={{
                  '--a': `${p.angle}deg`,
                  '--dist': `${p.distance}px`,
                  '--rot': `${p.rotate}deg`,
                  background: p.color,
                }}
              />
            ))}
          </div>
          <MagneticLink to="/" className={styles.finaleCta}>
            소분소분 시작하기 <Icon name="rocket_launch" size={22} />
          </MagneticLink>
        </div>
      </div>
    </section>
  )
}

/* ───────────── 공통 훅 ───────────── */

/** 요소가 화면에 들어왔는지(한 번 들어오면 계속 true) */
function useInView(threshold) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setVisible(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [visible, ref]
}

/** 요소가 지금 화면에 보이는지 (들어오고 나갈 때마다 바뀜) — 자동 넘김을 화면 밖에서는 멈추려고 */
function useInViewLive(threshold) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setVisible(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold })
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [visible, ref]
}

/** .reveal 요소가 화면에 들어오면 .revealed를 붙여 떠오르게 한다 */
function useReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(`.${styles.reveal}`)
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add(styles.revealed))
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduce, setReduce] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return undefined
    const onChange = () => setReduce(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reduce
}
