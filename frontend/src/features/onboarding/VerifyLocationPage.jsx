import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING } from '../pod/podApi.js'
import { verifyBuilding } from './onboardingApi.js'
import styles from './Onboarding.module.css'

// 서버 에러 code별로 다음 행동을 다르게 안내한다 (docs/handoff/qr-auth.md 표 기준)
const RETRY_BY_CODE = {
  INVALID_QR: 'rescan',
  EXPIRED_QR: 'rescan',
  OUT_OF_RANGE: 'relocate',
}

/**
 * 위치 확인(S2 · Stitch 03번) + 인증 실패(S3 · Stitch 04번).
 * 04는 03의 "실패한 상태"라서 화면을 따로 나누지 않고 status 값으로 바꿔 그린다.
 *
 * QR 토큰은 두 군데서 올 수 있다:
 *   - QR 스캔 화면(02)이 navigate state로 넘겨준 값
 *   - 주소의 ?qr= (QR에 이 화면 링크를 넣어두면 휴대폰 기본 카메라로 찍어도 바로 여기로 온다)
 */
export default function VerifyLocationPage() {
  const navigate = useNavigate()
  // 훅은 조건 없이 매번 같은 순서로 불러야 해서, 둘 다 먼저 꺼내놓고 고른다
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const qrToken = location.state?.qrToken ?? searchParams.get('qr')
  // locating(위치 찾는 중) → verifying(서버 확인 중) → success | failed | denied
  const [status, setStatus] = useState('locating')
  const [failure, setFailure] = useState(null) // { code, message }

  // 시도마다 번호를 매기고, 가장 최근 시도의 결과만 반영한다.
  // 개발 모드(StrictMode)는 화면을 두 번 띄웠다 지워서 요청이 동시에 2번 나가는데,
  // 백엔드는 같은 사용자 동시 인증 시 하나를 DB 에러로 실패시킨다 (handoff 문서 6번). 이전 시도는 무시해서 막는다.
  const attempt = useRef(0)

  const run = useCallback(() => {
    const myAttempt = ++attempt.current
    const isStale = () => myAttempt !== attempt.current
    setStatus('locating')
    setFailure(null)
    if (!navigator.geolocation) {
      setStatus('failed')
      setFailure({ message: '이 기기에서는 위치를 확인할 수 없어요.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (isStale()) return
        setStatus('verifying')
        try {
          await verifyBuilding({ qrToken, latitude: coords.latitude, longitude: coords.longitude })
          if (isStale()) return
          setStatus('success')
          // 성공 화면을 잠깐 보여준 뒤 건물 홈으로. replace: 뒤로가기로 인증 화면에 돌아오지 않게
          setTimeout(() => navigate('/home', { replace: true }), 1200)
        } catch (e) {
          if (isStale()) return
          setStatus('failed')
          setFailure({ code: e.code, message: e.message })
        }
      },
      (geoError) => {
        if (isStale()) return
        // code 1 = 사용자가 위치 권한을 거부함, 그 외 = 신호 약함/시간 초과
        if (geoError.code === 1) {
          setStatus('denied')
        } else {
          setStatus('failed')
          setFailure({ code: 'OUT_OF_RANGE', message: '위치를 확인하지 못했어요. 창가나 1층 로비에서 다시 시도해주세요.' })
        }
      },
      // 정확도 우선, 10초 안에 못 찾으면 실패, 예전에 저장된 위치는 쓰지 않음
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [qrToken, navigate])

  useEffect(() => {
    if (qrToken) run()
    return () => {
      attempt.current++ // 화면을 떠나면 진행 중이던 시도를 무효로
    }
  }, [qrToken, run])

  if (!qrToken) return <Navigate to="/onboarding/scan" replace />

  if (status === 'failed') {
    return <AuthFailed failure={failure} onRetry={run} onRescan={() => navigate('/onboarding/scan', { replace: true })} />
  }

  const steps = [
    { icon: 'check', label: 'QR 완료', state: 'done' },
    { icon: 'near_me', label: '위치 확인', state: status === 'success' ? 'done' : 'current' },
    { icon: 'domain', label: '건물 인증', state: status === 'success' ? 'done' : 'todo' },
  ]

  return (
    <div className={styles.page}>
      <PageHeader title="입주민 위치 확인" />

      <main className={styles.main}>
        <ol className={styles.progress}>
          {steps.map((step) => (
            <li key={step.label} className={`${styles.progressStep} ${styles[step.state]}`}>
              <span className={styles.progressDot}>
                <Icon name={step.state === 'done' ? 'check' : step.icon} size={16} />
              </span>
              {step.label}
            </li>
          ))}
        </ol>

        <section className={styles.radar}>
          <div className={`${styles.radarRing} ${status === 'success' ? '' : styles.radarPulse}`}>
            <span className={styles.radarCore}>
              <Icon name={status === 'success' ? 'check_circle' : status === 'denied' ? 'location_disabled' : 'satellite_alt'} size={40} filled={status === 'success'} />
            </span>
          </div>
          {status === 'denied' ? (
            <>
              <h2 className={styles.radarTitle}>위치 권한이 필요해요</h2>
              <p className={styles.radarBody}>
                같은 건물 안에 있는 이웃인지 확인할 때만 써요. 브라우저 주소창 옆 자물쇠 아이콘 → 위치 → 허용으로 바꾼
                뒤 다시 시도해주세요.
              </p>
            </>
          ) : status === 'success' ? (
            <>
              <h2 className={styles.radarTitle}>인증 완료!</h2>
              <p className={styles.radarBody}>{BUILDING.name} 이웃이 된 걸 환영해요. 건물 홈으로 이동할게요.</p>
            </>
          ) : (
            <>
              <h2 className={styles.radarTitle}>건물 위치를 확인하고 있어요</h2>
              <p className={styles.radarBody}>같은 건물 안에 있는지 확인하는 용도로만 사용해요.</p>
            </>
          )}
        </section>

        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>
            <Icon name="verified_user" size={20} />
          </span>
          <div>
            <strong>개인정보 안심</strong>
            <p>위치는 건물 반경 50m 안인지 확인하는 데만 쓰고, 좌표 자체는 저장하지 않아요.</p>
          </div>
        </div>
      </main>

      {status === 'denied' && (
        <div className={styles.ctaDock}>
          <button type="button" className={styles.primaryButton} onClick={run}>
            <Icon name="refresh" size={20} />
            다시 시도하기
          </button>
        </div>
      )}
    </div>
  )
}

function AuthFailed({ failure, onRetry, onRescan }) {
  const retry = RETRY_BY_CODE[failure?.code] ?? 'rescan'

  return (
    <div className={styles.page}>
      <PageHeader title="인증 대기" />

      <main className={styles.mainWithCta}>
        <section className={styles.failHero}>
          <span className={styles.failIcon}>
            <Icon name={retry === 'relocate' ? 'wrong_location' : 'qr_code_2'} size={28} />
          </span>
          {/* 서버가 준 문구를 그대로 보여준다 (백엔드와 약속한 방식) */}
          <h2 className={styles.failTitle}>{failure?.message ?? '인증하지 못했어요'}</h2>
          <p className={styles.radarBody}>
            <strong className={styles.accentText}>{BUILDING.name}</strong> 반경 50m 안에서 인증할 수 있어요.
          </p>
        </section>

        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>
            <Icon name="verified_user" size={20} />
          </span>
          <div>
            <p>비대면 픽업과 입주민 신뢰를 위해 같은 건물에 사는 이웃만 소분에 참여할 수 있어요.</p>
          </div>
        </div>

        {retry === 'relocate' && (
          <section className={styles.tips}>
            <h3 className={styles.tipsTitle}>
              <Icon name="tips_and_updates" size={20} className={styles.tertiaryIcon} />
              빠른 위치 인식 해결 방법
            </h3>
            <div className={styles.tipItem}>
              <span className={`${styles.tipIcon} ${styles.tipIconBlue}`}>
                <Icon name="wifi" size={20} />
              </span>
              <div>
                <strong>와이파이(Wi-Fi) 켜기</strong>
                <p>주변 신호를 감지해 실내 GPS 오차가 크게 줄어들어요.</p>
              </div>
            </div>
            <div className={styles.tipItem}>
              <span className={`${styles.tipIcon} ${styles.tipIconButter}`}>
                <Icon name="door_front" size={20} />
              </span>
              <div>
                <strong>로비 또는 우편함으로 이동</strong>
                <p>건물 입구 1층 근처나 엘리베이터 홀에서 인증 성공률이 가장 높아요.</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <div className={styles.ctaDock}>
        {retry === 'relocate' ? (
          <>
            <button type="button" className={styles.primaryButton} onClick={onRetry}>
              <Icon name="refresh" size={20} />
              다시 인증하기
            </button>
            <button type="button" className={styles.textButton} onClick={onRescan}>
              <Icon name="qr_code_scanner" size={18} />
              다른 건물 QR 스캔하기
            </button>
          </>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={onRescan}>
            <Icon name="qr_code_scanner" size={20} />
            QR 다시 스캔하기
          </button>
        )}
      </div>
    </div>
  )
}
