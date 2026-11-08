import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { connectPodSocket } from '../../api/socket.js'
import { isBuildingAccessDenied } from '../../api/client.js'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import JoinConfirmSheet from './JoinConfirmSheet.jsx'
import useLocationCheck from '../onboarding/useLocationCheck.jsx'
import { cancelJoinPod, cancelPod, categoryIcon, closePod, fetchMyParticipation, fetchPod, joinPod, podImage } from './podApi.js'
import { calcDiscountRate, calcPerPersonPrice, useRemainingTime } from './podUtils.js'
import styles from './PodDetailPage.module.css'

/**
 * 팟 상세. 핵심 기능 ② — 실시간 갱신.
 *
 * 실시간 갱신 흐름:
 *   이웃 참여·취소 / 대표가 마감·모집 취소·수정 → 서버가 /topic/pods/{id} 로 이벤트 전송
 *   → 여기서 받아서 팟 정보와 "내 참여 상태"를 다시 불러오고, 무엇이 바뀌었는지 띠 배너로 보여준다.
 *
 * "내가 참여했는지"는 서버(GET /pods/{id}/me)에서 받는다. 브라우저 기억(localStorage)은 다른 기기에서 틀리기 때문.
 */
export default function PodDetailPage() {
  const { podId } = useParams()
  const navigate = useNavigate()

  const [pod, setPod] = useState(null)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  // 화면 안에서 띄우는 확인 패널: null | 'cancelPod' | 'close' | 'leave'
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  // 소켓 콜백 안에서 "직전 상태"를 알아야 무엇이 바뀌었는지 알 수 있다.
  // useState 값은 콜백이 만들어질 때의 값으로 굳어버리므로, 항상 최신값을 담는 useRef를 쓴다.
  const latestPod = useRef(null)
  latestPod.current = pod
  // 내가 한 행동도 서버가 나한테 방송한다. 그 이벤트에는 "이웃이 참여" 배너를 띄우지 않으려고 표시해둔다.
  const myActionPending = useRef(false)

  const reload = useCallback(async () => {
    const [updated, me] = await Promise.all([fetchPod(podId), fetchMyParticipation(podId)])
    setPod(updated)
    setJoined(Boolean(me?.joined))
    return updated
  }, [podId])

  useEffect(() => {
    // 에러 메시지만이 아니라 객체를 통째로 보관한다 → 403(다른 건물)인지 구분해서 다른 화면을 보여주려고
    reload().catch(setError)

    const client = connectPodSocket(podId, async (event) => {
      const before = latestPod.current
      let updated
      try {
        updated = await reload()
      } catch {
        return
      }
      if (myActionPending.current) {
        myActionPending.current = false
        return
      }
      if (!before) return
      if (event.status === 'CANCELLED' && before.status !== 'CANCELLED') {
        setNotice('대표가 모집을 취소했어요.')
      } else if (event.closed && !before.closed) {
        setNotice('대표가 모집을 마감했어요. 곧 구매가 진행돼요!')
      } else if (event.participantCount > before.participantCount) {
        const priceBefore = calcPerPersonPrice(before.totalAmount, before.commissionRate, before.participantCount + 1)
        const priceAfter = calcPerPersonPrice(updated.totalAmount, updated.commissionRate, updated.participantCount + 1)
        setNotice(
          priceBefore > priceAfter
            ? `방금 이웃 1명 참여로 ${(priceBefore - priceAfter).toLocaleString()}원 인하!`
            : '방금 이웃 1명이 참여했어요.',
        )
      } else if (event.participantCount < before.participantCount) {
        setNotice('이웃 1명이 참여를 취소했어요.')
      } else if (updated.title !== before.title || updated.totalAmount !== before.totalAmount || updated.deadline !== before.deadline) {
        setNotice('대표가 글 내용을 수정했어요.')
      }
    }, {
      // 실시간 구독을 서버가 거부 = 다른 건물 팟 (REST 403보다 먼저 올 수도 있어서 여기서도 처리)
      onDenied: () => setError(Object.assign(new Error('다른 건물의 팟에는 접근할 수 없어요.'), { code: 'BUILDING_ACCESS_DENIED' })),
    })
    return () => client.deactivate()
  }, [podId, reload])

  const remainingText = useRemainingTime(pod?.deadline)
  // ① 2차 인증: 참여를 확정하기 직전에 GPS 확인 (훅이라서 아래의 early return보다 먼저 불러야 한다)
  const { runWithLocationCheck, checking, locationSheet } = useLocationCheck()

  if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="공동구매 상세" what="팟" />
  if (error) return <Fallback message={error.message} onRetry={() => { setError(null); reload().catch(setError) }} />
  if (!pod) return <Fallback message="공동구매 정보를 불러오는 중이에요…" />

  const isHost = pod.isHost
  const isOpen = pod.status === 'OPEN'
  const isCancelled = pod.status === 'CANCELLED'
  const isFull = pod.participantCount >= pod.targetParticipantCount
  const deadlinePassed = pod.deadlinePassed
  const canJoin = isOpen && !joined && !isHost && !isFull && !deadlinePassed
  const canLeave = isOpen && joined && !isHost
  // 대표 외 참여자가 없을 때만 수정 가능 (대표 자신이 1명분)
  const canEdit = isHost && isOpen && pod.participantCount <= 1
  const canClose = isHost && isOpen && pod.participantCount >= 2
  const seatsLeft = Math.max(0, pod.targetParticipantCount - pod.participantCount)

  // 내가 참여하면 인원이 1명 늘어나므로 +1 (이미 참여했거나 대표면 지금 인원 그대로)
  const myHeadCount = joined || isHost ? pod.participantCount : pod.participantCount + 1
  const myPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, myHeadCount)
  const finalPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, pod.targetParticipantCount)
  const discountRate = calcDiscountRate(myPrice, pod.originalPrice)
  const progressPercent = Math.min(100, (pod.participantCount / pod.targetParticipantCount) * 100)

  const handleConfirmJoin = () => runWithLocationCheck('POD_JOIN', joinNow)

  const joinNow = async () => {
    setJoining(true)
    setJoinError(null)
    myActionPending.current = true
    try {
      await joinPod(pod.id)
      const updated = await reload()
      setSheetOpen(false)
      if (updated.participantCount >= updated.targetParticipantCount) {
        navigate(`/pods/${pod.id}/complete`)
      } else {
        setNotice('참여 완료! 대표가 마감하면 알려드릴게요.')
      }
    } catch (e) {
      myActionPending.current = false
      setJoinError(e.message)
    } finally {
      setJoining(false)
    }
  }

  /** 확인 패널에서 "네"를 눌렀을 때 실제로 실행할 일 */
  const runConfirmed = async () => {
    setBusy(true)
    myActionPending.current = true
    try {
      if (confirming === 'close') {
        await closePod(pod.id)
        navigate(`/pods/${pod.id}/complete`)
        return
      }
      if (confirming === 'cancelPod') {
        await cancelPod(pod.id)
        setNotice('모집을 취소했어요. 참여한 이웃에게도 취소로 보여요.')
      } else if (confirming === 'leave') {
        await cancelJoinPod(pod.id)
        setNotice('참여를 취소했어요.')
      }
      await reload()
      setConfirming(null)
    } catch (e) {
      myActionPending.current = false
      setNotice(e.message)
      setConfirming(null)
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className={styles.page}>
      <PageHeader title="공동구매 상세" />

      <main className={styles.main}>
        {isCancelled && (
          <div className={`${styles.statusBanner} ${styles.statusCancelled}`} role="status">
            <Icon name="block" size={18} />
            대표가 모집을 취소한 공동구매예요. 더 이상 참여할 수 없어요.
          </div>
        )}
        {pod.closed && (
          <div className={styles.statusBanner} role="status">
            <Icon name="lock" size={18} />
            모집이 마감됐어요. {isHost ? '구매 후 영수증을 올려 정산을 시작하세요.' : '대표가 구매·정산을 진행해요.'}
          </div>
        )}
        {isOpen && deadlinePassed && (
          <div className={styles.statusBanner} role="status">
            <Icon name="timer_off" size={18} />
            마감 시간이 지나 새로 참여할 수 없어요.{isHost ? ' 마감하거나 모집을 취소해주세요.' : ''}
          </div>
        )}

        <div className={styles.microBar}>
          <span className={styles.countdown}>
            <Icon name="alarm" size={14} />
            {isOpen ? `마감까지 ${remainingText}` : isCancelled ? '모집 취소됨' : '모집 마감'}
          </span>
          {pod.pickupNote && (
            <span className={styles.locationChip}>
              <Icon name="location_on" size={14} />
              {pod.pickupNote}
            </span>
          )}
        </div>

        <div className={styles.gallery}>
          {podImage(pod) ? (
            <img src={podImage(pod)} alt="" className={styles.galleryImage} />
          ) : (
            <Icon name={categoryIcon(pod.category)} size={56} className={styles.galleryPlaceholder} />
          )}
          <span className={styles.galleryTag}>{pod.shareLabel}</span>
        </div>

        <div className={styles.badgeRow}>
          <span className={styles.categoryBadge}>{pod.categoryLabel ?? '기타'}</span>
          {isHost && <span className={styles.hostTag}>내가 연 공동구매</span>}
          {joined && !isHost && <span className={styles.hostTag}>참여 중</span>}
        </div>
        <h2 className={styles.title}>{pod.title}</h2>
        {pod.description && <p className={styles.description}>{pod.description}</p>}

        {/* ── 나눔 방식 ── */}
        <section className={styles.card}>
          <div className={styles.cardTitleGroup}>
            <Icon name="splitscreen" size={20} className={styles.primaryIcon} />
            <h3 className={styles.cardTitle}>이렇게 나눠요</h3>
          </div>
          {pod.unitsPerPerson != null && pod.unitLabel ? (
            <p className={styles.splitText}>
              미개봉 상태로 <strong>1인 {pod.unitsPerPerson}{pod.unitLabel}씩</strong> 나눠요
              {pod.totalLabel && ` (총 ${pod.totalLabel} · 목표 ${pod.targetParticipantCount}명, 대표 포함)`}
            </p>
          ) : (
            <p className={styles.splitText}>목표 {pod.targetParticipantCount}명이 똑같이 나눠요 (대표 포함)</p>
          )}
        </section>

        {/* ── 가격 카드 ── */}
        <section className={`${styles.card} ${styles.priceCard}`}>
          {notice && (
            <div className={styles.ribbon}>
              <Icon name="campaign" size={16} className={styles.ribbonIcon} />
              <span className={styles.ribbonText}>{notice}</span>
              <span className={styles.ribbonTime}>방금 전</span>
            </div>
          )}

          <div className={styles.priceLabelRow}>
            <span className={styles.priceLabel}>
              {joined || isHost ? '지금 인원 기준 1인당 금액' : '지금 참여하면 1인당 예상 금액'}
            </span>
            {discountRate !== null && <span className={styles.saveBadge}>약 {discountRate}% 절약</span>}
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceBig}>{myPrice.toLocaleString()}</span>
            <span className={styles.priceWon}>원</span>
            {pod.originalPrice && (
              <span className={styles.priceOriginal}>혼자 살 때 {pod.originalPrice.toLocaleString()}원</span>
            )}
          </div>
          <p className={styles.progressHint}>
            총 결제 금액 {pod.totalAmount.toLocaleString()}원 · 수고비 {Math.round(pod.commissionRate * 100)}% 포함, 원 단위 올림
          </p>
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
            {isOpen && !isFull && <span className={styles.peachBadge}>{seatsLeft}자리 남음</span>}
          </div>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          {isOpen && !isFull && (
            <p className={styles.progressHint}>
              {pod.targetParticipantCount}명이 다 모이면 1인 <strong>{finalPrice.toLocaleString()}원</strong>이에요
            </p>
          )}

          <div className={styles.participants}>
            {/* 서버는 인원 수만 알려준다(익명). 대표가 개설과 동시에 참여하므로 첫 번째 자리가 대표다 */}
            {Array.from({ length: pod.participantCount }, (_, i) => (
              <div key={i} className={styles.participant}>
                <div className={styles.participantLeft}>
                  <span className={styles.participantAvatar}>
                    <Icon name="person" size={18} filled />
                  </span>
                  <span className={styles.participantName}>
                    {i === 0 ? (isHost ? '나' : '대표 이웃') : `이웃 ${i + 1}`}
                  </span>
                  {i === 0 && <span className={styles.hostTag}>대표</span>}
                </div>
                <span className={styles.joinedText}>{pod.shareLabel}</span>
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
                      빈자리
                      {seatsLeft === 1 && <span className={styles.lastSeatTag}>마지막 1자리</span>}
                    </div>
                    <div className={styles.emptySlotSub}>지금 참여하고 {pod.shareLabel} 받아가요</div>
                  </div>
                </div>
                <Icon name="arrow_forward" size={20} />
              </button>
            )}
          </div>
        </section>

        {/* ── 픽업 ── */}
        <section className={styles.card}>
          <div className={styles.cardTitleGroup}>
            <Icon name="pin_drop" size={20} className={styles.primaryIcon} />
            <h3 className={styles.cardTitle}>픽업 안내</h3>
          </div>
          <div className={styles.pickupBox}>
            <Icon name="my_location" size={18} className={styles.secondaryIcon} />
            <span>{pod.pickupNote || '대표가 정산할 때 픽업 방법을 알려드려요.'}</span>
          </div>
        </section>

        {/* ── 대표 메뉴 ── */}
        {isHost && isOpen && (
          <section className={styles.card}>
            <div className={styles.cardTitleGroup}>
              <Icon name="manage_accounts" size={20} className={styles.primaryIcon} />
              <h3 className={styles.cardTitle}>대표 메뉴</h3>
            </div>
            <div className={styles.hostActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!canEdit}
                onClick={() => navigate(`/pods/${pod.id}/edit`)}
              >
                <Icon name="edit" size={18} />
                수정
              </button>
              <button type="button" className={styles.dangerButton} onClick={() => setConfirming('cancelPod')}>
                <Icon name="block" size={18} />
                모집 취소
              </button>
            </div>
            {!canEdit && <p className={styles.progressHint}>참여한 이웃이 있어서 글을 수정할 수 없어요.</p>}
          </section>
        )}

        {confirming && (
          <ConfirmPanel
            kind={confirming}
            pod={pod}
            busy={busy}
            onConfirm={runConfirmed}
            onCancel={() => setConfirming(null)}
          />
        )}
      </main>

      {/* ── 하단 고정 바 ── */}
      <div className={styles.dock}>
        <div className={styles.dockPrice}>
          <span className={styles.dockLabel}>
            1인당 {discountRate !== null && <span className={styles.dockDiscount}>{discountRate}%↓</span>}
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
          canLeave={canLeave}
          canClose={canClose}
          seatsLeft={seatsLeft}
          busy={busy}
          onJoin={() => setSheetOpen(true)}
          onAsk={setConfirming}
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

const CONFIRM_TEXT = {
  cancelPod: {
    title: '모집을 취소할까요?',
    body: '취소하면 되돌릴 수 없어요. 참여한 이웃에게는 "취소된 공동구매"로 보여요.',
    yes: '모집 취소하기',
  },
  close: {
    title: '모집을 마감할까요?',
    body: '마감하면 더 이상 참여·참여 취소를 할 수 없고, 영수증을 올려 정산을 시작하게 돼요.',
    yes: '마감하기',
  },
  leave: {
    title: '참여를 취소할까요?',
    body: '마감 전이라 취소할 수 있어요. 다시 참여하려면 위치 확인을 한 번 더 해야 해요.',
    yes: '참여 취소하기',
  },
}

/** window.confirm 대신 화면 안에서 띄우는 확인 패널 (모바일 브라우저에서 confirm 창이 막히거나 어색해서) */
function ConfirmPanel({ kind, pod, busy, onConfirm, onCancel }) {
  const text = CONFIRM_TEXT[kind]
  const closeNote =
    kind === 'close' && pod.participantCount < pod.targetParticipantCount
      ? ` 아직 ${pod.participantCount}/${pod.targetParticipantCount}명이라 1인당 금액은 ${pod.participantCount}명 기준으로 계산돼요.`
      : ''
  return (
    <section className={`${styles.card} ${styles.confirmPanel}`} role="alertdialog" aria-labelledby="confirm-title">
      <h3 id="confirm-title" className={styles.cardTitle}>
        {text.title}
      </h3>
      <p className={styles.progressHint}>
        {text.body}
        {closeNote}
      </p>
      <div className={styles.hostActions}>
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={onCancel}>
          아니요
        </button>
        <button
          type="button"
          className={kind === 'close' ? styles.primaryButton : styles.dangerButton}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? '처리 중…' : text.yes}
        </button>
      </div>
    </section>
  )
}

/**
 * 하단 버튼은 상황에 따라 하나만 보여준다. 위에서부터 먼저 맞는 조건이 이긴다.
 *   취소됨 → 건물 홈으로
 *   마감됨 → (대표) 정산하러 가기 / (참여자) 진행 상황 보기
 *   대표 → 마감하기(2명 이상) / 이웃 모으는 중
 *   참여 가능 → 참여하기
 *   이미 참여 → 참여 취소
 *   다 참/마감 시간 지남 → 안내
 */
function DockAction({ pod, isHost, joined, isFull, canJoin, canLeave, canClose, seatsLeft, busy, onJoin, onAsk, onNavigate }) {
  if (pod.status === 'CANCELLED') {
    return (
      <button type="button" className={styles.dockButton} onClick={() => onNavigate('/home')}>
        <Icon name="home" size={20} />
        다른 공동구매 보러 가기
      </button>
    )
  }
  if (pod.closed) {
    return isHost ? (
      <button type="button" className={styles.dockButton} onClick={() => onNavigate(`/settlements/${pod.id}`)}>
        <Icon name="receipt_long" size={20} />
        영수증 올리고 정산하기
      </button>
    ) : (
      <button type="button" className={styles.dockButton} onClick={() => onNavigate(`/pods/${pod.id}/complete`)}>
        <Icon name="lock" size={20} />
        진행 상황 보기
      </button>
    )
  }
  if (isHost) {
    return canClose ? (
      <button type="button" className={`${styles.dockButton} ${styles.dockButtonHost}`} disabled={busy} onClick={() => onAsk('close')}>
        <Icon name="flag" size={20} />
        모집 마감하기
      </button>
    ) : (
      <button type="button" className={styles.dockButton} disabled>
        <Icon name="hourglass_top" size={20} />
        이웃 모으는 중
      </button>
    )
  }
  if (canJoin) {
    return (
      <button type="button" className={styles.dockButton} onClick={onJoin}>
        <Icon name="shopping_bag" size={20} />
        참여하기
        <span className={styles.dockSeats}>{seatsLeft}자리 남음</span>
      </button>
    )
  }
  if (canLeave) {
    return (
      <button type="button" className={`${styles.dockButton} ${styles.dockButtonGhost}`} disabled={busy} onClick={() => onAsk('leave')}>
        <Icon name="logout" size={20} />
        참여 취소
      </button>
    )
  }
  return (
    <button type="button" className={styles.dockButton} disabled>
      <Icon name={isFull ? 'celebration' : 'timer_off'} size={20} />
      {isFull ? '모집 인원이 다 찼어요' : '마감 시간이 지났어요'}
    </button>
  )
}

function Fallback({ message, onRetry }) {
  return (
    <div className={styles.page}>
      <PageHeader title="공동구매 상세" />
      <p className={styles.fallback}>
        {message}
        {onRetry && (
          <>
            <br />
            <button type="button" className={styles.secondaryButton} onClick={onRetry}>
              다시 시도
            </button>{' '}
            <Link to="/home">건물 홈으로</Link>
          </>
        )}
      </p>
    </div>
  )
}
