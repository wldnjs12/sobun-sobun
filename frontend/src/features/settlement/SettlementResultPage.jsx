import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { fetchPod } from '../pod/podApi.js'
import { calcDiscountRate } from '../pod/podUtils.js'
import { fetchSettlement, getSavedSettlement } from './settlementApi.js'
import styles from './Settlement.module.css'

/**
 * 정산 결과 (S11 · Stitch 12번).
 * 확정 직후엔 넘겨받은 값(state)을 바로 쓰고, 그 외(참여자, 새로고침, 다른 기기)엔
 * 서버에서 다시 받아온다(GET /settlements/{podId} — 백엔드에 새로 추가됨).
 * 서버 요청이 실패할 때만(오프라인 등) 이 브라우저에 저장된 값을 마지막으로 시도한다.
 */
export default function SettlementResultPage() {
  const { podId } = useParams()
  const navigate = useNavigate()
  const stateSettlement = useLocation().state?.settlement
  const [settlement, setSettlement] = useState(stateSettlement ?? null)
  const [loaded, setLoaded] = useState(Boolean(stateSettlement))
  const [pod, setPod] = useState(null)

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(() => {})
  }, [podId])

  useEffect(() => {
    if (stateSettlement) return
    fetchSettlement(podId).then((fetched) => {
      setSettlement(fetched ?? getSavedSettlement(podId))
      setLoaded(true)
    })
  }, [podId, stateSettlement])

  if (!loaded) {
    return (
      <div className={styles.page}>
        <PageHeader title="정산 결과" />
        <div className={styles.message}>
          <p>정산 결과를 불러오는 중이에요…</p>
        </div>
      </div>
    )
  }

  if (!settlement) {
    return (
      <div className={styles.page}>
        <PageHeader title="정산 결과" />
        <div className={styles.message}>
          <p>아직 정산 결과가 없어요. 팟장이 영수증을 올려 정산을 확정하면 여기서 볼 수 있어요.</p>
          <Link to={`/pods/${podId}`} className={styles.textLink}>
            팟 상세로 가기
          </Link>
        </div>
      </div>
    )
  }

  const { recognizedCost, commissionRate, finalAmount, participantCount, perPersonAmount } = settlement
  const baseShare = Math.ceil(recognizedCost / participantCount)
  const feeShare = perPersonAmount - baseShare

  return (
    <div className={styles.page}>
      <PageHeader title="정산 결과" />

      <main className={styles.mainWithCta}>
        <section className={styles.resultHero}>
          <span className={styles.resultCheck}>
            <Icon name="task_alt" size={32} />
          </span>
          <h2 className={styles.title}>정산이 완료됐어요</h2>
          <p className={styles.body}>영수증 금액 그대로, 투명하게 나눴어요.</p>
        </section>

        <section className={styles.resultCard}>
          <span className={styles.resultLabel}>1인당 낼 금액</span>
          <strong className={styles.resultAmount}>
            {perPersonAmount.toLocaleString()}
            <small>원</small>
          </strong>
          <div className={styles.resultChips}>
            <span>
              <Icon name="group" size={15} />
              {participantCount}인 팟 분할 완료
            </span>
            <span>
              <Icon name="lock_clock" size={15} />
              {pod?.pickupSpot ?? '1층 무인락커'} 수령
            </span>
          </div>
          {pod && <p className={styles.resultItem}>소분 품목 · {pod.title}</p>}
        </section>

        {pod?.originalPrice && (
          <section className={styles.breakdown}>
            <p className={styles.resultItem}>
              🎉 이번 팟에서 {(pod.originalPrice - perPersonAmount).toLocaleString()}원 아꼈어요! (혼자 샀을 때{' '}
              {pod.originalPrice.toLocaleString()}원 → {perPersonAmount.toLocaleString()}원, 약{' '}
              {calcDiscountRate(perPersonAmount, pod.originalPrice)}% 절약)
            </p>
          </section>
        )}

        <section className={styles.breakdown}>
          <div className={styles.breakdownHead}>
            <h3>세부 정산 내역</h3>
            <span className={styles.badge}>영수증 인증 ✓</span>
          </div>
          <div className={styles.breakdownRow}>
            <span>
              영수증 금액 ({recognizedCost.toLocaleString()}원 ÷ {participantCount}명)
            </span>
            <span>{baseShare.toLocaleString()}원</span>
          </div>
          <div className={styles.breakdownRow}>
            <span>팟장 픽업·소분 수고비 ({Math.round(commissionRate * 100)}%)</span>
            <span>+{feeShare.toLocaleString()}원</span>
          </div>
          <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
            <span>1인 최종 금액</span>
            <span>{perPersonAmount.toLocaleString()}원</span>
          </div>
          <div className={styles.breakdownRow}>
            <span>팟 전체 정산 금액</span>
            <span>{finalAmount.toLocaleString()}원</span>
          </div>
        </section>

        <div className={styles.infoBox}>
          <Icon name="verified_user" size={20} className={styles.primaryIcon} />
          <p>
            수고비는 영수증 금액에 정해진 비율로만 붙어요. 영수증보다 많이 받는 일이 생기지 않게 시스템이 막아요.
          </p>
        </div>
      </main>

      <div className={styles.ctaDock}>
        <button type="button" className={styles.primaryButton} onClick={() => navigate(`/pods/${podId}/pickup`)}>
          <Icon name="lock_open" size={20} />
          비대면 픽업 안내 보기
        </button>
      </div>
    </div>
  )
}
