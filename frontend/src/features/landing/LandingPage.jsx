import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { calcPerPersonPrice } from '../pod/podUtils.js'
import styles from './Landing.module.css'

/**
 * 시연·발표용 랜딩 페이지 (/intro). 로그인 여부와 상관없이 누구나 볼 수 있다.
 * 앱 화면(최대 480px)과 달리 노트북·빔프로젝터 화면을 기준으로 넓게 쓰고, 휴대폰에서는 한 줄로 쌓인다.
 *
 * 숫자는 전부 팀 문서에 있는 값만 쓴다 — 지어낸 통계를 넣지 않기 위해서.
 *   설문 88%·79%·56%(자취생 43명) → docs/PRODUCT_SPEC.md 2절
 *   단가 격차 30~53%               → docs/features/02-pod.md
 *   수고비 5%, 1인 금액 계산식      → podUtils.calcPerPersonPrice (앱과 같은 함수)
 */

// 히어로 휴대폰 화면 속 예시 팟 (금액은 예시 — 화면에도 "예시"로 표시)
const DEMO_POD = { title: '코스트코 화장지 30롤', total: 21990, rate: 0.05, target: 3, unit: '10롤씩' }

const PROBLEMS = [
  { value: '88%', label: '대용량을 샀다가 다 못 쓰고 버린 경험' },
  { value: '79%', label: '최근 1개월 안에 버린 경험' },
  { value: '56%', label: '공동구매를 망설이는 이유 1위 · 낯선 이웃과의 접촉 부담' },
]

const PILLARS = [
  {
    icon: 'apartment',
    title: '같은 건물 이웃끼리만',
    body: '주소로 한 번, 팟을 열고 참여하는 순간 GPS로 한 번 더 확인해요. 다른 건물 사람은 링크로 들어와도 볼 수 없어요.',
    tag: '주소 + GPS 이중 인증',
  },
  {
    icon: 'inventory_2',
    title: '뜯지 않은 그대로 나눠요',
    body: '화장지 30롤은 10롤씩, 생수 24병은 6병 한 팩씩. 소분 포장 없이 미개봉 단위로만 나눠서 위생 걱정이 없어요.',
    tag: '생필품 + 밀봉 가공식품',
  },
  {
    icon: 'visibility_off',
    title: '얼굴 안 보고 주고받아요',
    body: '대표가 공동현관 앞에 두면 4자리 PIN을 보고 가져가요. 커뮤니티에서도 이름 대신 "이웃 1, 2"로만 보여요.',
    tag: '비대면 픽업 · 익명',
  },
]

const STEPS = [
  { icon: 'add_circle', title: '팟 열기', body: '품목·총량·1인 단위·인원을 정하면 1인당 금액이 바로 계산돼요.' },
  { icon: 'bolt', title: '실시간 참여', body: '이웃이 참여하는 순간 모든 화면의 인원과 금액이 함께 바뀌어요.' },
  { icon: 'receipt_long', title: '영수증 정산', body: '영수증을 찍으면 금액을 읽고, 송금 링크로 [보냈어요]까지 한 번에.' },
  { icon: 'key', title: '비대면 픽업', body: '공동현관 앞에서 PIN으로 확인하고 [수령 완료]를 누르면 끝.' },
]

const COMPARE = [
  { label: '거래 범위', old: '동네 반경 수 km · 직접 이동', ours: '같은 건물 · 엘리베이터만 타면 끝' },
  { label: '만나는 방식', old: '시간 맞춰 대면 거래', ours: '공동현관 비대면 픽업 + PIN' },
  { label: '정산', old: '대표가 계산하고 일일이 독촉', ours: '영수증 인식 + 자동 계산 + 송금 현황' },
  { label: '대표 보상', old: '없음 → 지치면 공구가 끊김', ours: '수고비 5%가 정산식에 포함' },
  { label: '참여 자격', old: '누구나 · 신뢰 확인 어려움', ours: '같은 건물 주민만 (주소 + GPS)' },
]

const TRUST = [
  { icon: 'shield_lock', title: '건물 단위 격리', body: '팟·정산·실시간 채널·커뮤니티 모두 같은 건물 안에서만 보여요.' },
  { icon: 'my_location', title: '행동 직전 GPS 확인', body: '주소만으로는 거짓 등록이 가능해서, 열고 참여할 때마다 위치를 다시 봐요.' },
  { icon: 'document_scanner', title: '영수증 기준 정산', body: '수고비는 영수증 금액에 정해진 비율로만 붙어요. 더 받을 수 없어요.' },
  { icon: 'flag', title: '신고 3회 자동 숨김', body: '익명 커뮤니티에서 문제 글은 이웃 신고가 쌓이면 바로 가려져요.' },
  { icon: 'no_food', title: '식재료는 취급 안 함', body: '채소·고기 같은 신선식품은 위생 분쟁 위험이 커서 받지 않아요.' },
  { icon: 'lock_person', title: '호수는 나만 봐요', body: '상세주소는 본인에게만 보이고, 이웃에게는 대표가 누구인지도 안 보여요.' },
]

export default function LandingPage() {
  useReveal()
  useSmoothAnchorScroll()

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="#top" className={styles.brand}>
            <img src="/logo.svg" alt="" className={styles.brandLogo} />
            소분소분
          </a>
          <div className={styles.navLinks}>
            <a href="#problem">문제</a>
            <a href="#features">차별점</a>
            <a href="#how">이용 방법</a>
            <a href="#trust">신뢰</a>
          </div>
          <Link to="/" className={styles.navCta}>
            앱 시작하기
          </Link>
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <header id="top" className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>
              <Icon name="apartment" size={16} /> 같은 건물 이웃 공동구매
            </span>
            <h1 className={styles.heroTitle}>
              대용량 가격 그대로,
              <br />
              <span className={styles.heroAccent}>필요한 만큼만.</span>
            </h1>
            <p className={styles.heroBody}>
              화장지 30롤, 생수 24병. 싼 건 알지만 혼자 쓰기엔 너무 많죠. 소분소분은 같은 건물 이웃과 묶음을 함께 사서,
              <strong> 뜯지 않은 단위 그대로</strong> 나눠 갖게 해요.
            </p>
            <div className={styles.heroCtas}>
              <Link to="/" className={styles.primaryCta}>
                지금 시작하기 <Icon name="arrow_forward" size={20} />
              </Link>
              <a href="#how" className={styles.ghostCta}>
                <Icon name="play_circle" size={20} /> 어떻게 동작하나요?
              </a>
            </div>
            <ul className={styles.heroPoints}>
              <li>
                <Icon name="check_circle" size={18} filled /> 참여 수수료 0원
              </li>
              <li>
                <Icon name="check_circle" size={18} filled /> 얼굴 안 보는 비대면 픽업
              </li>
              <li>
                <Icon name="check_circle" size={18} filled /> 같은 건물 주민만
              </li>
            </ul>
          </div>

          <LivePhone />
        </div>
      </header>

      {/* ── 문제 ── */}
      <section id="problem" className={styles.section}>
        <div className={styles.container}>
          <SectionHead
            eyebrow="왜 필요한가요"
            title={
              <>
                싸게 사도, <span className={styles.accent}>결국 버려요</span>
              </>
            }
            body="대용량과 소포장의 단가 차이는 품목별 30~53%. 그런데 혼자 사는 사람에게 묶음은 너무 많고, 둘 곳도 없어요."
          />
          <div className={styles.statGrid}>
            {PROBLEMS.map((p) => (
              <div key={p.value} className={`${styles.statCard} ${styles.reveal}`}>
                <strong className={styles.statValue}>{p.value}</strong>
                <span className={styles.statLabel}>{p.label}</span>
              </div>
            ))}
            <div className={`${styles.statCard} ${styles.statCardAccent} ${styles.reveal}`}>
              <strong className={styles.statValue}>30~53%</strong>
              <span className={styles.statLabel}>대용량과 소포장의 품목별 단가 차이</span>
            </div>
          </div>
          <p className={styles.source}>출처: 인하대 인근 자취생 43명 설문 (팀 자체 조사) · 품목별 단가 비교 (팀 자체 조사)</p>
        </div>
      </section>

      {/* ── 차별점 ── */}
      <section id="features" className={`${styles.section} ${styles.sectionTinted}`}>
        <div className={styles.container}>
          <SectionHead
            eyebrow="소분소분이 다른 점"
            title="가깝게, 깔끔하게, 부담 없이"
            body="공동구매가 실패하는 세 가지 이유 — 먼 거리, 위생, 낯선 사람 — 를 구조로 풀었어요."
          />
          <div className={styles.pillarGrid}>
            {PILLARS.map((p) => (
              <article key={p.title} className={`${styles.pillar} ${styles.reveal}`}>
                <span className={styles.pillarIcon}>
                  <Icon name={p.icon} size={28} />
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <span className={styles.pillarTag}>{p.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 이용 방법 ── */}
      <section id="how" className={styles.section}>
        <div className={styles.container}>
          <SectionHead eyebrow="이용 방법" title="팟 하나로 끝나는 4단계" body="팟(pod)은 함께 사는 공동구매 한 건이에요." />
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={`${styles.step} ${styles.reveal}`}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.stepIcon}>
                  <Icon name={s.icon} size={26} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>

          <PriceBreakdown />
        </div>
      </section>

      {/* ── 비교 ── */}
      <section className={`${styles.section} ${styles.sectionTinted}`}>
        <div className={styles.container}>
          <SectionHead eyebrow="비교" title="동네 중고거래·오픈채팅 공구와 무엇이 다른가요" />
          <div className={`${styles.compare} ${styles.reveal}`} role="table" aria-label="기존 방식과 소분소분 비교">
            <div className={`${styles.compareRow} ${styles.compareHead}`} role="row">
              <span role="columnheader" />
              <span role="columnheader">기존 동네 공구</span>
              <span role="columnheader" className={styles.compareOurs}>
                <img src="/logo.svg" alt="" /> 소분소분
              </span>
            </div>
            {COMPARE.map((row) => (
              <div key={row.label} className={styles.compareRow} role="row">
                <span role="rowheader" className={styles.compareLabel}>
                  {row.label}
                </span>
                <span role="cell" className={styles.compareOld}>
                  <Icon name="close" size={16} /> {row.old}
                </span>
                <span role="cell" className={styles.compareNew}>
                  <Icon name="check" size={16} /> {row.ours}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 신뢰·안전 ── */}
      <section id="trust" className={styles.section}>
        <div className={styles.container}>
          <SectionHead eyebrow="신뢰와 안전" title="모르는 이웃이어도 안심할 수 있게" />
          <div className={styles.trustGrid}>
            {TRUST.map((t) => (
              <div key={t.title} className={`${styles.trustItem} ${styles.reveal}`}>
                <Icon name={t.icon} size={24} className={styles.trustIcon} />
                <div>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 비즈니스 모델 + 마지막 CTA ── */}
      <section className={styles.finale}>
        <div className={`${styles.container} ${styles.finaleInner}`}>
          <div className={styles.bm}>
            <div className={styles.bmItem}>
              <span>참여자 수수료</span>
              <strong>0원</strong>
            </div>
            <div className={styles.bmItem}>
              <span>대표 수고비</span>
              <strong>5%</strong>
            </div>
            <div className={styles.bmItem}>
              <span>수익 모델</span>
              <strong>제휴 마트</strong>
            </div>
          </div>
          <h2 className={styles.finaleTitle}>
            우리 건물 이웃과,
            <br />
            필요한 만큼만 나눠 사세요.
          </h2>
          <p className={styles.finaleBody}>
            참여자에게는 수수료를 받지 않고, 실제 거래가 성사된 마트와의 제휴 수수료를 목표로 해요.
          </p>
          <Link to="/" className={styles.finaleCta}>
            소분소분 시작하기 <Icon name="arrow_forward" size={20} />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.brand}>
            <img src="/logo.svg" alt="" className={styles.brandLogo} />
            소분소분
          </span>
          <span>팀 뿌리 · MOONG TechThon 2026</span>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ eyebrow, title, body }) {
  return (
    <div className={`${styles.sectionHead} ${styles.reveal}`}>
      <span className={styles.sectionEyebrow}>{eyebrow}</span>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {body && <p className={styles.sectionBody}>{body}</p>}
    </div>
  )
}

/**
 * 히어로 오른쪽 휴대폰. 참여 인원이 1 → 2 → 3명으로 차면서 1인당 금액이 내려가는 걸 반복해서 보여준다
 * (앱의 실시간 갱신을 흉내 낸 애니메이션 — 실제 서버와는 연결 안 됨). 움직임 줄이기 설정이면 3명 상태로 멈춘다.
 */
function LivePhone() {
  const reduceMotion = usePrefersReducedMotion()
  const [count, setCount] = useState(1)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (reduceMotion) {
      setCount(DEMO_POD.target)
      return undefined
    }
    const timerId = setInterval(() => {
      setCount((c) => (c >= DEMO_POD.target ? 1 : c + 1))
      setPulse(true)
    }, 2200)
    return () => clearInterval(timerId)
  }, [reduceMotion])

  useEffect(() => {
    if (!pulse) return undefined
    const timerId = setTimeout(() => setPulse(false), 700)
    return () => clearTimeout(timerId)
  }, [pulse])

  const price = calcPerPersonPrice(DEMO_POD.total, DEMO_POD.rate, count)
  const full = count >= DEMO_POD.target

  return (
    <div className={styles.phoneWrap} aria-label="앱 화면 예시: 참여 인원이 늘수록 1인당 금액이 내려가요">
      <div className={styles.phone}>
        <div className={styles.phoneNotch} />
        <div className={styles.phoneScreen}>
          <div className={styles.phoneTop}>
            <span>
              <Icon name="apartment" size={14} /> 인하로67번길 3
            </span>
            <img src="/logo.svg" alt="" />
          </div>

          <div className={styles.podCard}>
            <div className={styles.podThumb}>
              <Icon name="inventory_2" size={34} />
              <span>{DEMO_POD.unit}</span>
            </div>
            <span className={styles.podCategory}>휴지·물티슈</span>
            <strong className={styles.podTitle}>{DEMO_POD.title}</strong>
            <div className={styles.podMeta}>
              <span>
                <Icon name="group" size={14} /> {count}/{DEMO_POD.target}명
              </span>
              <span className={full ? styles.podFull : styles.podOpen}>{full ? '모집 완료' : '모집중'}</span>
            </div>
            <div className={styles.podBar}>
              <span style={{ width: `${(count / DEMO_POD.target) * 100}%` }} />
            </div>
            <div className={styles.podPriceRow}>
              <span>지금 1인당</span>
              <strong className={pulse ? styles.pricePulse : ''}>{price.toLocaleString()}원</strong>
            </div>
            <button type="button" className={styles.podJoin} tabIndex={-1}>
              {full ? '정산 기다리는 중' : '참여하기'}
            </button>
          </div>

          <div className={styles.phoneMini}>
            <Icon name="key" size={16} />
            <div>
              <strong>비대면 픽업 PIN 4821</strong>
              <span>1층 공동현관 앞 · 미개봉 10롤</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.floatBadge} ${styles.floatBadgeTop} ${pulse ? styles.floatBadgeShow : ''}`}>
        <Icon name="bolt" size={16} filled /> 이웃이 참여했어요
      </div>
      <div className={`${styles.floatBadge} ${styles.floatBadgeBottom}`}>
        <Icon name="verified_user" size={16} filled /> 같은 건물 인증됨
      </div>
      <span className={styles.phoneCaption}>예시 화면 · 금액은 예시예요</span>
    </div>
  )
}

/** 1인 금액 계산 예시. 앱과 같은 계산 함수를 써서 화면과 숫자가 어긋나지 않게 한다 */
function PriceBreakdown() {
  const { total, rate, target } = DEMO_POD
  const perPerson = calcPerPersonPrice(total, rate, target)
  const base = Math.ceil(total / target)
  return (
    <div className={`${styles.priceCard} ${styles.reveal}`}>
      <div className={styles.priceHead}>
        <span className={styles.sectionEyebrow}>투명한 정산 (예시)</span>
        <h3>
          {DEMO_POD.title} · {target}명이 10롤씩
        </h3>
      </div>
      <div className={styles.priceRows}>
        <div>
          <span>영수증 금액</span>
          <span>{total.toLocaleString()}원</span>
        </div>
        <div>
          <span>÷ {target}명 (원가 몫)</span>
          <span>{base.toLocaleString()}원</span>
        </div>
        <div>
          <span>+ 대표 수고비 {Math.round(rate * 100)}%</span>
          <span>+{(perPerson - base).toLocaleString()}원</span>
        </div>
        <div className={styles.priceTotal}>
          <span>1인 최종 금액</span>
          <strong>{perPerson.toLocaleString()}원</strong>
        </div>
      </div>
      <p className={styles.priceNote}>
        <Icon name="info" size={16} /> 원 단위는 올림해서 대표가 손해 보지 않아요. 수고비는 영수증 금액에 정해진 비율로만 붙어요.
      </p>
    </div>
  )
}

/** 화면에 들어온 요소에 "보이기" 클래스를 붙여서 스크롤할 때 하나씩 떠오르게 한다 */
function useReveal() {
  const observerRef = useRef(null)
  useEffect(() => {
    const targets = document.querySelectorAll(`.${styles.reveal}`)
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add(styles.revealed))
      return undefined
    }
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed)
            observerRef.current.unobserve(entry.target) // 한 번 보이면 다시 숨기지 않음
          }
        })
      },
      { threshold: 0.15 },
    )
    targets.forEach((el) => observerRef.current.observe(el))
    return () => observerRef.current.disconnect()
  }, [])
}

/** 메뉴의 #문제·#차별점 링크를 눌렀을 때 부드럽게 내려가게 한다. 랜딩을 떠나면 원래대로 돌려놓는다 */
function useSmoothAnchorScroll() {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) root.style.scrollBehavior = 'smooth'
    return () => {
      root.style.scrollBehavior = previous
    }
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
