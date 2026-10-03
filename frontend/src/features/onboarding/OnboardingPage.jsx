import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { isVerified } from '../../api/currentUser.js'
import styles from './Onboarding.module.css'

const STEPS = [
  { title: '입주민 매칭', sub: '자동 인원 모집' },
  { title: '1층 보관', sub: '묶음 그대로 나눔' },
  { title: '비대면 수령', sub: '얼굴 안 보고 픽업' },
]

/**
 * 시작 화면 (디자인 핸드오프 S0 · Stitch 01번). 핵심 기능 ① 온보딩의 첫 화면.
 * 톤: "이웃과 친해지자"보다 "얼굴 안 봐도 되고, 돈 아낀다" (DESIGN_HANDOFF.md 톤앤매너)
 * 2026-10-03 기획 개편: 대상 = 인하대 근처 이웃, 품목 = 생필품·가공식품, 인증 = 주소 등록 + GPS
 */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const alreadyVerified = isVerified()

  return (
    <div className={styles.page}>
      <header className={styles.brandBar}>
        <img src="/logo.svg" alt="소분소분 로고" className={styles.logo} />
        <span className={styles.brandName}>소분소분</span>
        <span className={styles.brandTag}>오피스텔·빌라 특화</span>
      </header>

      <main className={styles.mainWithCta}>
        <section className={styles.hero}>
          <span className={styles.pill}>
            <Icon name="groups" size={16} />
            우리 건물 이웃 공동구매
          </span>
          <h1 className={styles.heroTitle}>
            대용량 가격으로,
            <br />
            <span className={styles.heroAccent}>필요한 만큼만.</span>
          </h1>
          <p className={styles.heroBody}>
            화장지·생수 같은 생필품, 같은 건물 이웃과 나누면 코스트코·트레이더스 가격 그대로 알뜰하게 살 수 있어요.
          </p>
          <div className={styles.noContact}>
            <Icon name="lock_open" size={20} />
            이웃 간 대면 접촉 없이 · 1층 비대면 픽업
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardIcon}>
              <Icon name="savings" size={22} />
            </span>
            <div>
              <div className={styles.cardEyebrow}>이렇게 아껴요 (예시)</div>
              <div className={styles.cardTitle}>화장지 30롤을 3명이 나누면</div>
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
              <Icon name="door_front" size={22} />
            </span>
            <div>
              <div className={styles.cardEyebrow}>어색한 만남 NO</div>
              <div className={styles.cardTitle}>비대면 & 익명 픽업</div>
            </div>
          </div>
          <p className={styles.cardBody}>
            이웃과 연락처를 주고받거나 직접 마주칠 필요 없이, 퇴근길 1층 무인 보관함에서 가볍게 챙겨 올라가세요.
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
        <button type="button" className={styles.primaryButton} onClick={() => navigate('/onboarding/address')}>
          우리 건물 등록하기
          <Icon name="arrow_forward" size={20} />
        </button>
        {alreadyVerified && (
          <Link to="/home" className={styles.textLink}>
            이미 등록했어요 · 건물 홈으로
          </Link>
        )}
      </div>
    </div>
  )
}
