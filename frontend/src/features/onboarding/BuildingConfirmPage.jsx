import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { registerBuilding } from './onboardingApi.js'
import styles from './Onboarding.module.css'

const PROMISES = [
  { title: '알뜰한 무낭비 소분 라이프', body: '같은 건물 이웃과 함께 대용량 생필품·가공식품을 남김없이 나눠요.' },
  { title: '비대면 픽업 매너 준수', body: '1층 무인보관함이나 공동현관 비대면 픽업 수칙을 지켜 서로의 안전을 존중해요.' },
]

const DIRECT_INPUT = '__direct__'

/**
 * 건물 확인 · 동 선택 (S1'' · Stitch s1_1).
 * 상태: 빌라/원룸(동 선택 없음) / 아파트 동 목록 / 동 목록 없으면 직접 입력 (목록이 있어도 "직접입력" 선택 가능)
 *
 * 디자인에서 뺀 것:
 *   - "호수 입력" → 기획상 호수는 받지 않는다 (기획수정_프롬포트.md 1-3, API_SPEC ①)
 *   - "위치 GPS 100% 일치·반경 50m" → 등록 단계에선 GPS를 안 보고, 반경은 100m (행동할 때 확인)
 *   - "42명 활동 중", 동별 "18명 소분중" → 서버가 주지 않는 숫자라서
 */
export default function BuildingConfirmPage() {
  const navigate = useNavigate()
  const candidate = useLocation().state?.candidate
  const [dongChoice, setDongChoice] = useState(null) // 목록에서 고른 동 또는 DIRECT_INPUT
  const [dongInput, setDongInput] = useState('')
  const [agreed, setAgreed] = useState(PROMISES.map(() => false))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // 주소 검색을 거치지 않고 주소창으로 바로 들어오면 고른 건물이 없으니 검색으로 돌려보낸다
  if (!candidate) return <Navigate to="/onboarding/address" replace />

  const needsDong = candidate.isApartment
  const hasDongList = candidate.dongOptions?.length > 0
  const directMode = needsDong && (!hasDongList || dongChoice === DIRECT_INPUT)
  const dong = !needsDong ? null : directMode ? dongInput.trim() : dongChoice
  const allAgreed = agreed.every(Boolean)
  const canSubmit = (!needsDong || Boolean(dong)) && allAgreed
  const displayName = candidate.buildingName || '이 건물'
  const fullName = dong ? `${displayName} ${dong}` : displayName

  const handleRegister = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await registerBuilding({ ...candidate, dong })
      navigate('/home', { replace: true }) // replace: 뒤로가기로 등록 화면에 돌아오지 않게
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.stepBar}>
        <button type="button" aria-label="뒤로가기" className={styles.roundButtonSmall} onClick={() => navigate(-1)}>
          <Icon name="arrow_back_ios_new" size={18} />
        </button>
        <span className={styles.stepDots}>
          <span className={styles.stepDotOn} />
          <span className={styles.stepDotOn} />
          <span className={styles.stepDot} />
        </span>
        <span className={styles.stepLabel}>2단계 / 주소 인증</span>
      </div>

      <main className={styles.mainWithCta}>
        <section className={styles.heroCard}>
          <div className={styles.heroImage}>
            <span className={styles.heroChip}>
              <Icon name="verified" size={16} />
              {needsDong ? '아파트' : '빌라·원룸'}
            </span>
            <Icon name={needsDong ? 'apartment' : 'home_work'} size={72} className={styles.heroBuildingIcon} />
            <span className={styles.heroRadius}>팟 열 때 반경 100m 확인</span>
          </div>
          <h1 className={styles.heroCardTitle}>
            <span className={styles.accentText}>{fullName}</span>
            <br />
            이웃으로 등록돼요 ✨
          </h1>
          <p className={styles.heroAddress}>
            <Icon name="location_on" size={18} />
            {candidate.roadAddress}
          </p>
        </section>

        {needsDong && (
          <section className={styles.dongSection}>
            <div className={styles.dongHead}>
              <h3>
                동 선택 <span className={styles.required}>(필수)</span>
              </h3>
              <span className={styles.hint}>같은 동 이웃끼리 한 방에 모여요</span>
            </div>
            {hasDongList && (
              <div className={styles.dongGrid}>
                {candidate.dongOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.dongChip} ${dongChoice === option ? styles.dongChipActive : ''}`}
                    onClick={() => setDongChoice(option)}
                  >
                    <strong>{option}</strong>
                    {dongChoice === option && <small>선택됨</small>}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.dongChip} ${dongChoice === DIRECT_INPUT ? styles.dongChipActive : ''}`}
                  onClick={() => setDongChoice(DIRECT_INPUT)}
                >
                  <strong>직접입력</strong>
                  <small>목록에 없음</small>
                </button>
              </div>
            )}
            {directMode && (
              <>
                <input
                  className={styles.input}
                  placeholder="예: 101동"
                  value={dongInput}
                  onChange={(e) => setDongInput(e.target.value)}
                  aria-label="동 직접 입력"
                />
                {!hasDongList && <p className={styles.hint}>동 목록을 불러오지 못해서 직접 입력해주세요.</p>}
              </>
            )}
            <p className={styles.lockNote}>
              <Icon name="lock" size={16} /> 호수는 받지 않아요. 이웃에게는 건물·동 이름만 보여요.
            </p>
          </section>
        )}

        <section className={styles.promiseSection}>
          <h3 className={styles.promiseTitle}>
            <Icon name="handshake" size={22} />
            소분소분 이웃 약속
          </h3>
          {PROMISES.map((p, i) => (
            <label key={p.title} className={styles.promiseItem}>
              <input
                type="checkbox"
                checked={agreed[i]}
                onChange={(e) => setAgreed(agreed.map((v, j) => (j === i ? e.target.checked : v)))}
              />
              <span>
                <strong>{p.title}</strong>
                {p.body}
              </span>
            </label>
          ))}
        </section>

        {error && <p className={styles.errorText}>{error}</p>}
      </main>

      <div className={styles.ctaDock}>
        <button type="button" className={styles.primaryButton} disabled={!canSubmit || submitting} onClick={handleRegister}>
          <Icon name="storefront" size={22} />
          {submitting ? '등록하는 중…' : `${fullName} 이웃으로 시작하기`}
        </button>
        <span className={styles.ctaNote}>
          {!allAgreed
            ? '이웃 약속에 동의하면 시작할 수 있어요'
            : needsDong && !dong
              ? '동을 선택해주세요'
              : '팟을 열거나 참여할 때 위치를 한 번 더 확인해요'}
        </span>
      </div>
    </div>
  )
}
