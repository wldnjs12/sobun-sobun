import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { registerBuilding } from './onboardingApi.js'
import styles from './Onboarding.module.css'

/**
 * 건물 확인 · 동 선택 (S1'').
 * 상태 3가지:
 *   빌라/원룸 → 동 선택 없이 바로 등록
 *   아파트(동 목록 있음) → 목록에서 선택
 *   아파트(동 목록 없음) → 직접 입력 (검색 API가 동 목록을 안 줄 때의 폴백)
 */
export default function BuildingConfirmPage() {
  const navigate = useNavigate()
  const candidate = useLocation().state?.candidate
  const [dong, setDong] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // 주소 검색을 거치지 않고 주소창으로 바로 들어오면 고른 건물이 없으니 검색으로 돌려보낸다
  if (!candidate) return <Navigate to="/onboarding/address" replace />

  const needsDong = candidate.isApartment
  const hasDongList = candidate.dongOptions?.length > 0
  const canSubmit = !needsDong || dong.trim()
  const displayName = candidate.buildingName || '이 건물'

  const handleRegister = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await registerBuilding({ ...candidate, dong: needsDong ? dong.trim() : null })
      navigate('/home', { replace: true }) // replace: 뒤로가기로 등록 화면에 돌아오지 않게
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="건물 확인" />

      <main className={styles.mainWithCta}>
        <section className={styles.confirmCard}>
          <span className={styles.confirmIcon}>
            <Icon name={needsDong ? 'apartment' : 'home'} size={32} />
          </span>
          <h2 className={styles.confirmTitle}>
            <span className={styles.accentText}>
              {displayName}
              {needsDong && dong.trim() ? ` ${dong.trim()}` : ''}
            </span>{' '}
            이웃으로 등록돼요
          </h2>
          <p className={styles.confirmAddress}>{candidate.roadAddress}</p>
        </section>

        {needsDong && (
          <section className={styles.dongSection}>
            <h3 className={styles.fieldLabel}>몇 동에 사세요?</h3>
            {hasDongList ? (
              <div className={styles.dongGrid}>
                {candidate.dongOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.dongChip} ${dong === option ? styles.dongChipActive : ''}`}
                    onClick={() => setDong(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input
                  className={styles.input}
                  placeholder="예: 101동"
                  value={dong}
                  onChange={(e) => setDong(e.target.value)}
                  aria-label="동 직접 입력"
                />
                <p className={styles.hint}>동 목록을 불러오지 못해서 직접 입력해주세요.</p>
              </>
            )}
            <p className={styles.hint}>같은 동 이웃끼리만 한 방에 모여요. 호수는 받지 않아요.</p>
          </section>
        )}

        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>
            <Icon name="my_location" size={20} />
          </span>
          <div>
            <strong>팟을 열거나 참여할 때 위치를 한 번 더 확인해요</strong>
            <p>그때 실제로 이 건물 근처에 있는지 GPS로 확인해서, 다른 건물 사람이 섞이지 않게 해요.</p>
          </div>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}
      </main>

      <div className={styles.ctaDock}>
        <button type="button" className={styles.primaryButton} disabled={!canSubmit || submitting} onClick={handleRegister}>
          {submitting ? '등록하는 중…' : '이 건물로 등록하기'}
        </button>
        <button type="button" className={styles.textButton} onClick={() => navigate(-1)}>
          다른 주소 다시 찾기
        </button>
      </div>
    </div>
  )
}
