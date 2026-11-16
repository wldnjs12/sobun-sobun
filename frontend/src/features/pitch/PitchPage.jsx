import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './PitchPage.module.css'

/**
 * 최종피칭용 스토리 페이지 (/pitch, 로그인 없이 열림).
 * 흐름: 문제 → 왜 다들 실패했나(실패 사례) → 우리의 설계 → 도입 전후 변화 → 사업성 → 목표 KPI.
 * ← → 키(또는 Page Up/Down)로 섹션 단위 이동 — 발표 중 클리커로 넘길 수 있다.
 * 수치 출처는 docs/PITCH_STRATEGY.md에 정리했다. 추정치는 화면에도 "추정"이라고 적는다.
 */
const SECTIONS = [
  { id: 'problem', label: '문제' },
  { id: 'failures', label: '실패 사례' },
  { id: 'design', label: '설계' },
  { id: 'change', label: '변화' },
  { id: 'business', label: '사업성' },
  { id: 'goals', label: '목표' },
]

const FAILURES = [
  {
    tag: '2024 · 국내',
    name: '티몬·위메프 미정산 사태',
    what: '플랫폼이 판매대금을 쥐고 최대 2개월 뒤 정산하는 구조. 자금이 막히자 판매자 최대 6만 곳의 대금이 묶였다.',
    cause: '플랫폼이 돈을 보관',
    answer: '소분소분은 돈을 한 푼도 보관하지 않는다. 이웃 → 대표 직접 송금, 영수증 기준 실비 정산.',
    metric: '플랫폼 보관금 0원',
  },
  {
    tag: '2021 · 중국',
    name: '퉁청성훠(同程生活) 파산',
    what: '3억 달러 넘게 투자받은 커뮤니티 공동구매. 과일·채소 같은 신선식품, 보조금 전쟁, 지역 거점 물류비를 감당하지 못했다.',
    cause: '신선식품 + 보조금 + 물류',
    answer: '신선식품은 받지 않는다. 미개봉 상온 생필품만. 물류는 엘리베이터, 보조금은 0원.',
    metric: '물류비 0원 · 폐기 리스크 0',
  },
  {
    tag: '2011~ · 미국',
    name: '그루폰식 소셜커머스',
    what: '큰 할인으로 데려온 고객은 할인이 끝나면 돌아오지 않았다. 판매자는 할인과 수수료를 동시에 떠안고 이탈했다.',
    cause: '할인으로 산 일회성 수요',
    answer: '가치는 할인이 아니라 "필요한 만큼만". 같은 건물이라 다음 팟에도 같은 이웃이 다시 모인다.',
    metric: '건물 단위 반복 참여',
  },
]

const BEFORE_AFTER = [
  ['구매 단위', '화장지 30롤 묶음 통째로', '1인 10롤 (미개봉)'],
  ['남는 양', '20롤이 방 한쪽을 차지', '0롤'],
  ['단가', '묶음가 (싸다)', '묶음가 + 수고비 5%'],
  ['거래 상대', '모르는 동네 사람', '같은 건물 인증 이웃 (주소 + GPS)'],
  ['만나는 방법', '약속 잡고 대면', '1층 비대면 픽업'],
  ['돈 흐름', '앱이 대금 보관', '이웃 → 대표 직접 송금'],
]

export default function PitchPage() {
  const [active, setActive] = useState(SECTIONS[0].id)
  const refs = useRef({})

  // 화면에 보이는 섹션을 상단 내비에 표시
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    Object.values(refs.current).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  // 클리커(→ / PageDown)로 다음 섹션
  useEffect(() => {
    const onKey = (e) => {
      const i = SECTIONS.findIndex((s) => s.id === active)
      let next = null
      if (['ArrowRight', 'PageDown'].includes(e.key)) next = SECTIONS[Math.min(SECTIONS.length - 1, i + 1)]
      if (['ArrowLeft', 'PageUp'].includes(e.key)) next = SECTIONS[Math.max(0, i - 1)]
      if (!next) return
      e.preventDefault()
      refs.current[next.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const bind = (id) => (el) => {
    refs.current[id] = el
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.svg" alt="" />
          소분소분
        </Link>
        <nav className={styles.navLinks}>
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? styles.navActive : ''}>
              <span className={styles.navIndex}>0{i + 1}</span>
              {s.label}
            </a>
          ))}
        </nav>
        <Link to="/login" className={styles.navCta}>
          라이브 데모
        </Link>
      </header>

      {/* ── 01 문제 ── */}
      <section id="problem" ref={bind('problem')} className={`${styles.section} ${styles.hero}`}>
        <span className={styles.kicker}>01 — 문제</span>
        <h1 className={styles.h1}>
          대용량은 싸다.
          <br />
          <span className={styles.dim}>그런데 혼자서는 다 못 쓴다.</span>
        </h1>
        <p className={styles.lead}>
          1인 가구에게 묶음 상품은 "싸게 사서 버리는" 물건이 됩니다. 나눠 사면 되지만, 낯선 사람과 거래하는 부담이 그걸 막습니다.
        </p>
        <div className={styles.stats}>
          <Stat value="36.1" unit="%" label="전국 가구 중 1인 가구" source="보건복지부 사회보장 통계, 2024" />
          <Stat value="88" unit="%" label="대용량을 다 못 쓰고 버린 경험" source="인하대 인근 자취생 설문 n=43" />
          <Stat value="56" unit="%" label="공동구매를 망설이는 이유 1위: 낯선 이웃과의 접촉" source="같은 설문" />
        </div>
      </section>

      {/* ── 02 실패 사례 ── */}
      <section id="failures" ref={bind('failures')} className={styles.section}>
        <span className={styles.kicker}>02 — 왜 다들 실패했나</span>
        <h2 className={styles.h2}>
          공동구매는 새롭지 않다.
          <br />
          <span className={styles.dim}>실패한 이유가 분명할 뿐이다.</span>
        </h2>
        <div className={styles.failures}>
          {FAILURES.map((f) => (
            <article key={f.name} className={styles.failure}>
              <span className={styles.failureTag}>{f.tag}</span>
              <h3 className={styles.failureName}>{f.name}</h3>
              <p className={styles.failureWhat}>{f.what}</p>
              <div className={styles.failureCause}>
                <span>실패 원인</span>
                <strong>{f.cause}</strong>
              </div>
              <div className={styles.failureAnswer}>
                <span>소분소분의 답</span>
                <p>{f.answer}</p>
                <code>{f.metric}</code>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 03 설계 ── */}
      <section id="design" ref={bind('design')} className={styles.section}>
        <span className={styles.kicker}>03 — 설계 원칙</span>
        <h2 className={styles.h2}>
          실패 원인을 하나씩
          <br />
          <span className={styles.dim}>구조에서 지웠다.</span>
        </h2>
        <div className={styles.principles}>
          <Principle n="A" title="반경 대신 건물" body="같은 건물 인증 이웃만. 주소(1차) + 행동 직전 GPS(2차). 다른 건물 리소스는 ID로 접근해도 서버가 403." />
          <Principle n="B" title="보관 대신 직접 송금" body="앱은 돈을 받지 않는다. 영수증 OCR로 금액을 확인하고, 이웃이 대표에게 바로 송금한다." />
          <Principle n="C" title="신선식품 대신 미개봉" body="상하지 않는 생필품·밀봉 가공식품만, 뜯지 않은 단위 그대로. 위생 분쟁이 생길 여지를 없앴다." />
          <Principle n="D" title="할인 대신 필요량" body="단가는 묶음가 그대로, 양은 필요한 만큼. 대표에게는 수고비 5%로 계속 열 이유를 준다." />
        </div>
      </section>

      {/* ── 04 변화 ── */}
      <section id="change" ref={bind('change')} className={styles.section}>
        <span className={styles.kicker}>04 — 도입 전후</span>
        <h2 className={styles.h2}>
          화장지 30롤,
          <br />
          <span className={styles.dim}>세 집이 나누면 이렇게 바뀐다.</span>
        </h2>
        <div className={styles.table}>
          <div className={`${styles.tr} ${styles.th}`}>
            <span />
            <span>지금 (혼자 구매)</span>
            <span>소분소분</span>
          </div>
          {BEFORE_AFTER.map(([k, before, after]) => (
            <div key={k} className={styles.tr}>
              <span className={styles.tk}>{k}</span>
              <span className={styles.before}>{before}</span>
              <span className={styles.after}>{after}</span>
            </div>
          ))}
        </div>
        <p className={styles.note}>
          앱 안의 <strong>임팩트 리포트</strong>가 절약 금액·남지 않은 묶음 수량·성사율·송금/수령 완료율을 실제 기록으로 계산합니다.
        </p>
      </section>

      {/* ── 05 사업성 ── */}
      <section id="business" ref={bind('business')} className={styles.section}>
        <span className={styles.kicker}>05 — 사업성</span>
        <h2 className={styles.h2}>
          참여자 수수료는 0원.
          <br />
          <span className={styles.dim}>돈은 건물을 관리하는 쪽이 낸다.</span>
        </h2>
        <div className={styles.bm}>
          <BmCard
            step="1단계"
            who="대학 기숙사 · 생활협동조합"
            how="입주민 생필품 공동구매 채널로 무료 파일럿. 인하대 기숙사 1개 동에서 성사율·완료율 데이터 확보."
            money="수익 0 — 데이터 확보"
          />
          <BmCard
            step="2단계"
            who="오피스텔 관리단 · 원룸 임대사업자 · 청년주택"
            how="'입주민 편의 서비스'로 건물 단위 구독. 공실·민원 관리 도구와 함께 판매."
            money="건물당 월 구독료"
            highlight
          />
          <BmCard
            step="3단계"
            who="창고형 마트 · 생필품 제조사"
            how="건물 단위로 이미 모인 수요를 '건물 배송 묶음 주문'으로 연결. 실제 거래가 성사된 건만 수수료."
            money="성사 거래 리퍼럴 수수료"
          />
        </div>
        <div className={styles.unit}>
          <div className={styles.unitHead}>
            <span>단위 경제 (추정, 파일럿에서 검증할 가정)</span>
          </div>
          <div className={styles.formula}>
            <code>건물 월 거래액</code> = 세대 수 × 참여율 × 월 참여 횟수 × 1인 평균 금액
          </div>
          <div className={styles.formula}>
            <code>예시</code> 60세대 × 30% × 월 2회 × 8,000원 ≈ <strong>월 288,000원 / 건물</strong>
          </div>
          <p className={styles.unitNote}>
            거래 수수료만으로는 작다 → 그래서 1차 수익원은 거래가 아니라 <strong>건물 단위 구독</strong>입니다. 서버·운영비가 건물 수에
            거의 비례하지 않는 구조(물류·보관·결제 대행 없음)라 건물이 늘수록 마진이 커집니다.
          </p>
        </div>
      </section>

      {/* ── 06 목표 ── */}
      <section id="goals" ref={bind('goals')} className={styles.section}>
        <span className={styles.kicker}>06 — 수치 목표</span>
        <h2 className={styles.h2}>
          파일럿 3개월,
          <br />
          <span className={styles.dim}>이 숫자로 판단한다.</span>
        </h2>
        <div className={styles.goals}>
          <Goal value="70%" label="팟 성사율" sub="마감 ÷ (마감 + 취소)" />
          <Goal value="95%" label="송금·수령 완료율" sub="정산 확정 후 자가 신고" />
          <Goal value="24h" label="평균 모집 시간" sub="개설 → 마지막 참여" />
          <Goal value="0원" label="플랫폼 보관금" sub="구조적으로 항상 0" />
        </div>
        <div className={styles.end}>
          <Link to="/login" className={styles.endCta}>
            라이브 데모 보기 →
          </Link>
          <span className={styles.endHint}>← → 키로 섹션 이동</span>
        </div>
      </section>
    </div>
  )
}

function Stat({ value, unit, label, source }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        {value}
        <small>{unit}</small>
      </span>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statSource}>{source}</span>
    </div>
  )
}

function Principle({ n, title, body }) {
  return (
    <div className={styles.principle}>
      <span className={styles.principleN}>{n}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function BmCard({ step, who, how, money, highlight }) {
  return (
    <div className={`${styles.bmCard} ${highlight ? styles.bmHighlight : ''}`}>
      <span className={styles.bmStep}>{step}</span>
      <h3>{who}</h3>
      <p>{how}</p>
      <code>{money}</code>
    </div>
  )
}

function Goal({ value, label, sub }) {
  return (
    <div className={styles.goal}>
      <span className={styles.goalValue}>{value}</span>
      <span className={styles.goalLabel}>{label}</span>
      <span className={styles.goalSub}>{sub}</span>
    </div>
  )
}
