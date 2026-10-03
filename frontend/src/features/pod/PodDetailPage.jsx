import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { connectPodSocket } from '../../api/socket.js'
import { isBuildingAccessDenied } from '../../api/client.js'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import JoinConfirmSheet from './JoinConfirmSheet.jsx'
import useLocationCheck from '../onboarding/useLocationCheck.jsx'
import { closePod, fetchPod, joinPod } from './podApi.js'
import { getMyUserId, hasJoined } from '../../api/currentUser.js'
import { calcDiscountRate, calcPerPersonPrice, useRemainingTime } from './podUtils.js'
import styles from './PodDetailPage.module.css'

/**
 * 팟 상세 (디자인 핸드오프 S6 · Stitch 07번). 핵심 기능 ② — 실시간 갱신.
 *
 * 실시간 갱신 흐름:
 *   다른 이웃이 참여 / 팟장이 마감 → 서버가 /topic/pods/{id} 로 PodAmountUpdateEvent 전송
 *   → 여기서 받아서 팟 정보를 다시 불러오고, 무엇이 바뀌었는지 띠 배너로 보여준다.
 */
export default function PodDetailPage() {
  const { podId } = useParams()
  const navigate = useNavigate()

  const [pod, setPod] = useState(null)
  const [error, setError] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [closing, setClosing] = useState(false)
  const [notice, setNotice] = useState(null)

  // 소켓 콜백 안에서 "직전 인원"을 알아야 금액 차이를 계산할 수 있다.
  // useState 값은 콜백이 만들어질 때의 값으로 굳어버리므로, 항상 최신값을 담는 useRef를 쓴다.
  const latestPod = useRef(null)
  latestPod.current = pod
  // 내가 참여하면 서버가 그 사실을 나한테도 방송한다. 그 이벤트에는 "이웃이 참여" 배너를 띄우지 않으려고 표시해둔다.
  const myJoinPending = useRef(false)

  useEffect(() => {
    // 에러 메시지만이 아니라 객체를 통째로 보관한다 → 403(다른 건물)인지 구분해서 다른 화면을 보여주려고
    fetchPod(podId).then(setPod).catch(setError)

    const client = connectPodSocket(podId, async (event) => {
      const before = latestPod.current
      const updated = await fetchPod(podId)
      setPod(updated)
      if (myJoinPending.current) {
        myJoinPending.current = false
        return
      }
      if (before && event.closed && !before.closed) {
        setNotice('팟장이 모집을 마감했어요. 곧 구매가 진행돼요!')
      } else if (before && event.participantCount > before.participantCount) {
        const priceBefore = calcPerPersonPrice(before.totalAmount, before.commissionRate, before.participantCount + 1)
        const priceAfter = calcPerPersonPrice(updated.totalAmount, updated.commissionRate, updated.participantCount + 1)
        setNotice(`방금 이웃 1명 참여로 ${(priceBefore - priceAfter).toLocaleString()}원 인하!`)
      }
    }, {
      // 실시간 구독을 서버가 거부 = 다른 건물 팟 (REST 403보다 먼저 올 수도 있어서 여기서도 처리)
      onDenied: () => setError(Object.assign(new Error('다른 건물의 팟에는 접근할 수 없어요.'), { code: 'BUILDING_ACCESS_DENIED' })),
    })
    return () => client.deactivate()
  }, [podId])

  const remainingText = useRemainingTime(pod?.deadline)
  // ① 2차 인증: 참여를 확정하기 직전에 GPS 확인 (훅이라서 아래의 early return보다 먼저 불러야 한다)
  const { runWithLocationCheck, checking, locationSheet } = useLocationCheck()

  if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="팟 상세" what="팟" />
  if (error) return <Fallback message={error.message} />
  if (!pod) return <Fallback message="팟 정보를 불러오는 중이에요…" />

  const isHost = pod.hostUserId === getMyUserId()
  const joined = hasJoined(pod.id)
  const isFull = pod.participantCount >= pod.targetParticipantCount
  const canJoin = !joined && !isFull && !pod.closed
  const seatsLeft = pod.targetParticipantCount - pod.participantCount

  // 내가 참여하면 인원이 1명 늘어나므로 +1 (이미 참여했으면 지금 인원 그대로)
  const myHeadCount = joined ? pod.participantCount : pod.participantCount + 1
  const myPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, myHeadCount)
  const finalPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, pod.targetParticipantCount)
  const discountRate = calcDiscountRate(myPrice, pod.originalPrice)
  const progressPercent = (pod.participantCount / pod.targetParticipantCount) * 100

  const handleConfirmJoin = () => runWithLocationCheck('POD_JOIN', joinNow)

  const joinNow = async () => {
    setJoining(true)
    setJoinError(null)
    myJoinPending.current = true
    try {
      const updated = await joinPod(pod.id)
      setPod(updated)
      setSheetOpen(false)
      if (updated.participantCount >= updated.targetParticipantCount) {
        navigate(`/pods/${pod.id}/complete`)
      } else {
        setNotice('참여 완료! 목표 인원이 모이면 알려드릴게요.')
      }
    } catch (e) {
      myJoinPending.current = false
      setJoinError(e.message)
    } finally {
      setJoining(false)
    }
  }

  // 팟 정책: 목표 인원이 차면 팟장이 직접 마감해야 정산(③)으로 넘어간다 (자동 마감 없음)
  const handleClose = async () => {
    if (!window.confirm('모집을 마감할까요? 마감하면 더 이상 참여·취소를 할 수 없어요.')) return
    setClosing(true)
    try {
      await closePod(pod.id)
      navigate(`/pods/${pod.id}/complete`)
    } catch (e) {
      setNotice(e.message)
      setClosing(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="팟 상세" />

      <main className={styles.main}>
        <div className={styles.microBar}>
          <span className={styles.countdown}>
            <Icon name="alarm" size={14} />
            마감까지 {remainingText}
          </span>
          <span className={styles.locationChip}>
            <Icon name="location_on" size={14} />
            {pod.pickupSpot}
          </span>
        </div>

        <div className={styles.gallery}>
          {pod.imageUrl ? (
            <img src={pod.imageUrl} alt={pod.title} className={styles.galleryImage} />
          ) : (
            <Icon name="inventory_2" size={56} className={styles.galleryPlaceholder} />
          )}
          <span className={styles.galleryTag}>{pod.unitLabel}</span>
        </div>

        <h2 className={styles.title}>{pod.title}</h2>

        {/* ── 가격 카드 ── */}
        <section className={`${styles.card} ${styles.priceCard}`}>
          {notice && (
            <div className={styles.ribbon}>
              <Icon name="trending_down" size={16} className={styles.ribbonIcon} />
              <span className={styles.ribbonText}>{notice}</span>
              <span className={styles.ribbonTime}>방금 전</span>
            </div>
          )}

          <div className={styles.priceLabelRow}>
            <span className={styles.priceLabel}>
              {joined ? '현재 1인당 예상 정산 금액' : '지금 참여하면 1인당 예상 금액'}
            </span>
            {discountRate !== null && <span className={styles.saveBadge}>약 {discountRate}% 절약</span>}
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceBig}>{myPrice.toLocaleString()}</span>
            <span className={styles.priceWon}>원</span>
            {pod.originalPrice && (
              <span className={styles.priceOriginal}>마트가 {pod.originalPrice.toLocaleString()}원</span>
            )}
          </div>

          {pod.originalPrice && (
            <div className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>
                  <Icon name="storefront" size={15} /> 혼자 마트에서 살 때
                </span>
                <span className={styles.strike}>{pod.originalPrice.toLocaleString()}원</span>
              </div>
              <div className={`${styles.breakdownRow} ${styles.breakdownSave}`}>
                <span className={styles.breakdownLabel}>
                  <Icon name="savings" size={16} /> 소분 팟 절약 금액
                </span>
                <span>
                  -{(pod.originalPrice - myPrice).toLocaleString()}원 ({discountRate}% ↓)
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── 모집 현황 ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Icon name="group" size={20} className={styles.primaryIcon} />
              <h3 className={styles.cardTitle}>모집 현황</h3>
              <span className={styles.countText}>
                {pod.participantCount} / {pod.targetParticipantCount}명
              </span>
            </div>
            {!isFull && <span className={styles.peachBadge}>{seatsLeft}명만 더 모이면 성사!</span>}
          </div>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          {!isFull && (
            <p className={styles.progressHint}>
              {pod.targetParticipantCount}명이 다 모이면 1인 <strong>{finalPrice.toLocaleString()}원</strong>까지 내려가요
            </p>
          )}

          {/* 목표 인원만큼 칸을 그리고, 찬 칸은 파란색 / 내가 들어갈 칸은 주황색 */}
          <div className={styles.portionGrid} style={{ gridTemplateColumns: `repeat(${pod.targetParticipantCount}, 1fr)` }}>
            {Array.from({ length: pod.targetParticipantCount }, (_, i) => {
              const filled = i < pod.participantCount
              const isMySlot = canJoin && i === pod.participantCount
              return (
                <div key={i} className={`${styles.portion} ${isMySlot ? styles.portionMine : ''}`}>
                  <Icon name={isMySlot ? 'add_circle' : 'inventory_2'} size={18} />
                  <span className={styles.portionLabel}>{isMySlot ? '내 몫!' : `${i + 1}번 몫`}</span>
                  <span className={`${styles.portionDot} ${filled ? styles.portionDotFilled : ''}`} />
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 함께 나누는 이웃 ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>함께 나누는 이웃</h3>
            <span className={styles.mutedSmall}>
              <Icon name="shield" size={14} /> 익명 보호
            </span>
          </div>
          <div className={styles.participants}>
            {/* 서버는 인원 수만 알려준다. 팟장이 만들자마자 참여하므로 첫 번째 자리가 팟장이다 */}
            {Array.from({ length: pod.participantCount }, (_, i) => (
              <div key={i} className={styles.participant}>
                <div className={styles.participantLeft}>
                  <span className={styles.participantAvatar}>
                    <Icon name="person" size={18} filled />
                  </span>
                  <span className={styles.participantName}>
                    {i === 0 ? (isHost ? '나' : '팟장 이웃') : `이웃 ${i + 1}`}
                  </span>
                  {i === 0 && <span className={styles.hostTag}>팟장</span>}
                </div>
                <span className={styles.joinedText}>참여 완료</span>
              </div>
            ))}
            {canJoin && (
              <button type="button" className={styles.emptySlot} onClick={() => setSheetOpen(true)}>
                <div className={styles.participantLeft}>
                  <span className={styles.emptySlotAvatar}>
                    <Icon name="star" size={20} />
                  </span>
                  <div>
                    <div className={styles.emptySlotTitle}>
                      당신의 빈자리!
                      {seatsLeft === 1 && <span className={styles.lastSeatTag}>라스트 1석</span>}
                    </div>
                    <div className={styles.emptySlotSub}>지금 참여하고 함께 나눠요</div>
                  </div>
                </div>
                <Icon name="arrow_forward" size={20} />
              </button>
            )}
          </div>
        </section>

        {/* ── 비대면 픽업 ── */}
        <section className={styles.card}>
          <div className={styles.cardTitleGroup}>
            <Icon name="lock_clock" size={20} className={styles.primaryIcon} />
            <h3 className={styles.cardTitle}>100% 비대면 무인 픽업</h3>
          </div>
          <div className={styles.pickupBox}>
            <Icon name="my_location" size={18} className={styles.secondaryIcon} />
            <span>{pod.pickupSpot}에서 얼굴 마주치지 않고 받아가요</span>
          </div>
        </section>
      </main>

      {/* ── 하단 고정 참여 바 ── */}
      <div className={styles.dock}>
        <div className={styles.dockPrice}>
          <span className={styles.dockLabel}>
            최종 예상가 {discountRate !== null && <span className={styles.dockDiscount}>{discountRate}%↓</span>}
          </span>
          <span className={styles.dockAmount}>
            {myPrice.toLocaleString()}
            <small>원</small>
          </span>
        </div>
        <DockAction
          pod={pod}
          isHost={isHost}
          joined={joined}
          isFull={isFull}
          canJoin={canJoin}
          seatsLeft={seatsLeft}
          closing={closing}
          onJoin={() => setSheetOpen(true)}
          onClose={handleClose}
          onNavigate={navigate}
        />
      </div>

      {sheetOpen && (
        <JoinConfirmSheet
          pod={pod}
          pricePerPerson={myPrice}
          joining={joining}
          checking={checking}
          error={joinError}
          onConfirm={handleConfirmJoin}
          onClose={() => {
            setSheetOpen(false)
            setJoinError(null)
          }}
        />
      )}
      {locationSheet}
    </div>
  )
}

/**
 * 하단 버튼은 상황에 따라 하나만 보여준다. 위에서부터 먼저 맞는 조건이 이긴다.
 *   마감됨 → (팟장) 정산하러 가기 / (참여자) 안내
 *   다 참 + 팟장 → 마감하기
 *   참여 가능 → 참여하기
 *   이미 참여 → 참여 완료
 *   다 참 → 모집 완료 보기
 */
function DockAction({ pod, isHost, joined, isFull, canJoin, seatsLeft, closing, onJoin, onClose, onNavigate }) {
  if (pod.closed) {
    return isHost ? (
      <button type="button" className={styles.dockButton} onClick={() => onNavigate(`/settlements/${pod.id}`)}>
        <Icon name="receipt_long" size={20} />
        영수증 올리고 정산하기
      </button>
    ) : (
      <button type="button" className={styles.dockButton} onClick={() => onNavigate(`/pods/${pod.id}/complete`)}>
        <Icon name="lock" size={20} />
        마감된 팟 · 진행 상황 보기
      </button>
    )
  }
  if (isHost && isFull) {
    return (
      <button type="button" className={`${styles.dockButton} ${styles.dockButtonHost}`} disabled={closing} onClick={onClose}>
        <Icon name="flag" size={20} />
        {closing ? '마감하는 중…' : '모집 마감하기'}
      </button>
    )
  }
  if (canJoin) {
    return (
      <button type="button" className={styles.dockButton} onClick={onJoin}>
        <Icon name="shopping_bag" size={20} />
        참여하기
        <span className={styles.dockSeats}>{seatsLeft}명 남음</span>
      </button>
    )
  }
  if (joined && !isFull) {
    return (
      <button type="button" className={styles.dockButton} disabled>
        <Icon name="check_circle" size={20} />
        {isHost ? '이웃 모으는 중' : '참여 완료'}
      </button>
    )
  }
  return (
    <button type="button" className={styles.dockButton} onClick={() => onNavigate(`/pods/${pod.id}/complete`)}>
      <Icon name="celebration" size={20} />
      모집 완료 보기
    </button>
  )
}

function Fallback({ message }) {
  return (
    <div className={styles.page}>
      <PageHeader title="팟 상세" />
      <p className={styles.fallback}>{message}</p>
    </div>
  )
}
