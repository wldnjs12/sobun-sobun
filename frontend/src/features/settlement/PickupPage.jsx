import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { fetchMyParticipation, fetchPod, markPickedUp } from '../pod/podApi.js'
import { unitShareText } from './settlementApi.js'
import styles from './Settlement.module.css'

/**
 * 비대면 픽업 안내 (S12 · Stitch 13번).
 * 확인 번호(Pod.pickupPin)는 참여자에게만 내려오고(GET /pods/{id}/me), 수령 완료는 자가신고(POST /pods/{id}/picked-up)다.
 *
 * 2026-11 개편:
 *   - 동네(반경 1km) 단위라 팟이 내 건물이 아닐 수 있다 → 내 건물 이름을 장소로 쓰지 않고, 팟장이 적은 pickupNote를 보여준다.
 *     (예전의 "1층 무인락커" 고정 문구는 실제 정보가 아니라서 지웠다)
 *   - 묶음을 "미개봉 단위"로 나눈다 → 팟에 unitsPerPerson·unitLabel이 있으면 "1인 10롤씩 미개봉" 으로 안내.
 *     이 필드들은 팟 담당 쪽에서 추가 중이라, 없으면 문구를 생략한다(optional chaining).
 */
export default function PickupPage() {
  const { podId } = useParams()
  const [pod, setPod] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pickingUp, setPickingUp] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoadError(null)
    Promise.all([fetchPod(podId), fetchMyParticipation(podId)])
      .then(([loadedPod, mine]) => {
        setPod(loadedPod)
        setParticipation(mine)
      })
      .catch((e) => setLoadError(e.message))
  }, [podId, reloadKey])

  const handlePickedUp = async () => {
    setPickingUp(true)
    setError(null)
    try {
      setParticipation(await markPickedUp(podId))
    } catch (e) {
      setError(e.message)
    } finally {
      setPickingUp(false)
    }
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <PageHeader title="비대면 픽업" />
        <div className={styles.message}>
          <p>픽업 정보를 불러오지 못했어요. ({loadError})</p>
          <button type="button" className={styles.secondaryButton} onClick={() => setReloadKey((k) => k + 1)}>
            <Icon name="refresh" size={18} /> 다시 시도
          </button>
          <Link to={`/pods/${podId}`} className={styles.textLink}>
            팟 상세로 가기
          </Link>
        </div>
      </div>
    )
  }

  if (!pod || !participation) {
    return (
      <div className={styles.page}>
        <PageHeader title="비대면 픽업" />
        <div className={styles.message}>
          <p>픽업 정보를 불러오는 중이에요…</p>
        </div>
      </div>
    )
  }

  if (!participation.joined) {
    return (
      <div className={styles.page}>
        <PageHeader title="비대면 픽업" />
        <div className={styles.message}>
          <p>이 팟에 참여한 이웃만 픽업 정보를 볼 수 있어요.</p>
          <Link to={`/pods/${podId}`} className={styles.textLink}>
            팟 상세로 가기
          </Link>
        </div>
      </div>
    )
  }

  const pickedUp = Boolean(participation.pickedUp)
  const unitShare = unitShareText(pod)
  const spot = pod.pickupNote?.trim() || null

  const steps = [
    { icon: 'place', text: spot ? `팟장이 알려준 장소(${spot})로 가요` : '팟장이 알려준 픽업 장소로 가요' },
    { icon: 'inventory_2', text: unitShare ? `내 몫 ${unitShare} 미개봉 묶음을 챙겨요` : '내 몫의 미개봉 묶음을 챙겨요' },
    { icon: 'verified', text: '포장이 뜯기지 않았는지 확인하고 [수령 완료]를 눌러요' },
  ]

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
            {unitShare ? `${unitShare} 미개봉 상태로 가져가요. ` : '내 몫은 미개봉 상태 그대로 가져가요. '}
            팟장을 직접 만나지 않아도 돼요.
          </p>
        </section>

        <section className={styles.lockerCard}>
          <div className={styles.lockerRow}>
            <span className={styles.lockerIcon}>
              <Icon name="place" size={22} />
            </span>
            <div>
              <span className={styles.resultLabel}>수령 장소</span>
              <strong>{spot ?? '팟장이 아직 픽업 장소를 적지 않았어요'}</strong>
            </div>
          </div>
          <div className={styles.pinBox}>
            <span className={styles.resultLabel}>
              <Icon name="pin" size={16} /> 픽업 확인 번호
            </span>
            {participation.pickupPin ? (
              <strong className={styles.pinValue}>{participation.pickupPin}</strong>
            ) : (
              <strong className={styles.pinPending}>번호가 아직 없어요</strong>
            )}
            <span className={styles.pinHint}>
              이 팟 참여자만 볼 수 있는 번호예요. 보관함을 쓰면 비밀번호로, 아니면 내 몫 확인용으로 써요.
            </span>
          </div>
        </section>

        <section className={styles.breakdown}>
          <div className={styles.breakdownHead}>
            <h3>
              <Icon name="directions_walk" size={20} className={styles.primaryIcon} /> 찾아가는 방법
            </h3>
          </div>
          <ol className={styles.pickupSteps}>
            {steps.map((step, i) => (
              <li key={step.text}>
                <span className={styles.pickupStepNum}>{i + 1}</span>
                <Icon name={step.icon} size={18} className={styles.primaryIcon} />
                {step.text}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.labelCard}>
          <Icon name="verified_user" size={20} className={styles.primaryIcon} />
          <div>
            <strong>내 몫 확인</strong>
            <p>
              <b>{pod.title}</b>
              {unitShare ? ` · ${unitShare}` : ` · 1/${pod.targetParticipantCount}`} — 묶음 포장이 뜯기지 않았는지 먼저
              확인해주세요.
            </p>
          </div>
        </section>

        <Link to={`/pods/${podId}`} className={styles.textLink}>
          물건이 없거나 문제가 있나요? → 팟 상세에서 확인
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
          {pickedUp ? '수령 완료! 잘 쓰세요' : pickingUp ? '처리 중…' : '물건을 꺼냈어요 · 수령 완료'}
        </button>
      </div>
    </div>
  )
}
