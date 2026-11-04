import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { connectPodSocket } from '../../api/socket.js'
import { isBuildingAccessDenied } from '../../api/client.js'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import { closePod, fetchPod } from './podApi.js'
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
 * 대표은 여기서 ① 모집 마감 → ② 영수증 업로드(③ 정산, /settlements/:podId) 순서로 진행한다.
 * 참여자 화면은 대표이 마감하면 실시간으로 바뀐다.
 */
export default function PodCompletePage() {
  const { podId } = useParams()
  const [pod, setPod] = useState(null)
  const [error, setError] = useState(null)
  const [closing, setClosing] = useState(false)
  const [askClose, setAskClose] = useState(false)
  const [closeError, setCloseError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(setError) // 에러 객체째 보관 → 403(다른 건물) 구분용
    // 대표이 마감하면 서버가 closed=true 이벤트를 보내준다 → 다시 불러와서 화면 갱신
    const client = connectPodSocket(podId, () => fetchPod(podId).then(setPod), {
      onDenied: () => setError(Object.assign(new Error('다른 건물의 팟에는 접근할 수 없어요.'), { code: 'BUILDING_ACCESS_DENIED' })),
    })
    return () => client.deactivate()
  }, [podId])

  const handleClose = async () => {
    // window.confirm/alert 대신 화면 안 확인 버튼(askClose)과 에러 문구(closeError)로 처리한다
    setClosing(true)
    setCloseError(null)
    try {
      setPod(await closePod(pod.id))
      setAskClose(false)
    } catch (e) {
      setCloseError(e.message)
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

  if (pod.status === 'CANCELLED') {
    return (
      <div className={styles.page}>
        <PageHeader title="팟 모집 완료" />
        <p className={styles.message}>
          대표가 모집을 취소한 공동구매예요. <Link to="/home">건물 홈으로</Link>
        </p>
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

  const isHost = pod.isHost
  // 마감은 목표 인원이 다 안 차도 할 수 있어서, 마감 후엔 실제 참여 인원 기준으로 보여준다
  const headCount = pod.closed ? pod.participantCount : pod.targetParticipantCount
  const finalPrice = calcPerPersonPrice(pod.totalAmount, pod.commissionRate, headCount)
  const waitingNeighbors = pod.participantCount - 1

  return (
    <div className={styles.page}>
      <PageHeader title="팟 모집 완료" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={`${styles.glow} ${styles.glowCenter}`} />
          <div className={`${styles.glow} ${styles.glowRight}`} />

          <span className={styles.celebrateBadge}>
            <span className={styles.pingDot} />
            {pod.closed ? '모집 마감' : '목표 인원 달성'}
          </span>
          <h2 className={styles.heroTitle}>{headCount}명이 함께 나눠요!</h2>
          <p className={styles.heroBody}>
            {pod.closed
              ? '대표이 상품을 구매하고 영수증을 올리면 정산이 시작돼요.'
              : '대표이 모집을 마감하면 구매가 시작돼요.'}
          </p>

          <div className={styles.avatars}>
            {Array.from({ length: pod.participantCount }, (_, i) => (
              <span key={i} className={styles.avatar}>
                <Icon name="person" size={20} filled />
                {i === 0 && <span className={styles.hostTag}>대표</span>}
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
              // 모집완료는 항상 끝난 단계, 구매진행은 대표이 마감한 뒤부터 진행 중
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
            <span className={styles.confirmBadge}>{headCount}명 나눔</span>
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
            <span className={styles.productLabel}>{pod.categoryLabel ?? '기타'}</span>
            <h3 className={styles.productTitle}>{pod.title}</h3>
            <p className={styles.productDesc}>미개봉 {pod.shareLabel}씩</p>
          </div>
        </section>

        {/* ── 대표 할 일 / 참여자 안내 ── */}
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
            {closeError && <p className={styles.bodyText}>{closeError}</p>}
            {askClose ? (
              <>
                <p className={styles.bodyText}>정말 마감할까요? 마감하면 되돌릴 수 없어요.</p>
                <button type="button" className={styles.hostButton} disabled={closing} onClick={handleClose}>
                  <Icon name="flag" size={20} />
                  {closing ? '마감하는 중…' : '네, 마감할게요'}
                </button>
                <button type="button" className={styles.homeLink} disabled={closing} onClick={() => setAskClose(false)}>
                  아니요
                </button>
              </>
            ) : (
              <button type="button" className={styles.hostButton} onClick={() => setAskClose(true)}>
                <Icon name="flag" size={20} />
                모집 마감하기
              </button>
            )}
          </section>
        )}
        {isHost && pod.closed && (
          <section className={styles.hostCard}>
            <div className={styles.hostHeader}>
              <span className={styles.hostEmoji}>🛍️</span>
              <div>
                <h4 className={styles.hostTitle}>대표 확인 필요</h4>
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
              {pod.closed ? '대표이 구매 중이에요' : '대표의 마감을 기다리는 중'}
            </div>
            <p className={styles.bodyText}>
              {pod.closed
                ? '대표이 영수증을 올리면 최종 정산 금액을 알려드릴게요. 따로 하실 일은 없어요.'
                : '대표이 모집을 마감하면 이 화면이 자동으로 바뀌어요.'}
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
            픽업 장소: <strong>{pod.pickupSpot}</strong>. 정산이 끝나면 픽업 화면에서 수령 비밀번호를 알려드려요.
          </p>
        </section>

        <Link to="/home" className={styles.homeLink}>
          건물 홈으로
        </Link>
      </main>
    </div>
  )
}
