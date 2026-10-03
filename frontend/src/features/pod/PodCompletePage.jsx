import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { connectPodSocket } from '../../api/socket.js'
import { isBuildingAccessDenied } from '../../api/client.js'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import { closePod, fetchPod } from './podApi.js'
import { getMyUserId } from '../../api/currentUser.js'
import { calcPerPersonPrice } from './podUtils.js'
import styles from './PodCompletePage.module.css'

const STEPS = [
  { icon: 'check', label: '모집완료' },
  { icon: 'shopping_bag', label: '구매진행' },
  { icon: 'receipt_long', label: '정산' },
  { icon: 'handshake', label: '픽업' },
]

/**
 * 팟 모집 완료 (Stitch 09번). 목표 인원이 다 모였을 때 보여준다.
 * 팟장은 여기서 ① 모집 마감 → ② 영수증 업로드(③ 정산, /settlements/:podId) 순서로 진행한다.
 * 참여자 화면은 팟장이 마감하면 실시간으로 바뀐다.
 */
export default function PodCompletePage() {
  const { podId } = useParams()
  const [pod, setPod] = useState(null)
  const [error, setError] = useState(null)
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(setError) // 에러 객체째 보관 → 403(다른 건물) 구분용
    // 팟장이 마감하면 서버가 closed=true 이벤트를 보내준다 → 다시 불러와서 화면 갱신
    const client = connectPodSocket(podId, () => fetchPod(podId).then(setPod), {
      onDenied: () => setError(Object.assign(new Error('다른 건물의 팟에는 접근할 수 없어요.'), { code: 'BUILDING_ACCESS_DENIED' })),
    })
    return () => client.deactivate()
  }, [podId])

  const handleClose = async () => {
    if (!window.confirm('모집을 마감할까요? 마감하면 더 이상 참여·취소를 할 수 없어요.')) return
    setClosing(true)
    try {
      setPod(await closePod(pod.id))
    } catch (e) {
      window.alert(e.message)
    } finally {
      setClosing(false)
    }
  }

  if (isBuildingAccessDenied(error)) return <AccessDeniedView pageTitle="팟 모집 완료" what="팟" />

  if (error || !pod) {
    return (
      <div className={styles.page}>
        <PageHeader title="팟 모집 완료" />
        <p className={styles.message}>{error?.message ?? '불러오는 중이에요…'}</p>
      </div>
    )
  }

  if (!pod.closed && pod.participantCount < pod.targetParticipantCount) {
    return (
      <div className={styles.page}>
        <PageHeader title="팟 모집 완료" />
        <p className={styles.message}>
          아직 모집 중인 팟이에요. <Link to={`/pods/${pod.id}`}>팟 상세로 돌아가기</Link>
        </p>
      </div>
    )
  }

  const isHost = pod.hostUserId === getMyUserId()
  const finalPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, pod.targetParticipantCount)
  const waitingNeighbors = pod.targetParticipantCount - 1

  return (
    <div className={styles.page}>
      <PageHeader title="팟 모집 완료" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={`${styles.glow} ${styles.glowCenter}`} />
          <div className={`${styles.glow} ${styles.glowRight}`} />

          <span className={styles.celebrateBadge}>
            <span className={styles.pingDot} />
            🎉 목표 인원 달성
          </span>
          <h2 className={styles.heroTitle}>{pod.targetParticipantCount}명이 모두 모였어요!</h2>
          <p className={styles.heroBody}>
            {pod.closed
              ? '팟장이 상품을 구매하고 영수증을 올리면 정산이 시작돼요.'
              : '팟장이 모집을 마감하면 구매가 시작돼요.'}
          </p>

          <div className={styles.avatars}>
            {Array.from({ length: pod.participantCount }, (_, i) => (
              <span key={i} className={styles.avatar}>
                <Icon name="person" size={20} filled />
                {i === 0 && <span className={styles.hostTag}>팟장</span>}
              </span>
            ))}
            <span className={`${styles.avatar} ${styles.avatarCount}`}>
              {pod.participantCount}/{pod.targetParticipantCount}
            </span>
          </div>
        </section>

        {/* ── 진행 단계 ── */}
        <section className={styles.card}>
          <ol className={styles.stepper}>
            {STEPS.map((step, i) => {
              // 모집완료는 항상 끝난 단계, 구매진행은 팟장이 마감한 뒤부터 진행 중
              const state = i === 0 ? 'done' : i === 1 && pod.closed ? 'current' : 'todo'
              return (
                <li key={step.label} className={`${styles.step} ${styles[state]}`}>
                  <span className={styles.stepCircle}>
                    <Icon name={step.icon} size={16} />
                  </span>
                  <span className={styles.stepLabel}>{step.label}</span>
                </li>
              )
            })}
          </ol>
        </section>

        {/* ── 정산 견적 ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <Icon name="groups" size={20} className={styles.primaryIcon} />
              예상 정산 견적
            </span>
            <span className={styles.confirmBadge}>{pod.targetParticipantCount}명 소분 확정</span>
          </div>

          <div className={styles.quote}>
            {pod.originalPrice && (
              <div className={styles.quoteRow}>
                <span>혼자 마트에서 살 때 (1인분)</span>
                <span className={styles.strike}>{pod.originalPrice.toLocaleString()}원</span>
              </div>
            )}
            <div className={styles.quoteRow}>
              <span>대표 수고비 ({Math.round(pod.commissionRate * 100)}%) 포함</span>
              <span />
            </div>
            <div className={styles.quoteTotal}>
              <span className={styles.quoteTotalLabel}>1인당 예상 금액</span>
              <span className={styles.quoteTotalPrice}>
                {finalPrice.toLocaleString()}
                <small>원</small>
              </span>
            </div>
          </div>

          <div className={styles.notice}>
            <Icon name="receipt_long" size={18} className={styles.primaryIcon} />
            <p>
              <strong>영수증 실비 정산</strong> · 실제 결제 금액이 다르면 영수증 기준으로 다시 계산돼요.
            </p>
          </div>
        </section>

        {/* ── 상품 요약 ── */}
        <section className={`${styles.card} ${styles.product}`}>
          <div className={styles.productThumb}>
            {pod.imageUrl ? (
              <img src={pod.imageUrl} alt="" />
            ) : (
              <Icon name="inventory_2" size={28} className={styles.productPlaceholder} />
            )}
          </div>
          <div className={styles.productInfo}>
            <span className={styles.productLabel}>{pod.unitLabel}</span>
            <h3 className={styles.productTitle}>{pod.title}</h3>
            <p className={styles.productDesc}>1/{pod.targetParticipantCount} 소분 배분</p>
          </div>
        </section>

        {/* ── 팟장 할 일 / 참여자 안내 ── */}
        {isHost && !pod.closed && (
          <section className={styles.hostCard}>
            <div className={styles.hostHeader}>
              <span className={styles.hostEmoji}>🏁</span>
              <div>
                <h4 className={styles.hostTitle}>모집을 마감해주세요</h4>
                <p className={styles.hostBody}>
                  인원이 다 모였어요. 마감해야 상품 구매와 <strong>정산</strong>을 시작할 수 있어요. 마감 후에는
                  참여·취소가 막혀요.
                </p>
              </div>
            </div>
            <button type="button" className={styles.hostButton} disabled={closing} onClick={handleClose}>
              <Icon name="flag" size={20} />
              {closing ? '마감하는 중…' : '모집 마감하기'}
            </button>
          </section>
        )}
        {isHost && pod.closed && (
          <section className={styles.hostCard}>
            <div className={styles.hostHeader}>
              <span className={styles.hostEmoji}>🛍️</span>
              <div>
                <h4 className={styles.hostTitle}>팟장 확인 필요</h4>
                <p className={styles.hostBody}>
                  상품을 구매하셨나요? 실제 <strong>영수증</strong>을 올려주시면 기다리는 이웃 {waitingNeighbors}명에게
                  정산 금액이 안내돼요.
                </p>
              </div>
            </div>
            <button type="button" className={styles.hostButton} onClick={() => navigate(`/settlements/${pod.id}`)}>
              <Icon name="receipt" size={20} />
              영수증 올리고 정산 요청하기
            </button>
          </section>
        )}
        {!isHost && (
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <Icon name="hourglass_top" size={20} className={styles.primaryIcon} />
              {pod.closed ? '팟장이 구매 중이에요' : '팟장의 마감을 기다리는 중'}
            </div>
            <p className={styles.bodyText}>
              {pod.closed
                ? '팟장이 영수증을 올리면 최종 정산 금액을 알려드릴게요. 따로 하실 일은 없어요.'
                : '팟장이 모집을 마감하면 이 화면이 자동으로 바뀌어요.'}
            </p>
          </section>
        )}

        {/* ── 비대면 픽업 ── */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>
            <Icon name="lock_open" size={20} className={styles.primaryIcon} />
            비대면 픽업 안내
          </div>
          <p className={styles.bodyText}>
            정산이 끝나면 <strong>{pod.pickupSpot}</strong> 보관함 번호와 비밀번호를 픽업 화면에서 알려드려요.
          </p>
        </section>

        <Link to="/home" className={styles.homeLink}>
          건물 홈으로
        </Link>
      </main>
    </div>
  )
}
