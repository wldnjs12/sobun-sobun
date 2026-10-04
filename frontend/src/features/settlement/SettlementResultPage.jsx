import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId } from '../../api/currentUser.js'
import { fetchMyParticipation, fetchPod, markPaid } from '../pod/podApi.js'
import { calcDiscountRate } from '../pod/podUtils.js'
import { fetchSettlement, getSavedSettlement } from './settlementApi.js'
import { copyText, describePaymentLink } from './paymentLink.js'
import styles from './Settlement.module.css'

/**
 * 정산 결과 (S11 · Stitch 12번 + 송금 화면 _1·_2·_5).
 * 확정 직후엔 넘겨받은 값(state)을 바로 쓰고, 그 외(참여자, 새로고침, 다른 기기)엔
 * 서버에서 다시 받아온다(GET /settlements/{podId}). 서버 요청이 실패할 때만 이 브라우저에 저장된 값을 쓴다.
 *
 * 보는 사람에 따라 아래가 달라진다:
 *   팟장   → 송금 받을 곳 확인 + [송금 현황 보기]
 *   참여자 → 송금 카드(토스·카카오페이 링크 또는 계좌 복사) + [보냈어요]   (_1)
 *            팟장이 송금 정보를 안 남겼으면 "아직 등록 전" 안내                (_5)
 *            [보냈어요]를 눌렀으면 "송금 확인을 요청했어요"                    (_2)
 * 앱은 실제 입금을 확인하지 않는다 — [보냈어요]는 참여자의 자가 신고이고, 팟장이 계좌에서 직접 확인한다.
 */
export default function SettlementResultPage() {
  const { podId } = useParams()
  const navigate = useNavigate()
  const stateSettlement = useLocation().state?.settlement
  const [settlement, setSettlement] = useState(stateSettlement ?? null)
  const [loaded, setLoaded] = useState(Boolean(stateSettlement))
  const [pod, setPod] = useState(null)
  const [me, setMe] = useState(null) // { joined, paid, pickedUp }
  const [sending, setSending] = useState(false)
  const [payError, setPayError] = useState(null)

  const reload = () => {
    fetchSettlement(podId).then((fetched) => {
      setSettlement(fetched ?? getSavedSettlement(podId))
      setLoaded(true)
    })
  }

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(() => {})
    fetchMyParticipation(podId).then(setMe).catch(() => {})
  }, [podId])

  useEffect(() => {
    if (stateSettlement) return
    reload()
    // reload는 podId만 쓰므로, podId가 바뀔 때만 다시 부르면 된다 (그래서 reload는 의존성 배열에 안 넣음)
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

  const { recognizedCost, commissionRate, finalAmount, participantCount, perPersonAmount, hostPaymentLink } = settlement
  const baseShare = Math.ceil(recognizedCost / participantCount)
  const feeShare = perPersonAmount - baseShare
  const isHost = pod?.hostUserId === getMyUserId()
  const paid = Boolean(me?.paid)
  const payment = describePaymentLink(hostPaymentLink)

  const handlePaid = async () => {
    setSending(true)
    setPayError(null)
    try {
      setMe(await markPaid(podId))
    } catch (err) {
      setPayError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="정산 결과" />

      <main className={styles.mainWithCta}>
        <section className={styles.resultHero}>
          <span className={`${styles.resultCheck} ${paid && !isHost ? styles.resultCheckPaid : ''}`}>
            <Icon name={paid && !isHost ? 'send_money' : 'task_alt'} size={32} />
          </span>
          {paid && !isHost ? (
            <>
              <h2 className={styles.title}>송금 확인을 요청했어요 ✨</h2>
              <p className={styles.body}>팟장이 입금을 확인하는 동안 픽업 장소를 미리 확인해 보세요.</p>
            </>
          ) : (
            <>
              <h2 className={styles.title}>정산이 확정됐어요 🎉</h2>
              <p className={styles.body}>
                {isHost ? '이웃들에게 1인 금액과 송금 정보가 보여요.' : '팟장이 영수증 확인을 마쳤어요. 내 몫을 확인하고 송금해 주세요.'}
              </p>
            </>
          )}
        </section>

        <section className={styles.resultCard}>
          <span className={styles.resultLabel}>{isHost ? '이웃 1인당 받을 금액' : paid ? '송금한 금액' : '내가 보낼 금액'}</span>
          <strong className={styles.resultAmount}>
            {perPersonAmount.toLocaleString()}
            <small>원</small>
          </strong>
          <span className={styles.resultFormula}>
            원가 {baseShare.toLocaleString()}원 + 수고비 {Math.round(commissionRate * 100)}% ({feeShare.toLocaleString()}원) · 1/
            {participantCount}
          </span>
          {pod && <p className={styles.resultItem}>소분 품목 · {pod.title}</p>}
        </section>

        {pod?.originalPrice && (
          <section className={styles.savingCard}>
            <Icon name="savings" size={22} />
            <div>
              <span>혼자 마트에서 샀다면 {pod.originalPrice.toLocaleString()}원</span>
              <strong>
                {(pod.originalPrice - perPersonAmount).toLocaleString()}원 절약! ({calcDiscountRate(perPersonAmount, pod.originalPrice)}%)
              </strong>
            </div>
          </section>
        )}

        {isHost ? (
          <HostPaymentInfo payment={payment} />
        ) : paid ? (
          <PaidProgress />
        ) : (
          <PaymentCard payment={payment} onRefresh={reload} />
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

        {payError && <p className={styles.error}>{payError}</p>}
      </main>

      <div className={styles.ctaDock}>
        {isHost ? (
          <button type="button" className={styles.primaryButton} onClick={() => navigate(`/settlements/${podId}/payments`)}>
            <Icon name="fact_check" size={20} />
            송금 현황 보기
          </button>
        ) : paid ? (
          <button type="button" className={styles.primaryButton} onClick={() => navigate(`/pods/${podId}/pickup`)}>
            <Icon name="meeting_room" size={20} />
            픽업 안내 보기
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!payment || sending || !me?.joined}
              onClick={handlePaid}
            >
              <Icon name={payment ? 'send_money' : 'lock'} size={20} />
              {sending ? '알리는 중…' : '보냈어요'}
            </button>
            <span className={styles.dockNote}>
              {payment
                ? '송금 여부는 자동으로 확인되지 않아요. 보낸 뒤 꼭 눌러주세요.'
                : '팟장이 송금 정보를 등록하면 보낼 수 있어요.'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/** 참여자용 송금 카드 (_1). 팟장이 송금 정보를 안 남겼으면 대기 안내 (_5) */
function PaymentCard({ payment, onRefresh }) {
  const [copied, setCopied] = useState(false)

  if (!payment) {
    return (
      <section className={styles.payCard}>
        <div className={styles.payHead}>
          <Icon name="account_balance_wallet" size={20} /> 팟장 송금 수단
          <span className={styles.payBadgeWait}>미등록</span>
        </div>
        <div className={styles.payEmpty}>
          <Icon name="hourglass_top" size={28} />
          <strong>팟장이 아직 송금 방법을 등록하지 않았어요</strong>
          <p>계좌번호나 간편송금 링크가 등록되면 여기에 보여요.</p>
          <button type="button" className={styles.secondaryButton} onClick={onRefresh}>
            <Icon name="refresh" size={18} /> 새로고침
          </button>
        </div>
      </section>
    )
  }

  const handleCopy = async () => {
    await copyText(payment.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className={styles.payCard}>
      <div className={styles.payHead}>
        <Icon name="account_balance_wallet" size={20} /> 팟장의 송금 계좌·링크
        <span className={styles.payBadge}>앱 수수료 없음</span>
      </div>
      {payment.type === 'link' ? (
        <a href={payment.url} target="_blank" rel="noopener noreferrer" className={styles.payLinkButton}>
          <Icon name={payment.icon} size={22} />
          {payment.label}
          <Icon name="open_in_new" size={18} />
        </a>
      ) : (
        <div className={styles.accountRow}>
          <div>
            <span className={styles.accountLabel}>직접 계좌 이체</span>
            <strong className={styles.accountText}>{payment.text}</strong>
          </div>
          <button type="button" className={styles.copyButton} onClick={handleCopy}>
            <Icon name={copied ? 'check' : 'content_copy'} size={16} />
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
      )}
    </section>
  )
}

/** [보냈어요]를 누른 뒤 진행 단계 (_2) */
function PaidProgress() {
  const steps = [
    { label: '소분 참여', state: 'done' },
    { label: '송금 완료', state: 'done' },
    { label: '수령 완료', state: 'todo' },
  ]
  return (
    <section className={styles.payCard}>
      <div className={styles.payHead}>
        <Icon name="check_circle" size={20} /> 송금 완료 체크됨
        <span className={styles.payBadge}>팟장 확인 대기</span>
      </div>
      <ol className={styles.payProgress}>
        {steps.map((step) => (
          <li key={step.label} className={step.state === 'done' ? styles.payStepDone : ''}>
            <span>{step.state === 'done' ? <Icon name="check" size={16} /> : <Icon name="inventory_2" size={16} />}</span>
            {step.label}
          </li>
        ))}
      </ol>
      <p className={styles.payNote}>
        <Icon name="info" size={16} /> 팟장이 계좌에서 입금을 확인하면 소분해서 픽업 장소에 둬요.
      </p>
    </section>
  )
}

/** 팟장용: 이웃에게 보이는 송금 정보 확인 */
function HostPaymentInfo({ payment }) {
  return (
    <section className={styles.payCard}>
      <div className={styles.payHead}>
        <Icon name="account_balance_wallet" size={20} /> 이웃에게 보이는 송금 정보
      </div>
      {payment ? (
        <p className={styles.hostPayText}>
          {payment.type === 'link' ? `[${payment.label}] 버튼` : payment.text}
        </p>
      ) : (
        <p className={styles.payNote}>
          <Icon name="warning" size={16} /> 송금 정보를 남기지 않아서 이웃들이 [보냈어요]를 누를 수 없어요. 송금 방법을
          따로 알려주세요.
        </p>
      )}
    </section>
  )
}
