import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import styles from './JoinConfirmSheet.module.css'

/**
 * 참여 확인 바텀시트 (디자인 핸드오프 S7 · Stitch 08번).
 * 팟 상세 화면 위에 겹쳐 뜨고, 실제 참여 API 호출은 부모(PodDetailPage)의 onConfirm이 한다.
 * 이 컴포넌트는 "보여주기 + 동의 받기"만 담당해서 역할을 나눴다.
 */
export default function JoinConfirmSheet({ pod, pricePerPerson, joining, error, onConfirm, onClose }) {
  const [agreed, setAgreed] = useState(false)

  // ESC 키로도 닫히게
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // 1인당 금액 = 상품 몫 + 수고비 몫. 상품 몫을 먼저 구하고 나머지를 수고비로 보여준다.
  const headCount = pod.participantCount + 1
  const productShare = Math.ceil(pod.totalAmount / headCount)
  const feeShare = pricePerPerson - productShare
  const seatsLeft = pod.targetParticipantCount - pod.participantCount

  return (
    <>
      {/* 뒤쪽 어두운 막. 누르면 닫힌다 */}
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="join-sheet-title">
        <div className={styles.handle} />

        <div className={styles.header}>
          <div>
            <div className={styles.headerBadges}>
              <span className={styles.waitBadge}>
                <Icon name="hourglass_top" size={13} filled />
                팟 참여 대기
              </span>
              <span className={styles.seatsText}>잔여 {seatsLeft}자리 남음</span>
            </div>
            <h2 id="join-sheet-title" className={styles.title}>
              이 팟에 참여할까요?
            </h2>
          </div>
          <button type="button" aria-label="닫기" className={styles.closeButton} onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.itemCard}>
            <div className={styles.itemThumb}>
              {pod.imageUrl ? (
                <img src={pod.imageUrl} alt="" />
              ) : (
                <Icon name="inventory_2" size={32} className={styles.itemPlaceholder} />
              )}
            </div>
            <div className={styles.itemInfo}>
              <span className={styles.itemLabel}>선택 소분 규격 · {pod.unitLabel}</span>
              <div className={styles.itemTitle}>{pod.title}</div>
              <div className={styles.itemDesc}>{headCount}명이 나눠서 1인분씩 받아요</div>
            </div>
          </div>

          <div className={styles.costBox}>
            <div className={styles.costTotalRow}>
              <span className={styles.costLabel}>1인 최종 예상 부담액</span>
              <span className={styles.costTotal}>
                {pricePerPerson.toLocaleString()}
                <small>원</small>
              </span>
            </div>
            <div className={styles.divider} />
            <div className={styles.costRow}>
              <span>상품 예상 금액 (1/{headCount} 분배)</span>
              <span className={styles.costValue}>{productShare.toLocaleString()}원</span>
            </div>
            <div className={styles.costRow}>
              <span>대표 수고비 ({Math.round(pod.commissionRate * 100)}%)</span>
              <span className={styles.costValue}>+{feeShare.toLocaleString()}원</span>
            </div>
            <div className={styles.costRow}>
              <span>배송비</span>
              <span className={styles.costFree}>0원 (직접 픽업)</span>
            </div>
          </div>

          <div className={styles.policy}>
            <span className={styles.policyIcon}>
              <Icon name="receipt_long" size={18} />
            </span>
            <div>
              <div className={styles.policyTitle}>투명한 영수증 실비 정산 원칙</div>
              <p className={styles.policyBody}>
                실제 금액은 구매 후 영수증 기준으로 다시 계산돼요. 할인이나 차액이 생기면 최종 정산에 그대로
                반영됩니다.
              </p>
            </div>
          </div>

          <div className={styles.pickup}>
            <span className={styles.pickupIcon}>
              <Icon name="pin_drop" size={20} />
            </span>
            <div>
              <div className={styles.pickupLabel}>픽업 거점 확인</div>
              <div className={styles.pickupSpot}>{pod.pickupSpot}</div>
              <div className={styles.pickupHint}>비대면 수령 (정산 후 안내)</div>
            </div>
          </div>

          {/* 팟 정책: 마감 전까지는 참여 취소 가능, 마감 후에는 불가 (docs/features/02-pod.md) */}
          <label className={styles.agree}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            팟이 마감된 뒤에는 참여를 취소할 수 없다는 점에 동의합니다.
          </label>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            disabled={!agreed || joining}
            onClick={onConfirm}
          >
            <Icon name={joining ? 'progress_activity' : 'check_circle'} size={18} className={joining ? styles.spin : ''} />
            {joining ? '참여 처리 중…' : '참여 확정하기'}
          </button>
        </div>
      </div>
    </>
  )
}
