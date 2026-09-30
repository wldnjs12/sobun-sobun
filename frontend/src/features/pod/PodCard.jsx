import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import styles from './PodCard.module.css'

/**
 * 건물 홈 목록의 팟 카드 1개.
 * 참여하기를 누르면 onJoin(pod)을 호출하고, 실제 참여는 팟 상세 화면에서 처리한다.
 */
export default function PodCard({ pod, onJoin }) {
  const remainingText = useRemainingTime(pod.deadline)

  const perPersonPrice = calcPerPersonPrice(pod)
  const discountRate = Math.round((1 - perPersonPrice / pod.originalPrice) * 100)

  const seatsLeft = pod.targetParticipantCount - pod.participantCount
  const progressPercent = Math.min(100, (pod.participantCount / pod.targetParticipantCount) * 100)
  // 딱 1자리 남은 팟은 버튼을 주황색으로 바꿔 눈에 띄게 한다 (디자인 3번째 카드)
  const isLastSeat = seatsLeft === 1

  const visibleUnits = pod.participantUnits.slice(0, 3)
  const hiddenCount = pod.participantUnits.length - visibleUnits.length

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.thumbnail}>
          <img src={pod.imageUrl} alt={pod.title} className={styles.thumbnailImage} />
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
            <span className={styles.discount}>{discountRate}%</span>
            <span className={styles.perPerson}>{perPersonPrice.toLocaleString()}원</span>
            <span className={styles.original}>{pod.originalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.progressLabels}>
          <span className={styles.joined}>{pod.participantCount}명 모임 완료</span>
          <span className={styles.target}>
            목표 {pod.targetParticipantCount}명 ({isLastSeat ? '마지막 1명!' : `${seatsLeft}자리 남음`})
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={styles.actions}>
          <div className={styles.avatars}>
            {visibleUnits.map((unit, i) => (
              <span key={unit} className={`${styles.avatar} ${styles[`avatarColor${i}`]}`}>
                {unit}
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
            참여하기
            <Icon name={isLastSeat ? 'local_fire_department' : 'arrow_forward'} size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}

/**
 * 목표 인원이 다 모였을 때의 1인당 금액.
 * 백엔드 PodService와 같은 식: 총액 × (1 + 수고비율) ÷ 인원, 원 단위 올림.
 * (백엔드는 "현재 참여 인원"으로 나누지만, 목록에서는 "다 모이면 이 가격"을 보여주려고 목표 인원으로 나눈다.)
 */
function calcPerPersonPrice(pod) {
  return Math.ceil((pod.totalAmount * (1 + pod.commissionRate)) / pod.targetParticipantCount)
}

/**
 * 마감 기한까지 남은 시간을 1초마다 다시 계산하는 훅.
 * 팟 정책상 deadline은 표시용일 뿐 자동 마감되지 않으므로(docs/features/02-pod.md),
 * 기한이 지나도 카드는 그대로 두고 문구만 바꾼다.
 */
function useRemainingTime(deadline) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), 1000)
    // 카드가 화면에서 사라질 때 타이머를 정리하지 않으면 계속 돌면서 메모리를 쓴다
    return () => clearInterval(timerId)
  }, [])

  const diff = new Date(deadline).getTime() - now
  if (diff <= 0) return '기한 지남'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  if (days >= 1) return `${days}일 남음`

  const pad = (n) => String(n).padStart(2, '0')
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} 남음`
}
