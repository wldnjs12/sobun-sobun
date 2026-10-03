import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING, fetchMyParticipation, fetchPod, markPickedUp } from '../pod/podApi.js'
import styles from './Settlement.module.css'

const PICKUP_STEPS = [
  { icon: 'login', text: '1층 공동현관을 지나 무인 보관함 구역으로 가요' },
  { icon: 'pin', text: '보관함 번호를 찾아 비밀번호를 입력해요' },
  { icon: 'label', text: '라벨의 팟 이름과 봉인 스티커가 그대로인지 확인해요' },
]

/**
 * 비대면 픽업 안내 (S12 · Stitch 13번).
 * 보관함 비밀번호(Pod.pickupPin)와 수령 완료 자가신고(POST /pods/{id}/picked-up)가 백엔드에
 * 새로 추가돼서, 이전의 "보관 후 알려드려요" placeholder와 로컬 state뿐이던 수령 완료를 실제 값으로 교체했다.
 */
export default function PickupPage() {
  const { podId } = useParams()
  const [pod, setPod] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [pickingUp, setPickingUp] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(() => {})
    fetchMyParticipation(podId).then(setParticipation).catch(() => {})
  }, [podId])

  const handlePickedUp = async () => {
    setPickingUp(true)
    try {
      setParticipation(await markPickedUp(podId))
    } catch (e) {
      setError(e.message)
    } finally {
      setPickingUp(false)
    }
  }

  const pickedUp = participation?.pickedUp ?? false
  const spot = pod?.pickupSpot ?? '1층 무인락커'

  return (
    <div className={styles.page}>
      <PageHeader title="비대면 픽업" />

      <main className={styles.mainWithCta}>
        <section>
          <span className={styles.statusPill}>
            <Icon name="local_shipping" size={16} />
            {pickedUp ? '수령 완료' : '비대면 픽업 대기중'}
          </span>
          <h2 className={styles.title}>
            이제 편하게
            <br />
            가져가면 돼요
          </h2>
          <p className={styles.body}>
            팟장을 직접 만나지 않아도 돼요. 정해진 보관함에서 비밀번호를 입력하고 찾아가세요.
          </p>
        </section>

        <section className={styles.lockerCard}>
          <div className={styles.lockerRow}>
            <span className={styles.lockerIcon}>
              <Icon name="lock" size={22} />
            </span>
            <div>
              <span className={styles.resultLabel}>수령 장소</span>
              <strong>
                {BUILDING.name} {spot}
              </strong>
            </div>
          </div>
          <div className={styles.pinBox}>
            <span className={styles.resultLabel}>
              <Icon name="pin" size={16} /> 보관함 비밀번호
            </span>
            {participation?.pickupPin ? (
              <strong className={styles.pinValue}>{participation.pickupPin}</strong>
            ) : (
              <strong className={styles.pinPending}>불러오는 중…</strong>
            )}
            <span className={styles.pinHint}>이 팟에 참여한 사람만 볼 수 있는 비밀번호예요.</span>
          </div>
        </section>

        <section className={styles.breakdown}>
          <div className={styles.breakdownHead}>
            <h3>
              <Icon name="directions_walk" size={20} className={styles.primaryIcon} /> 찾아가는 방법
            </h3>
          </div>
          <ol className={styles.pickupSteps}>
            {PICKUP_STEPS.map((step, i) => (
              <li key={step.text}>
                <span className={styles.pickupStepNum}>{i + 1}</span>
                <Icon name={step.icon} size={18} className={styles.primaryIcon} />
                {step.text}
              </li>
            ))}
          </ol>
        </section>

        {pod && (
          <section className={styles.labelCard}>
            <Icon name="verified_user" size={20} className={styles.primaryIcon} />
            <div>
              <strong>소분 상품 라벨 확인</strong>
              <p>
                라벨에 <b>{pod.title}</b>(1/{pod.targetParticipantCount} 소분)이 적혀 있는지, 봉인 스티커가 뜯기지 않았는지
                먼저 확인해주세요.
              </p>
            </div>
          </section>
        )}

        <Link to="/mypage" className={styles.textLink}>
          보관함에 물건이 없거나 문제가 있나요? → 마이페이지에서 팟 확인
        </Link>

        {error && <p className={styles.error}>{error}</p>}
      </main>

      <div className={styles.ctaDock}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={pickedUp || pickingUp}
          onClick={handlePickedUp}
        >
          <Icon name="check_circle" size={20} />
          {pickedUp ? '수령 완료! 맛있게 드세요' : pickingUp ? '처리 중…' : '물건을 꺼냈어요 · 수령 완료'}
        </button>
      </div>
    </div>
  )
}
