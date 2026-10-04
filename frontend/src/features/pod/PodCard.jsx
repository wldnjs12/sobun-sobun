import Icon from '../../components/Icon.jsx'
import { calcDiscountRate, calcPerPersonPrice, useRemainingTime } from './podUtils.js'
import styles from './PodCard.module.css'

/**
 * 건물 홈 목록의 팟 카드 1개.
 * 참여하기를 누르면 onJoin(pod)을 호출하고, 실제 참여는 팟 상세 화면에서 처리한다.
 */
export default function PodCard({ pod, onJoin }) {
  const remainingText = useRemainingTime(pod.deadline)

  // 목록에서는 "다 모이면 이 가격"을 보여주려고 목표 인원으로 나눈다
  const perPersonPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, pod.targetParticipantCount)
  const discountRate = calcDiscountRate(perPersonPrice, pod.originalPrice)

  const seatsLeft = pod.targetParticipantCount - pod.participantCount
  const progressPercent = Math.min(100, (pod.participantCount / pod.targetParticipantCount) * 100)
  // 딱 1자리 남은 팟은 버튼을 주황색으로 바꿔 눈에 띄게 한다 (디자인 3번째 카드)
  const isLastSeat = seatsLeft === 1
  // 목표 인원이 차도 팟장이 마감하기 전까지는 목록에 남는다 (자동 마감 없음 정책)
  const isFull = seatsLeft <= 0

  // 서버가 참여자 목록은 안 주고 인원 수만 주므로, 인원 수만큼 동그라미를 그린다 (최대 3개 + 나머지는 +N)
  const visibleCount = Math.min(pod.participantCount, 3)
  const hiddenCount = pod.participantCount - visibleCount

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.thumbnail}>
          {pod.imageUrl ? (
            <img src={pod.imageUrl} alt={pod.title} className={styles.thumbnailImage} />
          ) : (
            <Icon name="inventory_2" size={36} className={styles.thumbnailPlaceholder} />
          )}
          <span className={styles.unitBadge}>{pod.unitLabel}</span>
        </div>

        <div className={styles.info}>
          <div>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <Icon name="meeting_room" size={14} className={styles.pickupIcon} />
                {pod.pickupSpot}
              </span>
              <span className={`${styles.metaItem} ${styles.timer}`}>
                <Icon name="timer" size={14} />
                {remainingText}
              </span>
            </div>
            <h3 className={styles.title}>{pod.title}</h3>
          </div>

          <div className={styles.price}>
            {discountRate !== null && <span className={styles.discount}>{discountRate}%</span>}
            <span className={styles.perPerson}>{perPersonPrice.toLocaleString()}원</span>
            {discountRate !== null && (
              <span className={styles.original}>{pod.originalPrice.toLocaleString()}원</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.progressLabels}>
          <span className={styles.joined}>{pod.participantCount}명 모임 완료</span>
          <span className={styles.target}>
            목표 {pod.targetParticipantCount}명 (
            {isFull ? '모집 완료' : isLastSeat ? '마지막 1명!' : `${seatsLeft}자리 남음`})
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={styles.actions}>
          <div className={styles.avatars}>
            {Array.from({ length: visibleCount }, (_, i) => (
              <span key={i} className={`${styles.avatar} ${styles[`avatarColor${i}`]}`}>
                <Icon name="person" size={16} filled />
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className={`${styles.avatar} ${styles.avatarMore}`}>+{hiddenCount}</span>
            )}
          </div>

          <button
            type="button"
            className={`${styles.joinButton} ${isLastSeat ? styles.joinButtonUrgent : ''}`}
            onClick={() => onJoin(pod)}
          >
            {isFull ? '보러가기' : '참여하기'}
            <Icon name={isLastSeat ? 'local_fire_department' : 'arrow_forward'} size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
