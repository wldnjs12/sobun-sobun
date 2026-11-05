import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import styles from './Onboarding.module.css'

// 대용량·묶음으로 사서 나누기 좋은 생활용품 예시 (식품·식재료는 다루지 않음 — 위생·유통기한 책임 문제)
const EXAMPLES = ['#휴지', '#세제', '#물티슈', '#샴푸', '#키친타월', '#쓰레기봉투']

const STEPS = [
  { title: '묶음 구매', sub: '대용량 가격 그대로' },
  { title: '미개봉 나눔', sub: '포장 뜯지 않고 개수로' },
  { title: '동네 픽업', sub: '가까운 곳에서 수령' },
]

/**
 * 시작 화면 (디자인 핸드오프 S0 · Stitch 01번). 로그인 전 사용자가 처음 보는 화면.
 * 톤: "이웃과 친해지자"보다 "얼굴 안 봐도 되고, 돈 아낀다" (DESIGN_HANDOFF.md 톤앤매너)
 * 2026-11 기획 개편: 품목 = 생활용품(휴지·세제·물티슈·샴푸 등), 나눔 = 묶음을 미개봉 단위로, 범위 = 동네(반경 1km),
 *   로그인 신규 → "시작하기"는 회원가입, "이미 계정이 있어요"는 로그인으로. (로그인한 사용자는 App.jsx가 홈으로 보냄)
 */
export default function OnboardingPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <header className={styles.brandBar}>
        <img src="/logo.svg" alt="소분소분 로고" className={styles.logo} />
        <span className={styles.brandName}>소분소분</span>
        <span className={styles.brandTag}>동네 생활용품 공동구매</span>
      </header>

      <main className={styles.mainWithCta}>
        <section className={styles.hero}>
          <span className={styles.pill}>
            <Icon name="groups" size={16} />
            우리 동네 이웃 공동구매
          </span>
          <h1 className={styles.heroTitle}>
            대용량 가격으로,
            <br />
            <span className={styles.heroAccent}>필요한 만큼만.</span>
          </h1>
          <p className={styles.heroBody}>
            휴지·세제·물티슈·샴푸처럼 묶음으로 파는 생활용품, 동네 이웃과 나눠 사면 대용량 가격 그대로 필요한 만큼만 가져갈 수 있어요.
          </p>
          <div className={styles.quickChips} aria-label="이런 물건을 나눠요">
            {EXAMPLES.map((tag) => (
              <span key={tag} className={styles.quickChip}>
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardIcon}>
              <Icon name="savings" size={22} />
            </span>
            <div>
              <div className={styles.cardEyebrow}>이렇게 아껴요 (예시)</div>
              <div className={styles.cardTitle}>휴지 30롤을 3명이 10롤씩 나누면</div>
            </div>
          </div>
          <div className={styles.compare}>
            <div className={styles.compareRow}>
              <span>마트에서 10롤만 살 때</span>
              <span className={styles.strike}>11,900원</span>
            </div>
            <div className={styles.compareBar}>
              <span style={{ width: '100%' }} className={styles.compareBarGray} />
            </div>
            <div className={styles.compareRow}>
              <span className={styles.compareAccent}>소분소분 3인 분할가</span>
              <span className={styles.compareBig}>7,700원</span>
            </div>
            <div className={styles.compareBar}>
              <span style={{ width: '65%' }} className={styles.compareBarBlue} />
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardIcon}>
              <Icon name="inventory_2" size={22} />
            </span>
            <div>
              <div className={styles.cardEyebrow}>뜯지 않고 그대로</div>
              <div className={styles.cardTitle}>미개봉 단위로 나눠요</div>
            </div>
          </div>
          <p className={styles.cardBody}>
            물티슈 10팩이면 2팩씩 5명처럼, 묶음 속 제품을 포장 그대로 개수로 나눠요. 덜어 담지 않아서 위생 걱정이 없고,
            연락처를 주고받지 않아도 정해진 장소에서 가볍게 챙겨 가면 돼요.
          </p>
          <ol className={styles.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={styles.step}>
                <span className={`${styles.stepNum} ${i === 2 ? styles.stepNumAccent : ''}`}>{i + 1}</span>
                <strong>{step.title}</strong>
                <span>{step.sub}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <div className={styles.ctaDock}>
        <button type="button" className={styles.primaryButton} onClick={() => navigate('/signup')}>
          시작하기
          <Icon name="arrow_forward" size={20} />
        </button>
        <Link to="/login" className={styles.textLink}>
          이미 계정이 있어요
        </Link>
      </div>
    </div>
  )
}
