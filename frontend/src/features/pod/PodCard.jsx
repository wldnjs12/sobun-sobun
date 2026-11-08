import Icon from '../../components/Icon.jsx'
import { categoryIcon } from './podApi.js'
import usePodPhoto from './usePodPhoto.js'
import { calcDiscountRate, calcPerPersonPrice, useRemainingTime } from './podUtils.js'
import styles from './PodCard.module.css'

const STATUS_LABEL = { CLOSED: '모집 마감', CANCELLED: '모집 취소' }

// 내가 관계된 팟 표시: 'joined'(참여함)는 파란색, 'host'(내가 연 팟)는 노란색
const MY_ROLE = {
  joined: { label: '내가 참여한 팟', icon: 'check_circle', className: 'cardJoined' },
  host: { label: '내가 연 팟', icon: 'star', className: 'cardHost' },
}

/**
 * 건물 홈 목록의 팟 카드 1개.
 * 카드를 누르면 onJoin(pod)을 호출하고, 실제 참여는 팟 상세 화면에서 처리한다.
 * myRole이 있으면(참여함/내가 연 팟) 카드 테두리·바탕색과 맨 위 띠로 다른 팟과 구분한다.
 */
export default function PodCard({ pod, onJoin, myRole = null }) {
  const role = MY_ROLE[myRole]
  const remainingText = useRemainingTime(pod.deadline)
  const imageUrl = usePodPhoto(pod)

  // 목록에서는 "다 모이면 이 가격"을 보여주려고 목표 인원으로 나눈다
  const perPersonPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, pod.targetParticipantCount)
  const discountRate = calcDiscountRate(perPersonPrice, pod.originalPrice)

  const seatsLeft = Math.max(0, pod.targetParticipantCount - pod.participantCount)
  const progressPercent = Math.min(100, (pod.participantCount / pod.targetParticipantCount) * 100)
  const isOpen = pod.status === 'OPEN' && !pod.deadlinePassed
  const isLastSeat = isOpen && seatsLeft === 1
  // 목표 인원이 차도 대표가 마감하기 전까지는 목록에 남는다 (자동 마감 없음 정책)
  const isFull = seatsLeft <= 0
  const stateText = STATUS_LABEL[pod.status] ?? (pod.deadlinePassed ? '마감 시간 지남' : remainingText)

  return (
    <article className={`${styles.card} ${isOpen ? '' : styles.cardInactive} ${role ? styles[role.className] : ''}`}>
      {role && (
        <div className={styles.myRibbon}>
          <Icon name={role.icon} size={16} filled />
          {role.label}
        </div>
      )}
      <div className={styles.top}>
        <div className={styles.thumbnail}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={styles.thumbnailImage} loading="lazy" />
          ) : (
            <Icon name={categoryIcon(pod.category)} size={36} className={styles.thumbnailPlaceholder} />
          )}
          <span className={styles.unitBadge}>{pod.shareLabel}</span>
        </div>

        <div className={styles.info}>
          <div>
            <div className={styles.meta}>
              <span className={styles.categoryBadge}>{pod.categoryLabel ?? '기타'}</span>
              <span className={`${styles.metaItem} ${styles.timer}`}>
                <Icon name="timer" size={14} />
                {stateText}
              </span>
            </div>
            <h3 className={styles.title}>{pod.title}</h3>
            {pod.pickupNote && (
              <span className={styles.metaItem}>
                <Icon name="location_on" size={14} className={styles.pickupIcon} />
                {pod.pickupNote}
              </span>
            )}
          </div>

          <div className={styles.price}>
            {discountRate !== null && <span className={styles.discount}>{discountRate}%</span>}
            <span className={styles.perPerson}>1인 {perPersonPrice.toLocaleString()}원</span>
            {discountRate !== null && (
              <span className={styles.original}>{pod.originalPrice.toLocaleString()}원</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.progressLabels}>
          <span className={styles.joined}>
            {pod.participantCount}/{pod.targetParticipantCount}명 참여
          </span>
          <span className={styles.target}>
            {isOpen ? (isFull ? '인원 다 모임' : isLastSeat ? '마지막 1자리!' : `${seatsLeft}자리 남음`) : '참여 불가'}
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={styles.actions}>
          <span className={styles.shareText}>
            {pod.totalLabel ? `총 ${pod.totalLabel} → ${pod.shareLabel}씩` : pod.shareLabel}
          </span>

          <button
            type="button"
            className={`${styles.joinButton} ${isLastSeat && !role ? styles.joinButtonUrgent : ''}`}
            onClick={() => onJoin(pod)}
          >
            {role ? '내 팟 보기' : isOpen && !isFull ? '참여하기' : '보러가기'}
            {/* "마지막 1자리" 재촉 표시는 아직 참여 안 한 사람에게만 */}
            <Icon name={isLastSeat && !role ? 'local_fire_department' : 'arrow_forward'} size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
