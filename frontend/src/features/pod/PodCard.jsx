import Icon from '../../components/Icon.jsx'
import { categoryIcon } from './podApi.js'
import usePodPhoto from './usePodPhoto.js'
import { calcDiscountRate, calcPerPersonPrice, useRemainingTime } from './podUtils.js'
import styles from './PodCard.module.css'

const STATUS_LABEL = { CLOSED: '모집 마감', CANCELLED: '모집 취소' }

// 내가 관계된 팟은 사진 위 배지 대신 파란 테두리와 [내 팟 보기] 버튼으로만 구분한다.
// (배지가 카드마다 붙으면 목록이 어수선해서, '내가 연 팟'·'참여한 팟'은 홈의 필터로 옮겼다)
const MY_ROLE = {
  joined: { className: 'cardJoined' },
  host: { className: 'cardHost' },
}

/**
 * 건물 홈 목록의 팟 카드 1개.
 * 카드를 누르면 onJoin(pod)을 호출하고, 실제 참여는 팟 상세 화면에서 처리한다.
 * myRole이 있으면(참여함/내가 연 팟) 카드 테두리와 버튼 문구로 다른 팟과 구분한다.
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
    <article
      className={`${styles.card} ${isOpen ? '' : styles.cardInactive} ${role ? styles[role.className] : ''}`}
      onClick={() => onJoin(pod)}
    >
      <div className={styles.media}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className={styles.mediaImage} loading="lazy" />
        ) : (
          <Icon name={categoryIcon(pod.category)} size={40} className={styles.mediaPlaceholder} />
        )}
        <span className={styles.unitBadge}>{pod.shareLabel}씩</span>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span>{pod.categoryLabel ?? '기타'}</span>
          <span className={styles.metaDot} />
          <span className={`${styles.timer} ${isLastSeat ? styles.timerHot : ''}`}>{stateText}</span>
        </div>
        <h3 className={styles.title}>{pod.title}</h3>
        {pod.pickupNote && (
          <span className={styles.pickup}>
            <Icon name="location_on" size={13} />
            {pod.pickupNote}
          </span>
        )}

        <div className={styles.price}>
          <span className={styles.perPersonLabel}>1인</span>
          <span className={`${styles.perPerson} num`}>{perPersonPrice.toLocaleString()}</span>
          <span className={styles.won}>원</span>
          {discountRate !== null && (
            <>
              <span className={`${styles.original} num`}>{pod.originalPrice.toLocaleString()}</span>
              <span className={styles.discount}>−{discountRate}%</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {/* 자리 수만큼 칸을 나눈 진행 막대: 채워진 칸 = 참여한 사람 */}
        <div
          className={styles.seats}
          role="img"
          aria-label={`${pod.targetParticipantCount}명 중 ${pod.participantCount}명 참여`}
        >
          {Array.from({ length: Math.min(pod.targetParticipantCount, 12) }, (_, i) => (
            <span key={i} className={`${styles.seat} ${i < pod.participantCount ? styles.seatFilled : ''}`} />
          ))}
        </div>
        <div className={styles.footerRow}>
          <span className={styles.joined}>
            <span className="num">
              {pod.participantCount}/{pod.targetParticipantCount}
            </span>
            명 ·{' '}
            {isOpen ? (isFull ? '인원 다 모임' : isLastSeat ? '마지막 1자리' : `${seatsLeft}자리 남음`) : '참여 불가'}
          </span>
          <span className={`${styles.cta} ${isLastSeat && !role ? styles.ctaHot : ''}`}>
            {role ? '내 팟 보기' : isOpen && !isFull ? '참여하기' : '보러가기'}
            <Icon name="arrow_forward" size={15} />
          </span>
        </div>
        <span className={styles.shareText}>
          {pod.totalLabel ? `총 ${pod.totalLabel} → ${pod.shareLabel}씩 미개봉 나눔` : `${pod.shareLabel}씩 미개봉 나눔`}
        </span>
      </div>
    </article>
  )
}
