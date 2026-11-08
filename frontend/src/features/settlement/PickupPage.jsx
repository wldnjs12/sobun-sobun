import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId } from '../../api/currentUser.js'
import { fetchMyParticipation, fetchPod, markPickedUp } from '../pod/podApi.js'
import HostDropoffView from './HostDropoffView.jsx'
import { unitShareText } from './settlementApi.js'
import styles from './Settlement.module.css'

/**
 * 비대면 픽업 안내 (S12 · Stitch 13번).
 * 수령 완료는 자가신고(POST /pods/{id}/picked-up)다. 누르면 완료 팝업을 띄우고 건물 홈 / 내 팟으로 보낸다.
 *
 * 팟장이 이 주소를 열면 "가져가세요" 대신 "픽업 장소에 두세요" 화면(HostDropoffView)을 보여준다.
 * 팟장은 물건을 갖다 두는 사람이라, 참여자용 안내와 [수령 완료] 버튼이 맞지 않기 때문이다.
 *
 * 2026-11-08: 픽업 확인 번호(PIN) 표시를 뺐다. 팟 하나에 번호가 하나뿐이고(참여자 모두 같은 번호),
 * 보관함도 대표의 번호 확인 화면도 없어서 아무도 확인하지 않는 숫자였다. 서버의 pickupPin 필드는 API 호환을 위해 그대로 둔다.
 *
 * 2026-11 개편:
 *   - 건물 안 어디서 받는지는 팟마다 달라서, 팟장이 적은 pickupNote(예 "1층 공동현관 앞")를 그대로 보여준다.
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
  const [showDone, setShowDone] = useState(false)
  const navigate = useNavigate()

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
      setShowDone(true)
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

  // 팟장도 참여자 목록에 들어 있어서(joined=true) joined 확인보다 먼저 가른다
  if (pod.isHost || pod.hostUserId === getMyUserId()) {
    return <HostDropoffView pod={pod} podId={podId} />
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

      {showDone && (
        <PickupDonePopup
          title={pod.title}
          unitShare={unitShare}
          onHome={() => navigate('/home', { replace: true })}
          onMyPods={() => navigate('/my-pods', { replace: true })}
        />
      )}
    </div>
  )
}

/**
 * [수령 완료]를 누른 직후 뜨는 완료 팝업. 그냥 버튼 글자만 바뀌면 "눌린 건지" 알기 어려워서,
 * 끝났다는 걸 확실히 보여주고 다음 갈 곳(건물 홈 / 내 팟)을 고르게 한다.
 * navigate에 replace를 쓰는 이유: 뒤로 가기를 눌렀을 때 이미 끝난 픽업 화면으로 되돌아오지 않게.
 */
function PickupDonePopup({ title, unitShare, onHome, onMyPods }) {
  return (
    <div className={styles.popupBackdrop}>
      <section className={styles.popup} role="alertdialog" aria-modal="true" aria-labelledby="pickup-done-title">
        <span className={styles.popupIcon}>
          <Icon name="check_circle" size={40} />
        </span>
        <h2 id="pickup-done-title" className={styles.popupTitle}>
          수령 완료!
        </h2>
        <p className={styles.popupBody}>
          <b>{title}</b>
          {unitShare ? ` · ${unitShare}` : ''}
          <br />
          내 몫을 잘 받았어요.
          <br />
          팟장에게도 수령 완료로 표시돼요.
        </p>
        <button type="button" className={styles.primaryButton} onClick={onHome} autoFocus>
          <Icon name="home" size={20} /> 건물 홈으로
        </button>
        <button type="button" className={styles.popupSecondary} onClick={onMyPods}>
          내 팟에서 보기
        </button>
      </section>
    </div>
  )
}
